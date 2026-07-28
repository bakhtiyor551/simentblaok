import { Router } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { RoleCode } from '../lib/constants';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.use(authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.ACCOUNTANT, RoleCode.MANAGER));

function periodRange(period: string) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'day':
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      throw new AppError('period: day | week | month | year');
  }
  return { start, end };
}

async function buildReport(period: string) {
  const { start, end } = periodRange(period);

  const [productionAgg, productionRows, orders, stock] = await Promise.all([
    prisma.production.aggregate({
      where: { producedAt: { gte: start, lte: end } },
      _sum: { quantity: true },
      _count: true,
    }),
    prisma.production.findMany({
      where: { producedAt: { gte: start, lte: end } },
      include: { blockType: true },
      orderBy: { producedAt: 'desc' },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
      include: { items: { include: { blockType: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stock.findMany({
      include: { blockType: true },
      orderBy: { blockType: { name: 'asc' } },
    }),
  ]);

  const salesAmount = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const salesQty = orders.reduce(
    (s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0),
    0
  );

  const productionByTypeMap = new Map<string, { name: string; quantity: number; records: number }>();
  for (const row of productionRows) {
    const key = row.blockTypeId;
    const prev = productionByTypeMap.get(key) || {
      name: row.blockType.name,
      quantity: 0,
      records: 0,
    };
    prev.quantity += row.quantity;
    prev.records += 1;
    productionByTypeMap.set(key, prev);
  }

  const salesByTypeMap = new Map<
    string,
    { name: string; quantity: number; amount: number; orders: number }
  >();
  for (const order of orders) {
    const seen = new Set<string>();
    for (const item of order.items) {
      const key = item.blockTypeId;
      const prev = salesByTypeMap.get(key) || {
        name: item.blockType.name,
        quantity: 0,
        amount: 0,
        orders: 0,
      };
      prev.quantity += item.quantity;
      prev.amount += Number(item.totalPrice);
      if (!seen.has(key)) {
        prev.orders += 1;
        seen.add(key);
      }
      salesByTypeMap.set(key, prev);
    }
  }

  const stockItems = stock.map((s) => ({
    id: s.id,
    quantity: s.quantity,
    minStock: s.blockType.minStock,
    isLow: s.quantity < s.blockType.minStock,
    blockType: {
      id: s.blockType.id,
      name: s.blockType.name,
      code: s.blockType.code,
      unitPrice: Number(s.blockType.unitPrice),
    },
  }));

  const orderList = orders.slice(0, 30).map((o) => ({
    id: o.id,
    status: o.status,
    totalAmount: Number(o.totalAmount),
    createdAt: o.createdAt,
    items: o.items.map((i) => ({
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      blockType: { name: i.blockType.name },
    })),
  }));

  return {
    period,
    from: start,
    to: end,
    production: {
      records: productionAgg._count,
      quantity: productionAgg._sum.quantity || 0,
      byType: [...productionByTypeMap.values()].sort((a, b) => b.quantity - a.quantity),
    },
    sales: {
      orders: orders.length,
      quantity: salesQty,
      amount: salesAmount,
      averageCheck: orders.length ? salesAmount / orders.length : 0,
      byType: [...salesByTypeMap.values()].sort((a, b) => b.amount - a.amount),
    },
    stock: {
      totalBlocks: stockItems.reduce((s, i) => s + i.quantity, 0),
      lowCount: stockItems.filter((i) => i.isLow).length,
      items: stockItems,
    },
    recentOrders: orderList,
  };
}

reportsRouter.get(
  '/:period',
  asyncHandler(async (req, res) => {
    const report = await buildReport(req.params.period);
    res.json(report);
  })
);

reportsRouter.get(
  '/:period/pdf',
  asyncHandler(async (req, res) => {
    const report = await buildReport(req.params.period);
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="blockerp-report-${report.period}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(18).text('BlockERP — Отчет', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Период: ${report.period}`);
    doc.text(`С: ${report.from.toLocaleString('ru-RU')}`);
    doc.text(`По: ${report.to.toLocaleString('ru-RU')}`);
    doc.moveDown();
    doc.text(`Производство: ${report.production.quantity} блоков (${report.production.records} записей)`);
    for (const row of report.production.byType) {
      doc.text(`  - ${row.name}: ${row.quantity}`);
    }
    doc.moveDown();
    doc.text(
      `Продажи: ${report.sales.orders} заказов, ${report.sales.quantity} блоков, сумма ${report.sales.amount}`
    );
    doc.text(`Средний чек: ${Math.round(report.sales.averageCheck)}`);
    for (const row of report.sales.byType) {
      doc.text(`  - ${row.name}: ${row.quantity} шт · ${row.amount}`);
    }
    doc.moveDown();
    doc.text(`Склад: ${report.stock.totalBlocks} блоков (низкий остаток: ${report.stock.lowCount})`);
    for (const s of report.stock.items) {
      doc.text(`- ${s.blockType.name}: ${s.quantity}${s.isLow ? ' ⚠' : ''}`);
    }
    doc.end();
  })
);

reportsRouter.get(
  '/:period/excel',
  asyncHandler(async (req, res) => {
    const report = await buildReport(req.params.period);
    const wb = new ExcelJS.Workbook();

    const summary = wb.addWorksheet('Сводка');
    summary.addRow(['BlockERP Отчет', report.period]);
    summary.addRow(['С', report.from.toISOString()]);
    summary.addRow(['По', report.to.toISOString()]);
    summary.addRow([]);
    summary.addRow(['Показатель', 'Значение']);
    summary.addRow(['Производство (шт)', report.production.quantity]);
    summary.addRow(['Записей производства', report.production.records]);
    summary.addRow(['Заказов', report.sales.orders]);
    summary.addRow(['Продано блоков', report.sales.quantity]);
    summary.addRow(['Сумма продаж', report.sales.amount]);
    summary.addRow(['Средний чек', Math.round(report.sales.averageCheck)]);

    const prodSheet = wb.addWorksheet('Производство');
    prodSheet.addRow(['Тип блока', 'Количество', 'Записей']);
    for (const row of report.production.byType) {
      prodSheet.addRow([row.name, row.quantity, row.records]);
    }

    const salesSheet = wb.addWorksheet('Продажи');
    salesSheet.addRow(['Тип блока', 'Количество', 'Сумма', 'В заказах']);
    for (const row of report.sales.byType) {
      salesSheet.addRow([row.name, row.quantity, row.amount, row.orders]);
    }

    const stockSheet = wb.addWorksheet('Склад');
    stockSheet.addRow(['Тип блока', 'Остаток', 'Мин. остаток', 'Низкий']);
    for (const s of report.stock.items) {
      stockSheet.addRow([s.blockType.name, s.quantity, s.minStock, s.isLow ? 'да' : 'нет']);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="blockerp-report-${report.period}.xlsx"`
    );
    await wb.xlsx.write(res);
    res.end();
  })
);

import { Router } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { RoleCode } from '@prisma/client';
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

  const [production, orders, deliveries, stock] = await Promise.all([
    prisma.production.aggregate({
      where: { producedAt: { gte: start, lte: end } },
      _sum: { quantity: true },
      _count: true,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
      include: { items: true, customer: true },
    }),
    prisma.delivery.count({
      where: { deliveredAt: { gte: start, lte: end }, status: 'DELIVERED' },
    }),
    prisma.stock.findMany({ include: { blockType: true } }),
  ]);

  const salesAmount = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const salesQty = orders.reduce(
    (s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0),
    0
  );

  return {
    period,
    from: start,
    to: end,
    production: {
      records: production._count,
      quantity: production._sum.quantity || 0,
    },
    sales: {
      orders: orders.length,
      quantity: salesQty,
      amount: salesAmount,
    },
    deliveriesCompleted: deliveries,
    stock,
    orders,
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
    doc.text(`С: ${report.from.toISOString()}`);
    doc.text(`По: ${report.to.toISOString()}`);
    doc.moveDown();
    doc.text(`Производство: ${report.production.quantity} блоков (${report.production.records} записей)`);
    doc.text(`Продажи: ${report.sales.orders} заказов, ${report.sales.quantity} блоков, сумма ${report.sales.amount}`);
    doc.text(`Доставок выполнено: ${report.deliveriesCompleted}`);
    doc.moveDown();
    doc.text('Остатки на складе:');
    for (const s of report.stock) {
      doc.text(`- ${s.blockType.name}: ${s.quantity}`);
    }
    doc.end();
  })
);

reportsRouter.get(
  '/:period/excel',
  asyncHandler(async (req, res) => {
    const report = await buildReport(req.params.period);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Отчет');
    ws.addRow(['BlockERP Отчет', report.period]);
    ws.addRow(['С', report.from.toISOString()]);
    ws.addRow(['По', report.to.toISOString()]);
    ws.addRow([]);
    ws.addRow(['Показатель', 'Значение']);
    ws.addRow(['Производство (шт)', report.production.quantity]);
    ws.addRow(['Записей производства', report.production.records]);
    ws.addRow(['Заказов', report.sales.orders]);
    ws.addRow(['Продано блоков', report.sales.quantity]);
    ws.addRow(['Сумма продаж', report.sales.amount]);
    ws.addRow(['Доставок', report.deliveriesCompleted]);
    ws.addRow([]);
    ws.addRow(['Тип блока', 'Остаток', 'Мин. остаток']);
    for (const s of report.stock) {
      ws.addRow([s.blockType.name, s.quantity, s.blockType.minStock]);
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

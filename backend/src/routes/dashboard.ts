import { Router } from 'express';
import { RoleCode } from '../lib/constants';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  '/',
  authorize(
    RoleCode.ADMIN,
    RoleCode.DIRECTOR,
    RoleCode.MANAGER,
    RoleCode.WAREHOUSE,
    RoleCode.ACCOUNTANT,
    RoleCode.PRODUCTION,
    RoleCode.DRIVER
  ),
  asyncHandler(async (_req, res) => {
    // День по Таджикистану (UTC+5), чтобы «сегодня» совпадало с локальным временем
    const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
    const nowLocal = new Date(Date.now() + TZ_OFFSET_MS);
    const start = new Date(Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate(),
      0, 0, 0, 0
    ) - TZ_OFFSET_MS);
    const end = new Date(Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate(),
      23, 59, 59, 999
    ) - TZ_OFFSET_MS);

    const [stockRows, productionToday, salesToday, deliveriesCount, employeesCount] =
      await Promise.all([
        prisma.stock.findMany({
          where: { blockType: { isActive: true } },
          include: { blockType: true },
          orderBy: { quantity: 'desc' },
        }),
        prisma.production.aggregate({
          where: { producedAt: { gte: start, lte: end }, blockType: { isActive: true } },
          _sum: { quantity: true },
          _count: true,
        }),
        prisma.order.aggregate({
          where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.delivery.count({
          where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] } },
        }),
        prisma.employee.count({ where: { isActive: true } }),
      ]);

    const lowStock = stockRows.filter(
      (s) => s.blockType.isActive && s.quantity > 0 && s.quantity <= s.blockType.minStock
    );

    res.json({
      stock: {
        totalTypes: stockRows.length,
        totalBlocks: stockRows.reduce((acc, s) => acc + s.quantity, 0),
        items: stockRows,
        lowStock,
      },
      productionToday: {
        count: productionToday._count,
        quantity: productionToday._sum.quantity || 0,
      },
      salesToday: {
        count: salesToday._count,
        amount: salesToday._sum.totalAmount || 0,
      },
      deliveriesActive: deliveriesCount,
      employeesActive: employeesCount,
    });
  })
);

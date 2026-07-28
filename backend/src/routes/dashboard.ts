import { Router } from 'express';
import { RoleCode } from '@prisma/client';
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
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [stockRows, productionToday, salesToday, deliveriesCount, employeesCount] =
      await Promise.all([
        prisma.stock.findMany({ include: { blockType: true }, orderBy: { quantity: 'asc' } }),
        prisma.production.aggregate({
          where: { producedAt: { gte: start, lte: end } },
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

    const lowStock = stockRows.filter((s) => s.quantity <= s.blockType.minStock);

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

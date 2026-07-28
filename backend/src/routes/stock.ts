import { Router } from 'express';
import { RoleCode } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const stockRouter = Router();
stockRouter.use(authenticate);

stockRouter.get(
  '/',
  authorize(
    RoleCode.ADMIN,
    RoleCode.DIRECTOR,
    RoleCode.WAREHOUSE,
    RoleCode.MANAGER,
    RoleCode.PRODUCTION
  ),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const items = await prisma.stock.findMany({
      where: q
        ? {
            blockType: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
              ],
            },
          }
        : undefined,
      include: { blockType: true },
      orderBy: { quantity: 'asc' },
    });

    res.json(
      items.map((s) => ({
        ...s,
        isLow: s.quantity <= s.blockType.minStock,
      }))
    );
  })
);

stockRouter.get(
  '/movements',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.WAREHOUSE, RoleCode.MANAGER),
  asyncHandler(async (req, res) => {
    const blockTypeId = req.query.blockTypeId as string | undefined;
    const take = Math.min(Number(req.query.limit) || 100, 500);
    const movements = await prisma.stockMovement.findMany({
      where: blockTypeId ? { blockTypeId } : undefined,
      take,
      orderBy: { createdAt: 'desc' },
      include: { blockType: true },
    });
    res.json(movements);
  })
);

import { Router } from 'express';
import { RoleCode } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const blockTypesRouter = Router();
blockTypesRouter.use(authenticate);

blockTypesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.blockType.findMany({
      where: { isActive: true },
      include: { stock: true },
      orderBy: { name: 'asc' },
    });
    res.json(items);
  })
);

blockTypesRouter.post(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR),
  asyncHandler(async (req, res) => {
    const { name, code, description, unitPrice, minStock } = req.body as {
      name?: string;
      code?: string;
      description?: string;
      unitPrice?: number;
      minStock?: number;
    };
    if (!name || !code) throw new AppError('Укажите name и code');

    const blockType = await prisma.blockType.create({
      data: {
        name,
        code,
        description,
        unitPrice: unitPrice ?? 0,
        minStock: minStock ?? 100,
        stock: { create: { quantity: 0 } },
      },
      include: { stock: true },
    });
    res.status(201).json(blockType);
  })
);

blockTypesRouter.patch(
  '/:id',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR),
  asyncHandler(async (req, res) => {
    const blockType = await prisma.blockType.update({
      where: { id: req.params.id },
      data: req.body,
      include: { stock: true },
    });
    res.json(blockType);
  })
);

import { Router } from 'express';
import { RoleCode } from '../lib/constants';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const vehiclesRouter = Router();
vehiclesRouter.use(authenticate);

vehiclesRouter.get(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.MANAGER, RoleCode.DRIVER),
  asyncHandler(async (_req, res) => {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { plateNumber: 'asc' } });
    res.json(vehicles);
  })
);

vehiclesRouter.post(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.MANAGER),
  asyncHandler(async (req, res) => {
    const { plateNumber, model, capacity } = req.body as {
      plateNumber?: string;
      model?: string;
      capacity?: number;
    };
    if (!plateNumber) throw new AppError('Укажите госномер');
    const vehicle = await prisma.vehicle.create({
      data: { plateNumber, model, capacity },
    });
    res.status(201).json(vehicle);
  })
);

vehiclesRouter.patch(
  '/:id',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.MANAGER),
  asyncHandler(async (req, res) => {
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(vehicle);
  })
);

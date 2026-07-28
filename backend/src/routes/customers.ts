import { Router } from 'express';
import { RoleCode } from '../lib/constants';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const customersRouter = Router();
customersRouter.use(authenticate);

customersRouter.get(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.MANAGER),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [{ fullName: { contains: q } }, { phone: { contains: q } }],
          }
        : undefined,
      orderBy: { fullName: 'asc' },
    });
    res.json(customers);
  })
);

customersRouter.post(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.DIRECTOR),
  asyncHandler(async (req, res) => {
    const { fullName, phone, address, notes } = req.body as {
      fullName?: string;
      phone?: string;
      address?: string;
      notes?: string;
    };
    if (!fullName || !phone) throw new AppError('Укажите ФИО и телефон');
    const customer = await prisma.customer.create({
      data: { fullName, phone, address, notes },
    });
    res.status(201).json(customer);
  })
);

customersRouter.patch(
  '/:id',
  authorize(RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.DIRECTOR),
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(customer);
  })
);

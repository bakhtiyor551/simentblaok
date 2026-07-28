import { Router } from 'express';
import { RoleCode } from '../lib/constants';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const auditRouter = Router();
auditRouter.use(authenticate);
auditRouter.use(authorize(RoleCode.ADMIN, RoleCode.DIRECTOR));

auditRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const take = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await prisma.auditLog.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, login: true } } },
    });
    res.json(logs);
  })
);

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const items = await prisma.notification.findMany({
      where: {
        OR: [{ userId: req.user!.id }, { userId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(items);
  })
);

notificationsRouter.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const item = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json(item);
  })
);

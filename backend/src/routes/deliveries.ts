import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { RoleCode } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { sendTelegram } from '../services/telegram';
import { writeAudit, createNotification } from '../services/audit';
import { emitEvent } from '../services/realtime';

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `delivery-${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

export const deliveriesRouter = Router();
deliveriesRouter.use(authenticate);

deliveriesRouter.get(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.MANAGER, RoleCode.DRIVER),
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const mine = req.query.mine === 'true';
    const authReq = req as AuthRequest;

    const deliveries = await prisma.delivery.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(mine ? { driverId: authReq.user!.id } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: { include: { customer: true, items: { include: { blockType: true } } } },
        vehicle: true,
        driver: { select: { id: true, login: true, employee: true } },
      },
    });
    res.json(deliveries);
  })
);

deliveriesRouter.post(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.DIRECTOR),
  asyncHandler(async (req: AuthRequest, res) => {
    const { orderId, address, vehicleId, driverId, scheduledAt, notes } = req.body as {
      orderId?: string;
      address?: string;
      vehicleId?: string;
      driverId?: string;
      scheduledAt?: string;
      notes?: string;
    };
    if (!orderId || !address) throw new AppError('Укажите заказ и адрес');

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Заказ не найден');

    const existing = await prisma.delivery.findUnique({ where: { orderId } });
    if (existing) throw new AppError('Доставка для этого заказа уже существует');

    const delivery = await prisma.delivery.create({
      data: {
        orderId,
        address,
        vehicleId,
        driverId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        notes,
        status: vehicleId || driverId ? 'ASSIGNED' : 'PENDING',
      },
      include: {
        order: { include: { customer: true } },
        vehicle: true,
        driver: true,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { needsDelivery: true, status: 'IN_DELIVERY' },
    });

    await writeAudit({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'Delivery',
      entityId: delivery.id,
      details: delivery,
    });

    emitEvent('delivery:created', delivery);
    res.status(201).json(delivery);
  })
);

deliveriesRouter.patch(
  '/:id/assign',
  authorize(RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.DIRECTOR),
  asyncHandler(async (req: AuthRequest, res) => {
    const { vehicleId, driverId } = req.body as { vehicleId?: string; driverId?: string };
    const delivery = await prisma.delivery.update({
      where: { id: req.params.id },
      data: {
        vehicleId,
        driverId,
        status: 'ASSIGNED',
      },
      include: {
        order: { include: { customer: true } },
        vehicle: true,
        driver: true,
      },
    });
    emitEvent('delivery:updated', delivery);
    res.json(delivery);
  })
);

deliveriesRouter.post(
  '/:id/confirm',
  authorize(RoleCode.ADMIN, RoleCode.DRIVER, RoleCode.MANAGER, RoleCode.DIRECTOR),
  upload.single('photo'),
  asyncHandler(async (req: AuthRequest, res) => {
    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: { order: { include: { customer: true } }, vehicle: true },
    });
    if (!delivery) throw new AppError('Доставка не найдена', 404);

    const photoPath = req.file ? `/uploads/${req.file.filename}` : delivery.photoPath;

    const updated = await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        photoPath,
      },
      include: {
        order: { include: { customer: true } },
        vehicle: true,
        driver: true,
      },
    });

    await prisma.order.update({
      where: { id: delivery.orderId },
      data: { status: 'DELIVERED' },
    });

    const msg =
      `🚚 Доставка подтверждена\n` +
      `Клиент: ${updated.order.customer.fullName}\n` +
      `Адрес: ${updated.address}\n` +
      (updated.vehicle ? `Авто: ${updated.vehicle.plateNumber}\n` : '');

    await sendTelegram('DELIVERY', msg);
    await createNotification({
      title: 'Доставка выполнена',
      message: updated.order.customer.fullName,
      type: 'DELIVERY',
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'CONFIRM',
      entity: 'Delivery',
      entityId: updated.id,
      details: { photoPath },
    });

    emitEvent('delivery:confirmed', updated);
    res.json(updated);
  })
);

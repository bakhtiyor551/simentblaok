import { Router } from 'express';
import { RoleCode } from '../lib/constants';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { changeStock } from '../services/stock';
import { sendTelegram } from '../services/telegram';
import { writeAudit, createNotification } from '../services/audit';
import { emitEvent } from '../services/realtime';

export const ordersRouter = Router();
ordersRouter.use(authenticate);

ordersRouter.get(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.MANAGER, RoleCode.ACCOUNTANT, RoleCode.DRIVER),
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const orders = await prisma.order.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        customer: true,
        items: { include: { blockType: true } },
        delivery: true,
        createdBy: { select: { id: true, login: true } },
      },
    });
    res.json(orders);
  })
);

ordersRouter.get(
  '/:id',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.MANAGER, RoleCode.ACCOUNTANT, RoleCode.DRIVER),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: { include: { blockType: true } },
        delivery: { include: { vehicle: true, driver: true } },
      },
    });
    if (!order) throw new AppError('Заказ не найден', 404);
    res.json(order);
  })
);

ordersRouter.post(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.DIRECTOR),
  asyncHandler(async (req: AuthRequest, res) => {
    const {
      customerId,
      items,
      notes,
      needsDelivery,
      deliveryAddress,
    } = req.body as {
      customerId?: string;
      items?: Array<{ blockTypeId: string; quantity: number; unitPrice: number }>;
      notes?: string;
      needsDelivery?: boolean;
      deliveryAddress?: string;
    };

    if (!customerId || !items?.length) {
      throw new AppError('Укажите клиента и позиции заказа');
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError('Клиент не найден');

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) throw new AppError('Количество должно быть > 0');
      const stock = await prisma.stock.findUnique({
        where: { blockTypeId: item.blockTypeId },
        include: { blockType: true },
      });
      if (!stock || stock.quantity < item.quantity) {
        throw new AppError(
          `Недостаточно на складе: ${stock?.blockType.name || item.blockTypeId}`
        );
      }
    }

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          customerId,
          notes,
          needsDelivery: Boolean(needsDelivery),
          totalAmount,
          status: 'CONFIRMED',
          createdById: req.user!.id,
          items: {
            create: items.map((i) => ({
              blockTypeId: i.blockTypeId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.quantity * Number(i.unitPrice),
            })),
          },
        },
        include: { items: { include: { blockType: true } }, customer: true },
      });

      if (needsDelivery) {
        await tx.delivery.create({
          data: {
            orderId: created.id,
            address: deliveryAddress || customer.address || 'Адрес не указан',
            status: 'PENDING',
          },
        });
      }

      return created;
    });

    for (const item of items) {
      await changeStock({
        blockTypeId: item.blockTypeId,
        quantityDelta: -item.quantity,
        type: 'SALE',
        reference: order.id,
        comment: `Продажа заказ ${order.id}`,
        createdById: req.user!.id,
      });
    }

    const lines = order.items
      .map((i) => `• ${i.blockType.name}: ${i.quantity} × ${i.unitPrice}`)
      .join('\n');
    const msg =
      `💰 Продажа\n` +
      `Клиент: ${customer.fullName}\n` +
      `${lines}\n` +
      `Итого: ${totalAmount}`;

    await sendTelegram('SALE', msg);
    await createNotification({
      title: 'Новая продажа',
      message: `${customer.fullName}: ${totalAmount}`,
      type: 'SALE',
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'Order',
      entityId: order.id,
      details: order,
      ipAddress: req.ip,
    });

    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        customer: true,
        items: { include: { blockType: true } },
        delivery: true,
      },
    });

    emitEvent('order:created', full);
    res.status(201).json(full);
  })
);

ordersRouter.patch(
  '/:id/status',
  authorize(RoleCode.ADMIN, RoleCode.MANAGER, RoleCode.DIRECTOR),
  asyncHandler(async (req: AuthRequest, res) => {
    const { status } = req.body as { status?: string };
    if (!status) throw new AppError('Укажите статус');
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: status as never },
      include: { customer: true, items: true, delivery: true },
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'UPDATE_STATUS',
      entity: 'Order',
      entityId: order.id,
      details: { status },
    });
    emitEvent('order:updated', order);
    res.json(order);
  })
);

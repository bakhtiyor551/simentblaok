import { Router } from 'express';
import { RoleCode, ShiftType } from '../lib/constants';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { changeStock } from '../services/stock';
import { sendTelegram } from '../services/telegram';
import { writeAudit, createNotification } from '../services/audit';
import { emitEvent } from '../services/realtime';

export const productionRouter = Router();
productionRouter.use(authenticate);

productionRouter.get(
  '/',
  authorize(
    RoleCode.ADMIN,
    RoleCode.DIRECTOR,
    RoleCode.PRODUCTION,
    RoleCode.WAREHOUSE,
    RoleCode.MANAGER
  ),
  asyncHandler(async (req, res) => {
    const take = Math.min(Number(req.query.limit) || 50, 200);
    const items = await prisma.production.findMany({
      take,
      orderBy: { producedAt: 'desc' },
      include: {
        blockType: true,
        employee: true,
        createdBy: { select: { id: true, login: true } },
      },
    });
    res.json(items);
  })
);

productionRouter.post(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.PRODUCTION, RoleCode.DIRECTOR),
  asyncHandler(async (req: AuthRequest, res) => {
    const { blockTypeId, quantity, shift, comment, employeeId } = req.body as {
      blockTypeId?: string;
      quantity?: number;
      shift?: ShiftType;
      comment?: string;
      employeeId?: string;
    };

    if (!blockTypeId || !quantity || quantity <= 0) {
      throw new AppError('Укажите тип блока и количество > 0');
    }

    const blockType = await prisma.blockType.findUnique({ where: { id: blockTypeId } });
    if (!blockType || !blockType.isActive) throw new AppError('Тип блока не найден');

    const empId = employeeId || req.user!.employeeId || undefined;

    const production = await prisma.production.create({
      data: {
        blockTypeId,
        quantity,
        shift: shift || ShiftType.DAY,
        comment,
        employeeId: empId,
        createdById: req.user!.id,
      },
      include: { blockType: true, employee: true },
    });

    await changeStock({
      blockTypeId,
      quantityDelta: quantity,
      type: 'PRODUCTION',
      reference: production.id,
      comment: `Производство: ${blockType.name}`,
      createdById: req.user!.id,
    });

    const msg =
      `🏭 Производство\n` +
      `Блок: ${blockType.name}\n` +
      `Кол-во: ${quantity}\n` +
      `Смена: ${production.shift}\n` +
      (comment ? `Комментарий: ${comment}` : '');

    await sendTelegram('PRODUCTION', msg);
    await createNotification({
      title: 'Новое производство',
      message: `${blockType.name}: +${quantity}`,
      type: 'PRODUCTION',
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'Production',
      entityId: production.id,
      details: production,
      ipAddress: req.ip,
    });

    emitEvent('production:created', production);
    res.status(201).json(production);
  })
);

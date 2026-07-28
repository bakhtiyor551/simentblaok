import { prisma } from '../lib/prisma';
import { StockMovementType } from '../lib/constants';
import { AppError } from '../middleware/errorHandler';
import { sendTelegram } from './telegram';
import { emitEvent } from './realtime';

export async function changeStock(params: {
  blockTypeId: string;
  quantityDelta: number;
  type: StockMovementType;
  reference?: string;
  comment?: string;
  createdById?: string;
}) {
  const { blockTypeId, quantityDelta, type, reference, comment, createdById } = params;

  return prisma.$transaction(async (tx) => {
    let stock = await tx.stock.findUnique({ where: { blockTypeId }, include: { blockType: true } });
    if (!stock) {
      stock = await tx.stock.create({
        data: { blockTypeId, quantity: 0 },
        include: { blockType: true },
      });
    }

    const nextQty = stock.quantity + quantityDelta;
    if (nextQty < 0) {
      throw new AppError(`Недостаточно блоков на складе: ${stock.blockType.name}`);
    }

    const updated = await tx.stock.update({
      where: { blockTypeId },
      data: { quantity: nextQty },
      include: { blockType: true },
    });

    await tx.stockMovement.create({
      data: {
        blockTypeId,
        type,
        quantity: quantityDelta,
        balanceAfter: nextQty,
        reference,
        comment,
        createdById,
      },
    });

    if (updated.quantity <= updated.blockType.minStock) {
      const msg =
        `⚠️ Низкий остаток\n` +
        `Блок: ${updated.blockType.name}\n` +
        `Остаток: ${updated.quantity} (мин. ${updated.blockType.minStock})`;
      await sendTelegram('LOW_STOCK', msg);
      emitEvent('stock:low', updated);
    }

    emitEvent('stock:updated', updated);
    return updated;
  });
}

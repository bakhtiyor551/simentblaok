import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Keep only B150 as active "Блок", deactivate the rest
  const keep = await prisma.blockType.findUnique({ where: { code: 'B150' } });
  if (!keep) throw new Error('B150 not found');

  await prisma.blockType.update({
    where: { id: keep.id },
    data: { name: 'Блок', code: 'BLOCK', isActive: true, minStock: 100 },
  });

  await prisma.blockType.updateMany({
    where: { id: { not: keep.id } },
    data: { isActive: false },
  });

  // Remove stock rows for inactive types
  const inactive = await prisma.blockType.findMany({
    where: { isActive: false },
    select: { id: true },
  });
  const inactiveIds = inactive.map((b) => b.id);
  if (inactiveIds.length) {
    await prisma.stockMovement.deleteMany({ where: { blockTypeId: { in: inactiveIds } } });
    await prisma.stock.deleteMany({ where: { blockTypeId: { in: inactiveIds } } });
  }

  // Stock for active block = production sum - sold qty
  const prodSum = await prisma.production.aggregate({
    where: { blockTypeId: keep.id },
    _sum: { quantity: true },
  });
  const soldSum = await prisma.orderItem.aggregate({
    where: {
      blockTypeId: keep.id,
      order: { status: { not: 'CANCELLED' } },
    },
    _sum: { quantity: true },
  });
  const qty = Math.max(0, (prodSum._sum.quantity || 0) - (soldSum._sum.quantity || 0));

  await prisma.stock.upsert({
    where: { blockTypeId: keep.id },
    update: { quantity: qty },
    create: { blockTypeId: keep.id, quantity: qty },
  });

  // Clear SALE movements and rebuild PRODUCTION movements for clarity
  await prisma.stockMovement.deleteMany({ where: { blockTypeId: keep.id } });
  const productions = await prisma.production.findMany({
    where: { blockTypeId: keep.id },
    orderBy: { producedAt: 'asc' },
  });
  let balance = 0;
  for (const p of productions) {
    balance += p.quantity;
    await prisma.stockMovement.create({
      data: {
        blockTypeId: keep.id,
        type: 'PRODUCTION',
        quantity: p.quantity,
        balanceAfter: balance,
        reference: p.id,
        comment: 'Производство: Блок',
        createdById: p.createdById,
        createdAt: p.producedAt,
      },
    });
  }
  const sold = soldSum._sum.quantity || 0;
  if (sold > 0) {
    balance -= sold;
    await prisma.stockMovement.create({
      data: {
        blockTypeId: keep.id,
        type: 'SALE',
        quantity: -sold,
        balanceAfter: balance,
        comment: 'Продажи (сводка)',
      },
    });
  }

  const stock = await prisma.stock.findMany({ include: { blockType: true } });
  const types = await prisma.blockType.findMany({ select: { name: true, code: true, isActive: true } });
  console.log('types:', types);
  console.log('stock:', stock.map((s) => `${s.blockType.name}=${s.quantity}`));
  console.log('production total:', prodSum._sum.quantity || 0, 'sold:', sold, 'stock:', qty);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

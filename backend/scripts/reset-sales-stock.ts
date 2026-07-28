import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const before = {
    orders: await prisma.order.count(),
    deliveries: await prisma.delivery.count(),
    production: await prisma.production.findMany({
      include: { blockType: true },
      orderBy: { producedAt: 'desc' },
    }),
    stock: await prisma.stock.findMany({ include: { blockType: true } }),
  };

  console.log('Before:');
  console.log('  orders:', before.orders, 'deliveries:', before.deliveries);
  console.log(
    '  production:',
    before.production.map((p) => `${p.blockType.name}=${p.quantity}`).join(', ') || '(none)'
  );
  console.log(
    '  stock:',
    before.stock.map((s) => `${s.blockType.name}=${s.quantity}`).join(', ')
  );

  // 1) Clear sales
  await prisma.delivery.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockMovement.deleteMany({ where: { type: 'SALE' } });

  // 2) Stock = production totals per product (0 if no production)
  const prodSums = await prisma.production.groupBy({
    by: ['blockTypeId'],
    _sum: { quantity: true },
  });
  const qtyByBlock = new Map(prodSums.map((r) => [r.blockTypeId, r._sum.quantity || 0]));

  const stocks = await prisma.stock.findMany({ include: { blockType: true } });
  for (const s of stocks) {
    const qty = qtyByBlock.get(s.blockTypeId) ?? 0;
    await prisma.stock.update({
      where: { id: s.id },
      data: { quantity: qty },
    });
  }

  // Remove leftover non-production movements; keep IN from production if any
  await prisma.stockMovement.deleteMany({
    where: { type: { not: 'PRODUCTION' } },
  });

  const afterStock = await prisma.stock.findMany({
    include: { blockType: true },
    orderBy: { blockType: { name: 'asc' } },
  });

  console.log('After:');
  console.log('  orders:', await prisma.order.count());
  console.log(
    '  stock:',
    afterStock.map((s) => `${s.blockType.name}=${s.quantity}`).join(', ')
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

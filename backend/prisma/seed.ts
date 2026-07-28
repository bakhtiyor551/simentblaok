import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { RoleCode, SalaryCalcType } from '../src/lib/constants';

const prisma = new PrismaClient();

const roles: Array<{ code: RoleCode; name: string; description: string }> = [
  { code: RoleCode.ADMIN, name: 'Администратор', description: 'Полный доступ' },
  { code: RoleCode.DIRECTOR, name: 'Директор', description: 'Руководство и отчеты' },
  { code: RoleCode.MANAGER, name: 'Менеджер', description: 'Продажи и доставки' },
  { code: RoleCode.PRODUCTION, name: 'Производство', description: 'Учет производства' },
  { code: RoleCode.WAREHOUSE, name: 'Кладовщик', description: 'Складской учет' },
  { code: RoleCode.DRIVER, name: 'Водитель', description: 'Доставки' },
  { code: RoleCode.ACCOUNTANT, name: 'Бухгалтер', description: 'Зарплата и финансы' },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }

  const roleMap = Object.fromEntries(
    (await prisma.role.findMany()).map((r) => [r.code, r.id])
  ) as Record<RoleCode, string>;

  const passwordHash = await bcrypt.hash('admin123', 10);

  const users = [
    { login: 'admin', role: RoleCode.ADMIN, fullName: 'Админ Системы', position: 'Администратор' },
    { login: 'director', role: RoleCode.DIRECTOR, fullName: 'Иванов Иван Иванович', position: 'Директор' },
    { login: 'manager', role: RoleCode.MANAGER, fullName: 'Петрова Мария', position: 'Менеджер продаж' },
    { login: 'production', role: RoleCode.PRODUCTION, fullName: 'Сидоров Алексей', position: 'Рабочий производства' },
    { login: 'warehouse', role: RoleCode.WAREHOUSE, fullName: 'Кузнецов Олег', position: 'Кладовщик' },
    { login: 'driver', role: RoleCode.DRIVER, fullName: 'Алиев Рустам', position: 'Водитель' },
    { login: 'accountant', role: RoleCode.ACCOUNTANT, fullName: 'Смирнова Анна', position: 'Бухгалтер' },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { login: u.login },
      update: {},
      create: {
        login: u.login,
        passwordHash,
        roleId: roleMap[u.role],
      },
    });

    const existingEmp = await prisma.employee.findUnique({ where: { userId: user.id } });
    if (!existingEmp) {
      await prisma.employee.create({
        data: {
          userId: user.id,
          fullName: u.fullName,
          phone: '+998900000000',
          position: u.position,
          ratePerBlock: u.role === RoleCode.PRODUCTION ? 500 : 0,
          fixedSalary: u.role === RoleCode.PRODUCTION ? 0 : 3000000,
          calcType:
            u.role === RoleCode.PRODUCTION ? SalaryCalcType.PER_BLOCK : SalaryCalcType.FIXED,
        },
      });
    }
  }

  const blocks = [
    { name: 'Блок 200x200x400', code: 'B200', unitPrice: 4500, minStock: 200 },
    { name: 'Блок 150x200x400', code: 'B150', unitPrice: 3800, minStock: 150 },
    { name: 'Блок перегородочный', code: 'BPART', unitPrice: 2500, minStock: 100 },
    { name: 'Блок угловой', code: 'BCORN', unitPrice: 5200, minStock: 50 },
  ];

  for (const b of blocks) {
    const bt = await prisma.blockType.upsert({
      where: { code: b.code },
      update: { name: b.name, unitPrice: b.unitPrice, minStock: b.minStock },
      create: b,
    });
    await prisma.stock.upsert({
      where: { blockTypeId: bt.id },
      update: {},
      create: { blockTypeId: bt.id, quantity: 500 },
    });
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: { phone: '+998901112233' },
  });
  if (!existingCustomer) {
    await prisma.customer.create({
      data: {
        fullName: 'ООО СтройМаркет',
        phone: '+998901112233',
        address: 'г. Ташкент, ул. Навои 15',
      },
    });
  }

  await prisma.vehicle.upsert({
    where: { plateNumber: '01A123BC' },
    update: {},
    create: { plateNumber: '01A123BC', model: 'Isuzu NPR', capacity: 3000 },
  });

  console.log('Seed completed. Logins: admin/director/manager/production/warehouse/driver/accountant');
  console.log('Password for all: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

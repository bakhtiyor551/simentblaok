import { Router } from 'express';
import { RoleCode, SalaryCalcType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { sendTelegram } from '../services/telegram';
import { writeAudit, createNotification } from '../services/audit';
import { emitEvent } from '../services/realtime';

export const salaryRouter = Router();
salaryRouter.use(authenticate);

salaryRouter.get(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.ACCOUNTANT),
  asyncHandler(async (_req, res) => {
    const items = await prisma.salary.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        employee: true,
        payments: true,
        createdBy: { select: { id: true, login: true } },
      },
    });
    res.json(items);
  })
);

salaryRouter.post(
  '/accrue',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.ACCOUNTANT),
  asyncHandler(async (req: AuthRequest, res) => {
    const { employeeId, periodStart, periodEnd, comment } = req.body as {
      employeeId?: string;
      periodStart?: string;
      periodEnd?: string;
      comment?: string;
    };
    if (!employeeId || !periodStart || !periodEnd) {
      throw new AppError('Укажите сотрудника и период');
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new AppError('Сотрудник не найден');

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const productions = await prisma.production.aggregate({
      where: {
        employeeId,
        producedAt: { gte: start, lte: end },
      },
      _sum: { quantity: true },
    });
    const blocksCount = productions._sum.quantity || 0;

    let amount = 0;
    if (employee.calcType === SalaryCalcType.PER_BLOCK) {
      amount = blocksCount * Number(employee.ratePerBlock);
    } else {
      amount = Number(employee.fixedSalary);
    }

    const fines = await prisma.fine.aggregate({
      where: { employeeId, finedAt: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const finesAmount = Number(fines._sum.amount || 0);
    const netAmount = Math.max(0, amount - finesAmount);

    const salary = await prisma.salary.create({
      data: {
        employeeId,
        periodStart: start,
        periodEnd: end,
        blocksCount,
        amount,
        finesAmount,
        netAmount,
        comment,
        createdById: req.user!.id,
      },
      include: { employee: true },
    });

    await writeAudit({
      userId: req.user!.id,
      action: 'ACCRUE',
      entity: 'Salary',
      entityId: salary.id,
      details: salary,
    });
    emitEvent('salary:accrued', salary);
    res.status(201).json(salary);
  })
);

salaryRouter.post(
  '/:id/pay',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.ACCOUNTANT),
  asyncHandler(async (req: AuthRequest, res) => {
    const { amount, comment } = req.body as { amount?: number; comment?: string };
    const salary = await prisma.salary.findUnique({
      where: { id: req.params.id },
      include: { employee: true, payments: true },
    });
    if (!salary) throw new AppError('Начисление не найдено', 404);

    const paid = salary.payments.reduce((s, p) => s + Number(p.amount), 0);
    const remaining = Number(salary.netAmount) - paid;
    const payAmount = amount ?? remaining;
    if (payAmount <= 0) throw new AppError('Нечего выплачивать');
    if (payAmount > remaining) throw new AppError('Сумма больше остатка к выплате');

    const payment = await prisma.salaryPayment.create({
      data: {
        salaryId: salary.id,
        amount: payAmount,
        comment,
        createdById: req.user!.id,
      },
    });

    const msg =
      `💵 Выплата зарплаты\n` +
      `Сотрудник: ${salary.employee.fullName}\n` +
      `Сумма: ${payAmount}\n` +
      `Период: ${salary.periodStart.toISOString().slice(0, 10)} — ${salary.periodEnd
        .toISOString()
        .slice(0, 10)}`;

    await sendTelegram('SALARY_PAYMENT', msg);
    await createNotification({
      title: 'Выплата зарплаты',
      message: `${salary.employee.fullName}: ${payAmount}`,
      type: 'SALARY',
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'PAY',
      entity: 'SalaryPayment',
      entityId: payment.id,
      details: payment,
    });

    emitEvent('salary:paid', payment);
    res.status(201).json(payment);
  })
);

salaryRouter.get(
  '/payments',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.ACCOUNTANT),
  asyncHandler(async (_req, res) => {
    const payments = await prisma.salaryPayment.findMany({
      orderBy: { paidAt: 'desc' },
      include: {
        salary: { include: { employee: true } },
        createdBy: { select: { id: true, login: true } },
      },
    });
    res.json(payments);
  })
);

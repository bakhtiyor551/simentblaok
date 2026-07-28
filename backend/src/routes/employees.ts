import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { RoleCode, SalaryCalcType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { sendTelegram } from '../services/telegram';
import { writeAudit } from '../services/audit';
import { emitEvent } from '../services/realtime';

export const employeesRouter = Router();
employeesRouter.use(authenticate);

employeesRouter.get(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.ACCOUNTANT, RoleCode.MANAGER),
  asyncHandler(async (_req, res) => {
    const employees = await prisma.employee.findMany({
      orderBy: { fullName: 'asc' },
      include: { user: { include: { role: true } } },
    });
    res.json(employees);
  })
);

employeesRouter.post(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR),
  asyncHandler(async (req: AuthRequest, res) => {
    const {
      fullName,
      phone,
      position,
      ratePerBlock,
      fixedSalary,
      calcType,
      login,
      password,
      roleCode,
    } = req.body as {
      fullName?: string;
      phone?: string;
      position?: string;
      ratePerBlock?: number;
      fixedSalary?: number;
      calcType?: SalaryCalcType;
      login?: string;
      password?: string;
      roleCode?: RoleCode;
    };

    if (!fullName) throw new AppError('Укажите ФИО');

    let userId: string | undefined;
    if (login && password && roleCode) {
      const role = await prisma.role.findUnique({ where: { code: roleCode } });
      if (!role) throw new AppError('Роль не найдена');
      const exists = await prisma.user.findUnique({ where: { login } });
      if (exists) throw new AppError('Логин уже занят');
      const user = await prisma.user.create({
        data: {
          login,
          passwordHash: await bcrypt.hash(password, 10),
          roleId: role.id,
        },
      });
      userId = user.id;
    }

    const employee = await prisma.employee.create({
      data: {
        fullName,
        phone,
        position,
        ratePerBlock: ratePerBlock ?? 0,
        fixedSalary: fixedSalary ?? 0,
        calcType: calcType || SalaryCalcType.PER_BLOCK,
        userId,
      },
      include: { user: { include: { role: true } } },
    });

    await sendTelegram(
      'EMPLOYEE',
      `👤 Новый сотрудник\nФИО: ${fullName}\nДолжность: ${position || '—'}\nТел: ${phone || '—'}`
    );
    await writeAudit({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'Employee',
      entityId: employee.id,
      details: employee,
    });
    emitEvent('employee:created', employee);
    res.status(201).json(employee);
  })
);

employeesRouter.patch(
  '/:id',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR),
  asyncHandler(async (req: AuthRequest, res) => {
    const data = req.body;
    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: {
        fullName: data.fullName,
        phone: data.phone,
        position: data.position,
        ratePerBlock: data.ratePerBlock,
        fixedSalary: data.fixedSalary,
        calcType: data.calcType,
        isActive: data.isActive,
      },
      include: { user: { include: { role: true } } },
    });
    res.json(employee);
  })
);

employeesRouter.post(
  '/:id/fines',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.ACCOUNTANT),
  asyncHandler(async (req: AuthRequest, res) => {
    const { amount, reason } = req.body as { amount?: number; reason?: string };
    if (!amount || !reason) throw new AppError('Укажите сумму и причину штрафа');
    const fine = await prisma.fine.create({
      data: { employeeId: req.params.id, amount, reason },
    });
    await writeAudit({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'Fine',
      entityId: fine.id,
      details: fine,
    });
    res.status(201).json(fine);
  })
);

employeesRouter.get(
  '/:id/fines',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.ACCOUNTANT),
  asyncHandler(async (req, res) => {
    const fines = await prisma.fine.findMany({
      where: { employeeId: req.params.id },
      orderBy: { finedAt: 'desc' },
    });
    res.json(fines);
  })
);

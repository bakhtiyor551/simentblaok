import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { RoleCode } from '../lib/constants';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { writeAudit } from '../services/audit';

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get(
  '/roles',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR),
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    res.json(roles);
  })
);

usersRouter.get(
  '/drivers',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR, RoleCode.MANAGER),
  asyncHandler(async (_req, res) => {
    const drivers = await prisma.user.findMany({
      where: { isActive: true, role: { code: RoleCode.DRIVER } },
      include: { employee: true, role: true },
      orderBy: { login: 'asc' },
    });
    res.json(
      drivers.map((u) => ({
        id: u.id,
        login: u.login,
        employee: u.employee,
        role: u.role,
      }))
    );
  })
);

usersRouter.get(
  '/',
  authorize(RoleCode.ADMIN, RoleCode.DIRECTOR),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: { role: true, employee: true },
      orderBy: { login: 'asc' },
    });
    res.json(
      users.map((u) => ({
        id: u.id,
        login: u.login,
        role: u.role,
        employee: u.employee,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      }))
    );
  })
);

usersRouter.post(
  '/',
  authorize(RoleCode.ADMIN),
  asyncHandler(async (req: AuthRequest, res) => {
    const { login, password, roleCode } = req.body as {
      login?: string;
      password?: string;
      roleCode?: RoleCode;
    };
    if (!login || !password || !roleCode) throw new AppError('Укажите login, password, roleCode');

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new AppError('Роль не найдена');

    const user = await prisma.user.create({
      data: {
        login,
        passwordHash: await bcrypt.hash(password, 10),
        roleId: role.id,
      },
      include: { role: true },
    });

    await writeAudit({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
    });

    res.status(201).json({
      id: user.id,
      login: user.login,
      role: user.role,
      isActive: user.isActive,
    });
  })
);

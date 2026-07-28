import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { writeAudit } from '../services/audit';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { login, password } = req.body as { login?: string; password?: string };
    if (!login || !password) throw new AppError('Логин и пароль обязательны');

    const user = await prisma.user.findUnique({
      where: { login },
      include: { role: true, employee: true },
    });
    if (!user || !user.isActive) throw new AppError('Неверный логин или пароль', 401);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError('Неверный логин или пароль', 401);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAudit({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      token,
      user: {
        id: user.id,
        login: user.login,
        role: user.role.code,
        roleName: user.role.name,
        employee: user.employee
          ? { id: user.employee.id, fullName: user.employee.fullName }
          : null,
      },
    });
  })
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { role: true, employee: true },
    });
    if (!user) throw new AppError('Пользователь не найден', 404);
    res.json({
      id: user.id,
      login: user.login,
      role: user.role.code,
      roleName: user.role.name,
      employee: user.employee,
    });
  })
);

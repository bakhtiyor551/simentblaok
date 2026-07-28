import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RoleCode } from '../lib/constants';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  login: string;
  role: RoleCode;
  employeeId?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true, employee: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Пользователь не найден или неактивен' });
    }

    req.user = {
      id: user.id,
      login: user.login,
      role: user.role.code as RoleCode,
      employeeId: user.employee?.id ?? null,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

export function authorize(...roles: RoleCode[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

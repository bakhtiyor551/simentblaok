import { prisma } from '../lib/prisma';

export async function writeAudit(params: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  details?: unknown;
  ipAddress?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details !== undefined ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress,
    },
  });
}

export async function createNotification(params: {
  userId?: string;
  title: string;
  message: string;
  type: string;
}) {
  return prisma.notification.create({ data: params });
}

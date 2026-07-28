import { prisma } from '../lib/prisma';

export async function sendTelegram(eventType: string, message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    await prisma.telegramLog.create({
      data: {
        eventType,
        message,
        success: false,
        response: 'TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы',
      },
    });
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = (await res.json()) as { ok?: boolean };
    await prisma.telegramLog.create({
      data: {
        eventType,
        message,
        success: Boolean(data.ok),
        response: JSON.stringify(data),
      },
    });
    return { ok: Boolean(data.ok), data };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    await prisma.telegramLog.create({
      data: { eventType, message, success: false, response: errMsg },
    });
    return { ok: false, error: errMsg };
  }
}

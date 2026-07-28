# BlockERP

Система автоматизации завода цементных блоков.

## Состав

- `backend` — Node.js + Express + Prisma + SQLite + Socket.IO + Telegram
- `mobile` — мобильное приложение Ionic React + Capacitor (весь интерфейс)

Веб-админки нет — все модули в приложении.

## Требования

- Node.js 18+
- npm

## Установка

```bash
npm install
cd backend
npx prisma migrate dev --name init
npm run prisma:seed
```

## Запуск

```bash
# API — http://localhost:4000
npm run dev:backend

# Приложение — http://localhost:5173
npm run dev:mobile
```

Или из папок:

```bash
cd backend && npm run dev
cd mobile && npm run dev
```

## Модули в приложении

- Главная (dashboard)
- Производство
- Склад
- Продажи
- Доставки
- Клиенты
- Сотрудники
- Зарплата
- Автопарк
- Отчеты (PDF / Excel)
- Профиль

Меню слева (кнопка ☰). Пункты зависят от роли пользователя.

## Демо-аккаунты

Пароль: `admin123`

| Логин | Роль |
|-------|------|
| admin | Администратор |
| director | Директор |
| manager | Менеджер |
| production | Производство |
| warehouse | Кладовщик |
| driver | Водитель |
| accountant | Бухгалтер |

## Telegram

В `backend/.env`:

```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

# BlockERP

Система автоматизации завода по производству цементных блоков.

## Состав

- `backend` — Node.js + Express + Prisma + PostgreSQL + Socket.IO + Telegram
- `admin` — веб-админка Next.js + Tailwind
- `mobile` — мобильное приложение Ionic React + Capacitor

## Требования

- Node.js 18+
- PostgreSQL 14+ (локально установленный, **без Docker**)
- npm

## Настройка PostgreSQL

1. Создайте базу и пользователя:

```sql
CREATE USER blockerp WITH PASSWORD 'blockerp';
CREATE DATABASE blockerp OWNER blockerp;
```

2. Проверьте строку подключения в `backend/.env`:

```
DATABASE_URL="postgresql://blockerp:blockerp@localhost:5432/blockerp?schema=public"
```

## Установка

```bash
npm install
cd backend
npx prisma migrate dev --name init
npm run prisma:seed
```

Или из корня:

```bash
npm run setup
```

## Запуск

```bash
# API — http://localhost:4000
npm run dev:backend

# Админка — http://localhost:3000
npm run dev:admin

# Мобильное (браузер) — http://localhost:5173
npm run dev:mobile
```

## Демо-аккаунты

Пароль для всех: `admin123`

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

В `backend/.env` укажите:

```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Уведомления отправляются при: производстве, продаже, доставке, выплате зарплаты, низком остатке, добавлении сотрудника.

## Резервное копирование БД

Нужен установленный `pg_dump`:

```bash
cd backend
npm run backup
```

Файлы сохраняются в `backend/backups/`.

## Модули

- Авторизация JWT + роли
- Dashboard (остатки, производство, продажи, доставки, сотрудники)
- Производство → увеличение склада + Telegram
- Склад (остатки, история, поиск, мин. остаток)
- Продажи → уменьшение склада + доставка
- Доставки (назначение авто, подтверждение с фото)
- Сотрудники (ФИО, телефон)
- Зарплата (по блокам, начисления, выплаты, штрафы)
- Отчеты (день/неделя/месяц/год, PDF/Excel)
- Socket.IO realtime
- Audit logs

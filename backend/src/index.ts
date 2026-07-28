import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { productionRouter } from './routes/production';
import { stockRouter } from './routes/stock';
import { ordersRouter } from './routes/orders';
import { deliveriesRouter } from './routes/deliveries';
import { employeesRouter } from './routes/employees';
import { customersRouter } from './routes/customers';
import { vehiclesRouter } from './routes/vehicles';
import { salaryRouter } from './routes/salary';
import { reportsRouter } from './routes/reports';
import { blockTypesRouter } from './routes/blockTypes';
import { usersRouter } from './routes/users';
import { notificationsRouter } from './routes/notifications';
import { auditRouter } from './routes/audit';
import { errorHandler } from './middleware/errorHandler';
import { setSocketIO } from './services/realtime';

dotenv.config();

const app = express();
const server = http.createServer(app);
const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());

const io = new SocketServer(server, {
  cors: { origin: corsOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
});
setSocketIO(io);

io.on('connection', (socket) => {
  socket.on('join', (room: string) => socket.join(room));
});

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'BlockERP API', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/production', productionRouter);
app.use('/api/stock', stockRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/salary', salaryRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/block-types', blockTypesRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/audit', auditRouter);

app.use(errorHandler);

const PORT = Number(process.env.PORT || 4000);
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Порт ${PORT} уже занят. Backend, скорее всего, уже запущен.`);
    console.error(`Проверьте http://localhost:${PORT}/api/health`);
    console.error(`Или освободите порт: netstat -ano | findstr :${PORT}`);
    process.exit(1);
  }
  throw err;
});
server.listen(PORT, () => {
  console.log(`BlockERP API listening on http://localhost:${PORT}`);
});

export { app, server, io };

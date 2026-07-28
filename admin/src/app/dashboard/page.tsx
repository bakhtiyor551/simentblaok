'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AppShell } from '@/components/AppShell';
import { Card, PageHeader, Stat } from '@/components/ui';
import { api } from '@/lib/api';

type Dashboard = {
  stock: {
    totalTypes: number;
    totalBlocks: number;
    items: Array<{ quantity: number; blockType: { name: string; minStock: number } }>;
    lowStock: Array<{ quantity: number; blockType: { name: string; minStock: number } }>;
  };
  productionToday: { count: number; quantity: number };
  salesToday: { count: number; amount: number };
  deliveriesActive: number;
  employeesActive: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setData(await api<Dashboard>('/dashboard'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  useEffect(() => {
    load();
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000');
    const refresh = () => load();
    socket.on('stock:updated', refresh);
    socket.on('production:created', refresh);
    socket.on('order:created', refresh);
    socket.on('delivery:confirmed', refresh);
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <AppShell>
      <PageHeader title="Dashboard" subtitle="Сводка завода в реальном времени" />
      {error ? <div className="mb-4 text-red-700">{error}</div> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Остаток на складе" value={data.stock.totalBlocks} />
            <Stat label="Произведено сегодня" value={data.productionToday.quantity} />
            <Stat label="Продаж сегодня" value={data.salesToday.count} />
            <Stat label="Активных доставок" value={data.deliveriesActive} />
            <Stat label="Сотрудников" value={data.employeesActive} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-lg font-semibold">Остатки по типам</h2>
              <div className="space-y-2">
                {data.stock.items.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{s.blockType.name}</span>
                    <span
                      className={
                        s.quantity <= s.blockType.minStock ? 'font-semibold text-amber-700' : ''
                      }
                    >
                      {s.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="mb-3 text-lg font-semibold">Низкий остаток</h2>
              {data.stock.lowStock.length === 0 ? (
                <p className="text-sm text-brand-700/70">Все в норме</p>
              ) : (
                <div className="space-y-2">
                  {data.stock.lowStock.map((s, i) => (
                    <div key={i} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {s.blockType.name}: {s.quantity} (мин. {s.blockType.minStock})
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 text-sm text-brand-700/80">
                Сумма продаж сегодня: {Number(data.salesToday.amount).toLocaleString('ru-RU')}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <div>Загрузка...</div>
      )}
    </AppShell>
  );
}

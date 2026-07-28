'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card, Input, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

type StockItem = {
  id: string;
  quantity: number;
  isLow: boolean;
  blockType: { name: string; code: string; minStock: number };
};

type Movement = {
  id: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  createdAt: string;
  blockType: { name: string };
  comment?: string | null;
};

export default function StockPage() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState('');

  async function load(search = q) {
    const [stock, moves] = await Promise.all([
      api<StockItem[]>(`/stock?q=${encodeURIComponent(search)}`),
      api<Movement[]>('/stock/movements?limit=50'),
    ]);
    setItems(stock);
    setMovements(moves);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  return (
    <AppShell>
      <PageHeader title="Склад" subtitle="Остатки и история движения" />
      {error ? <div className="mb-4 text-red-700">{error}</div> : null}
      <div className="mb-4 max-w-md">
        <Input
          placeholder="Поиск по типу блока..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load();
          }}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Остатки</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                  item.isLow ? 'bg-amber-50 text-amber-900' : 'bg-sand-50'
                }`}
              >
                <div>
                  <div className="font-medium">{item.blockType.name}</div>
                  <div className="text-xs opacity-70">
                    {item.blockType.code} · мин. {item.blockType.minStock}
                  </div>
                </div>
                <div className="text-xl font-semibold">{item.quantity}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">История движения</h2>
          <div className="max-h-[520px] space-y-2 overflow-auto">
            {movements.map((m) => (
              <div key={m.id} className="rounded-xl border border-brand-100 px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{m.blockType.name}</span>
                  <span className={m.quantity >= 0 ? 'text-brand-700' : 'text-red-700'}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </span>
                </div>
                <div className="text-xs text-brand-700/70">
                  {m.type} · остаток {m.balanceAfter} ·{' '}
                  {new Date(m.createdAt).toLocaleString('ru-RU')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

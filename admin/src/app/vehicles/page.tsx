'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Input, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

type Vehicle = { id: string; plateNumber: string; model?: string | null; capacity?: number | null };

export default function VehiclesPage() {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [plateNumber, setPlateNumber] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState(3000);
  const [error, setError] = useState('');

  async function load() {
    setItems(await api<Vehicle[]>('/vehicles'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/vehicles', {
        method: 'POST',
        body: JSON.stringify({ plateNumber, model, capacity }),
      });
      setPlateNumber('');
      setModel('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  return (
    <AppShell>
      <PageHeader title="Автопарк" subtitle="Автомобили для доставки" />
      {error ? <div className="mb-4 text-red-700">{error}</div> : null}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="Госномер" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required />
            <Input placeholder="Модель" value={model} onChange={(e) => setModel(e.target.value)} />
            <Input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
            <Button type="submit" className="w-full">Добавить</Button>
          </form>
        </Card>
        <Card>
          <div className="space-y-2">
            {items.map((v) => (
              <div key={v.id} className="rounded-xl border border-brand-100 px-3 py-2 text-sm">
                <div className="font-medium">{v.plateNumber}</div>
                <div className="text-brand-700/70">{v.model || '—'} · вместимость {v.capacity || '—'}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

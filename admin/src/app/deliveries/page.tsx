'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, PageHeader, Select } from '@/components/ui';
import { api, getToken } from '@/lib/api';

type Vehicle = { id: string; plateNumber: string };
type UserDriver = { id: string; login: string; employee?: { fullName: string } | null };
type Delivery = {
  id: string;
  status: string;
  address: string;
  photoPath?: string | null;
  order: { customer: { fullName: string } };
  vehicle?: { plateNumber: string } | null;
  driver?: { login: string } | null;
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<UserDriver[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    const [d, v, driverUsers] = await Promise.all([
      api<Delivery[]>('/deliveries'),
      api<Vehicle[]>('/vehicles'),
      api<UserDriver[]>('/users/drivers').catch(() => [] as UserDriver[]),
    ]);
    setDeliveries(d);
    setVehicles(v);
    setDrivers(driverUsers);
    if (!selectedId && d[0]) setSelectedId(d[0].id);
    if (!vehicleId && v[0]) setVehicleId(v[0].id);
    if (!driverId && driverUsers[0]) setDriverId(driverUsers[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function assign(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await api(`/deliveries/${selectedId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ vehicleId, driverId }),
      });
      setOk('Автомобиль и водитель назначены');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      const form = new FormData();
      if (photo) form.append('photo', photo);
      const token = getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/deliveries/${selectedId}/confirm`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка подтверждения');
      }
      setOk('Доставка подтверждена');
      setPhoto(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  return (
    <AppShell>
      <PageHeader title="Доставки" subtitle="Назначение авто и подтверждение с фото" />
      {error ? <div className="mb-4 text-red-700">{error}</div> : null}
      {ok ? <div className="mb-4 text-brand-700">{ok}</div> : null}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card>
            <form onSubmit={assign} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">Доставка</label>
                <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {deliveries.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.order.customer.fullName} — {d.status}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Автомобиль</label>
                <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm">Водитель (user id)</label>
                <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.employee?.fullName || d.login}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Назначить
              </Button>
            </form>
          </Card>
          <Card>
            <form onSubmit={confirm} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">Фото подтверждения</label>
                <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
              </div>
              <Button type="submit" className="w-full">
                Подтвердить доставку
              </Button>
            </form>
          </Card>
        </div>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Список доставок</h2>
          <div className="space-y-3">
            {deliveries.map((d) => (
              <div key={d.id} className="rounded-xl border border-brand-100 p-3 text-sm">
                <div className="font-medium">{d.order.customer.fullName}</div>
                <div className="text-brand-700/80">{d.address}</div>
                <div className="mt-1 text-xs text-brand-700/70">
                  {d.status} · авто {d.vehicle?.plateNumber || '—'} · водитель {d.driver?.login || '—'}
                </div>
                {d.photoPath ? (
                  <a
                    className="mt-2 inline-block text-brand-700 underline"
                    href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace('/api', '')}${d.photoPath}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Фото
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

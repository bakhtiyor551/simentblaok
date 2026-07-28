'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Input, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';

type Customer = { id: string; fullName: string; phone: string; address?: string | null };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setItems(await api<Customer[]>('/customers'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/customers', {
        method: 'POST',
        body: JSON.stringify({ fullName, phone, address }),
      });
      setFullName('');
      setPhone('');
      setAddress('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  return (
    <AppShell>
      <PageHeader title="Клиенты" subtitle="ФИО и телефон" />
      {error ? <div className="mb-4 text-red-700">{error}</div> : null}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="ФИО" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <Input placeholder="Адрес" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Button type="submit" className="w-full">Добавить клиента</Button>
          </form>
        </Card>
        <Card>
          <div className="space-y-2">
            {items.map((c) => (
              <div key={c.id} className="rounded-xl border border-brand-100 px-3 py-2 text-sm">
                <div className="font-medium">{c.fullName}</div>
                <div className="text-brand-700/70">{c.phone} · {c.address || 'без адреса'}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

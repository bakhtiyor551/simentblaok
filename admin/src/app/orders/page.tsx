'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Input, PageHeader, Select } from '@/components/ui';
import { api } from '@/lib/api';

type Customer = { id: string; fullName: string; phone: string; address?: string };
type BlockType = { id: string; name: string; unitPrice: string | number };
type Order = {
  id: string;
  totalAmount: string | number;
  status: string;
  createdAt: string;
  customer: { fullName: string };
  items: Array<{ quantity: number; blockType: { name: string } }>;
};

export default function OrdersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [blockTypeId, setBlockTypeId] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [unitPrice, setUnitPrice] = useState(4500);
  const [needsDelivery, setNeedsDelivery] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    const [c, b, o] = await Promise.all([
      api<Customer[]>('/customers'),
      api<BlockType[]>('/block-types'),
      api<Order[]>('/orders'),
    ]);
    setCustomers(c);
    setBlocks(b);
    setOrders(o);
    if (!customerId && c[0]) {
      setCustomerId(c[0].id);
      setDeliveryAddress(c[0].address || '');
    }
    if (!blockTypeId && b[0]) {
      setBlockTypeId(b[0].id);
      setUnitPrice(Number(b[0].unitPrice));
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          needsDelivery,
          deliveryAddress,
          items: [{ blockTypeId, quantity: Number(quantity), unitPrice: Number(unitPrice) }],
        }),
      });
      setOk('Заказ создан, склад уменьшен');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  return (
    <AppShell>
      <PageHeader title="Продажи" subtitle="Создание заказов и оформление доставки" />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm">Клиент</label>
              <Select
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  const c = customers.find((x) => x.id === e.target.value);
                  if (c?.address) setDeliveryAddress(c.address);
                }}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Блок</label>
              <Select
                value={blockTypeId}
                onChange={(e) => {
                  setBlockTypeId(e.target.value);
                  const b = blocks.find((x) => x.id === e.target.value);
                  if (b) setUnitPrice(Number(b.unitPrice));
                }}
              >
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm">Количество</label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Цена</label>
                <Input
                  type="number"
                  min={0}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={needsDelivery}
                onChange={(e) => setNeedsDelivery(e.target.checked)}
              />
              Оформить доставку
            </label>
            {needsDelivery ? (
              <div>
                <label className="mb-1 block text-sm">Адрес доставки</label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
            ) : null}
            {error ? <div className="text-sm text-red-700">{error}</div> : null}
            {ok ? <div className="text-sm text-brand-700">{ok}</div> : null}
            <Button type="submit" className="w-full">
              Создать заказ
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">Заказы</h2>
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-xl border border-brand-100 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <div className="font-medium">{o.customer.fullName}</div>
                  <div>{Number(o.totalAmount).toLocaleString('ru-RU')}</div>
                </div>
                <div className="mt-1 text-brand-700/70">
                  {o.status} · {new Date(o.createdAt).toLocaleString('ru-RU')}
                </div>
                <div className="mt-1">
                  {o.items.map((i, idx) => (
                    <span key={idx} className="mr-2">
                      {i.blockType.name} × {i.quantity}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api';

type BlockType = { id: string; name: string };
type Production = {
  id: string;
  quantity: number;
  shift: string;
  comment?: string;
  producedAt: string;
  blockType: { name: string };
  employee?: { fullName: string } | null;
};

export default function ProductionPage() {
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [items, setItems] = useState<Production[]>([]);
  const [blockTypeId, setBlockTypeId] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [shift, setShift] = useState('DAY');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    const [b, p] = await Promise.all([
      api<BlockType[]>('/block-types'),
      api<Production[]>('/production'),
    ]);
    setBlocks(b);
    setItems(p);
    if (!blockTypeId && b[0]) setBlockTypeId(b[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await api('/production', {
        method: 'POST',
        body: JSON.stringify({ blockTypeId, quantity: Number(quantity), shift, comment }),
      });
      setOk('Производство сохранено, склад обновлен');
      setComment('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  return (
    <AppShell>
      <PageHeader title="Производство" subtitle="Учет произведенных блоков" />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm">Тип блока</label>
              <Select value={blockTypeId} onChange={(e) => setBlockTypeId(e.target.value)}>
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
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
              <label className="mb-1 block text-sm">Смена</label>
              <Select value={shift} onChange={(e) => setShift(e.target.value)}>
                <option value="DAY">Дневная</option>
                <option value="NIGHT">Ночная</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Комментарий</label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            </div>
            {error ? <div className="text-sm text-red-700">{error}</div> : null}
            {ok ? <div className="text-sm text-brand-700">{ok}</div> : null}
            <Button type="submit" className="w-full">
              Сохранить производство
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold">История</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-brand-700/70">
                  <th className="py-2">Дата</th>
                  <th>Блок</th>
                  <th>Кол-во</th>
                  <th>Смена</th>
                  <th>Сотрудник</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-brand-50">
                    <td className="py-2">{new Date(item.producedAt).toLocaleString('ru-RU')}</td>
                    <td>{item.blockType.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.shift === 'DAY' ? 'День' : 'Ночь'}</td>
                    <td>{item.employee?.fullName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

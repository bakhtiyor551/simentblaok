'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Input, PageHeader, Select } from '@/components/ui';
import { api } from '@/lib/api';

type Employee = {
  id: string;
  fullName: string;
  phone?: string | null;
  position?: string | null;
  ratePerBlock: string | number;
  calcType: string;
  isActive: boolean;
};

export default function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [ratePerBlock, setRatePerBlock] = useState(500);
  const [calcType, setCalcType] = useState('PER_BLOCK');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [roleCode, setRoleCode] = useState('PRODUCTION');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    setItems(await api<Employee[]>('/employees'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await api('/employees', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          phone,
          position,
          ratePerBlock,
          calcType,
          ...(login && password
            ? { login, password, roleCode }
            : {}),
        }),
      });
      setOk('Сотрудник добавлен');
      setFullName('');
      setPhone('');
      setPosition('');
      setLogin('');
      setPassword('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  return (
    <AppShell>
      <PageHeader title="Сотрудники" subtitle="ФИО, телефон и учет зарплаты" />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="ФИО" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input placeholder="Должность" value={position} onChange={(e) => setPosition(e.target.value)} />
            <Select value={calcType} onChange={(e) => setCalcType(e.target.value)}>
              <option value="PER_BLOCK">По количеству блоков</option>
              <option value="FIXED">Фиксированная</option>
            </Select>
            <Input
              type="number"
              placeholder="Ставка за блок"
              value={ratePerBlock}
              onChange={(e) => setRatePerBlock(Number(e.target.value))}
            />
            <Input placeholder="Логин (опционально)" value={login} onChange={(e) => setLogin(e.target.value)} />
            <Input
              type="password"
              placeholder="Пароль (опционально)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Select value={roleCode} onChange={(e) => setRoleCode(e.target.value)}>
              <option value="PRODUCTION">Производство</option>
              <option value="WAREHOUSE">Кладовщик</option>
              <option value="DRIVER">Водитель</option>
              <option value="MANAGER">Менеджер</option>
              <option value="ACCOUNTANT">Бухгалтер</option>
            </Select>
            {error ? <div className="text-sm text-red-700">{error}</div> : null}
            {ok ? <div className="text-sm text-brand-700">{ok}</div> : null}
            <Button type="submit" className="w-full">Добавить</Button>
          </form>
        </Card>
        <Card>
          <div className="space-y-2">
            {items.map((e) => (
              <div key={e.id} className="rounded-xl border border-brand-100 px-3 py-2 text-sm">
                <div className="font-medium">{e.fullName}</div>
                <div className="text-brand-700/70">
                  {e.position || '—'} · {e.phone || 'нет телефона'} · {e.calcType} · ставка{' '}
                  {Number(e.ratePerBlock)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

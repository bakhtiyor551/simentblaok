'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Input, PageHeader, Select } from '@/components/ui';
import { api } from '@/lib/api';

type Employee = { id: string; fullName: string };
type Salary = {
  id: string;
  amount: string | number;
  finesAmount: string | number;
  netAmount: string | number;
  blocksCount: number;
  periodStart: string;
  periodEnd: string;
  employee: { fullName: string };
  payments: Array<{ amount: string | number }>;
};

export default function SalaryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<Salary[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    const [emps, salaries] = await Promise.all([
      api<Employee[]>('/employees'),
      api<Salary[]>('/salary'),
    ]);
    setEmployees(emps);
    setItems(salaries);
    if (!employeeId && emps[0]) setEmployeeId(emps[0].id);
  }

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setPeriodStart(start.toISOString().slice(0, 10));
    setPeriodEnd(now.toISOString().slice(0, 10));
    load().catch((e) => setError(e.message));
  }, []);

  async function accrue(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await api('/salary/accrue', {
        method: 'POST',
        body: JSON.stringify({ employeeId, periodStart, periodEnd }),
      });
      setOk('Начисление создано');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  async function pay(id: string) {
    setError('');
    setOk('');
    try {
      await api(`/salary/${id}/pay`, { method: 'POST', body: JSON.stringify({}) });
      setOk('Выплата выполнена, уведомление в Telegram отправлено');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  return (
    <AppShell>
      <PageHeader title="Зарплата" subtitle="Начисления, выплаты и учет штрафов" />
      {error ? <div className="mb-4 text-red-700">{error}</div> : null}
      {ok ? <div className="mb-4 text-brand-700">{ok}</div> : null}
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <form onSubmit={accrue} className="space-y-3">
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </Select>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            <Button type="submit" className="w-full">Начислить</Button>
          </form>
        </Card>
        <Card>
          <div className="space-y-3">
            {items.map((s) => {
              const paid = s.payments.reduce((acc, p) => acc + Number(p.amount), 0);
              return (
                <div key={s.id} className="rounded-xl border border-brand-100 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{s.employee.fullName}</div>
                    <Button onClick={() => pay(s.id)} disabled={paid >= Number(s.netAmount)}>
                      Выплатить
                    </Button>
                  </div>
                  <div className="mt-1 text-brand-700/80">
                    Блоков: {s.blocksCount} · начислено {Number(s.amount).toLocaleString('ru-RU')} ·
                    штрафы {Number(s.finesAmount).toLocaleString('ru-RU')} · к выплате{' '}
                    {Number(s.netAmount).toLocaleString('ru-RU')} · выплачено {paid.toLocaleString('ru-RU')}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

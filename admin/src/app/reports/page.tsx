'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, PageHeader, Select } from '@/components/ui';
import { api, downloadFile } from '@/lib/api';

type Report = {
  period: string;
  production: { quantity: number; records: number };
  sales: { orders: number; quantity: number; amount: number };
  deliveriesCompleted: number;
};

export default function ReportsPage() {
  const [period, setPeriod] = useState('day');
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  async function load(p = period) {
    setReport(await api<Report>(`/reports/${p}`));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Отчеты"
        subtitle="День / неделя / месяц / год · экспорт PDF и Excel"
        actions={
          <div className="flex flex-wrap gap-2">
            <Select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                load(e.target.value).catch((err) => setError(err.message));
              }}
            >
              <option value="day">День</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
              <option value="year">Год</option>
            </Select>
            <Button
              variant="ghost"
              onClick={() => downloadFile(`/reports/${period}/pdf`, `report-${period}.pdf`)}
            >
              PDF
            </Button>
            <Button
              variant="ghost"
              onClick={() => downloadFile(`/reports/${period}/excel`, `report-${period}.xlsx`)}
            >
              Excel
            </Button>
          </div>
        }
      />
      {error ? <div className="mb-4 text-red-700">{error}</div> : null}
      {report ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="text-sm text-brand-700/70">Производство</div>
            <div className="mt-2 text-3xl font-semibold">{report.production.quantity}</div>
            <div className="text-xs text-brand-700/60">{report.production.records} записей</div>
          </Card>
          <Card>
            <div className="text-sm text-brand-700/70">Заказов</div>
            <div className="mt-2 text-3xl font-semibold">{report.sales.orders}</div>
          </Card>
          <Card>
            <div className="text-sm text-brand-700/70">Сумма продаж</div>
            <div className="mt-2 text-3xl font-semibold">
              {Number(report.sales.amount).toLocaleString('ru-RU')}
            </div>
          </Card>
          <Card>
            <div className="text-sm text-brand-700/70">Доставок</div>
            <div className="mt-2 text-3xl font-semibold">{report.deliveriesCompleted}</div>
          </Card>
        </div>
      ) : (
        <div>Загрузка...</div>
      )}
    </AppShell>
  );
}

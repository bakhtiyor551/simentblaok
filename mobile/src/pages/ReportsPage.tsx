import { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonText,
  RefresherEventDetail,
} from '@ionic/react';
import {
  cubeOutline,
  cartOutline,
  layersOutline,
  downloadOutline,
  documentTextOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import AppPage from '../components/AppPage';
import { API_URL, api, getToken } from '../lib/api';
import './ReportsPage.css';

type Report = {
  period: string;
  from: string;
  to: string;
  production: {
    quantity: number;
    records: number;
    byType?: Array<{ name: string; quantity: number; records: number }>;
  };
  sales: {
    orders: number;
    quantity: number;
    amount: number;
    averageCheck?: number;
    byType?: Array<{ name: string; quantity: number; amount: number; orders: number }>;
  };
  stock?: {
    totalBlocks: number;
    lowCount: number;
    items: Array<{
      quantity: number;
      minStock: number;
      isLow: boolean;
      blockType: { name: string; code?: string };
    }>;
  };
  /** legacy shape from older API */
  deliveriesCompleted?: number;
  recentOrders?: Array<{
    id: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    items: Array<{ quantity: number; blockType: { name: string } }>;
  }>;
  orders?: Array<{
    id: string;
    status: string;
    totalAmount: string | number;
    createdAt: string;
    items: Array<{ quantity: number; totalPrice?: string | number; blockType?: { name: string } }>;
  }>;
};

const PERIODS = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
] as const;

function money(n: number) {
  return Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function formatRange(from?: string, to?: string) {
  if (!from || !to) return '';
  const a = new Date(from);
  const b = new Date(to);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `${a.toLocaleDateString('ru-RU', opts)} — ${b.toLocaleDateString('ru-RU', opts)}`;
}

function barWidth(value: number, max: number) {
  if (!max) return 0;
  return Math.max(6, Math.round((value / max) * 100));
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('day');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(p = period) {
    setError('');
    setLoading(true);
    try {
      setReport(await api<Report>(`/reports/${p}`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  }, []);

  async function refresh(e: CustomEvent<RefresherEventDetail>) {
    await load().catch((err) => setError(err.message));
    e.detail.complete();
  }

  async function download(kind: 'pdf' | 'excel') {
    const token = getToken();
    const res = await fetch(`${API_URL}/reports/${period}/${kind}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error('Ошибка скачивания');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${period}.${kind === 'pdf' ? 'pdf' : 'xlsx'}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const normalized = useMemo(() => {
    if (!report) return null;

    const productionByType = report.production.byType || [];
    const salesByType = report.sales.byType || [];
    const averageCheck =
      report.sales.averageCheck ??
      (report.sales.orders ? Number(report.sales.amount) / report.sales.orders : 0);

    const rawStock = (report as unknown as { stock?: unknown }).stock;
    let stockItems = report.stock?.items || [];
    if (Array.isArray(rawStock)) {
      stockItems = (
        rawStock as Array<{ quantity: number; blockType: { name: string; minStock: number } }>
      ).map((s) => ({
        quantity: s.quantity,
        minStock: s.blockType.minStock,
        isLow: s.quantity < s.blockType.minStock,
        blockType: { name: s.blockType.name },
      }));
    }

    const stockTotal =
      report.stock?.totalBlocks ?? stockItems.reduce((s, i) => s + i.quantity, 0);
    const lowCount = report.stock?.lowCount ?? stockItems.filter((i) => i.isLow).length;

    const recentOrders =
      report.recentOrders ||
      (report.orders || []).slice(0, 20).map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          quantity: i.quantity,
          blockType: { name: i.blockType?.name || 'Блок' },
        })),
      }));

    const maxProd = Math.max(1, ...productionByType.map((x) => x.quantity));
    const maxSales = Math.max(1, ...salesByType.map((x) => x.amount));
    const maxStock = Math.max(1, ...stockItems.map((x) => Math.max(x.quantity, x.minStock)));

    return {
      productionByType,
      salesByType,
      averageCheck,
      stockItems,
      stockTotal,
      lowCount,
      recentOrders,
      maxProd,
      maxSales,
      maxStock,
    };
  }, [report]);

  return (
    <AppPage title="Отчеты">
      <IonRefresher slot="fixed" onIonRefresh={refresh}>
        <IonRefresherContent />
      </IonRefresher>

      <div className="report-page">
        <section className="report-hero">
          <p className="report-kicker">Сводка завода</p>
          <h1>Подробный отчёт</h1>
          <p className="report-range">
            {report ? formatRange(report.from, report.to) : 'Выберите период'}
          </p>

          <div className="report-periods" role="tablist" aria-label="Период">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={period === p.value ? 'is-active' : undefined}
                onClick={() => {
                  setPeriod(p.value);
                  load(p.value).catch((err) => setError(err.message));
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <IonText color="danger">
            <p className="report-error">{error}</p>
          </IonText>
        ) : null}

        {loading && !report ? (
          <div className="report-loading">
            <IonSpinner name="crescent" />
            <span>Собираем данные…</span>
          </div>
        ) : null}

        {report && normalized ? (
          <>
            <section className="report-kpi-grid">
              <article className="report-kpi report-kpi--green">
                <div className="report-kpi__icon">
                  <IonIcon icon={cubeOutline} />
                </div>
                <p>Произведено</p>
                <strong>{money(report.production.quantity)}</strong>
                <span>{report.production.records} записей</span>
              </article>
              <article className="report-kpi report-kpi--amber">
                <div className="report-kpi__icon">
                  <IonIcon icon={cartOutline} />
                </div>
                <p>Продажи</p>
                <strong>{money(Number(report.sales.amount))}</strong>
                <span>{report.sales.orders} заказов · {money(report.sales.quantity)} блоков</span>
              </article>
              <article className="report-kpi report-kpi--slate">
                <div className="report-kpi__icon">
                  <IonIcon icon={trendingUpOutline} />
                </div>
                <p>Средний чек</p>
                <strong>{money(normalized.averageCheck)}</strong>
                <span>за заказ</span>
              </article>
              <article className="report-kpi report-kpi--teal">
                <div className="report-kpi__icon">
                  <IonIcon icon={layersOutline} />
                </div>
                <p>На складе</p>
                <strong>{money(normalized.stockTotal)}</strong>
                <span>
                  {normalized.lowCount > 0
                    ? `${normalized.lowCount} с низким остатком`
                    : 'остатки в норме'}
                </span>
              </article>
            </section>

            <section className="report-panel">
              <header>
                <h2>Производство по типам</h2>
                <p>Сколько блоков выпущено за период</p>
              </header>
              {normalized.productionByType.length ? (
                <ul className="report-bars">
                  {normalized.productionByType.map((row) => (
                    <li key={row.name}>
                      <div className="report-bars__meta">
                        <span>{row.name}</span>
                        <strong>{money(row.quantity)} шт</strong>
                      </div>
                      <div className="report-bars__track">
                        <div
                          className="report-bars__fill report-bars__fill--green"
                          style={{ width: `${barWidth(row.quantity, normalized.maxProd)}%` }}
                        />
                      </div>
                      <small>{row.records} записей</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="report-empty">За период производства не было</p>
              )}
            </section>

            <section className="report-panel">
              <header>
                <h2>Продажи по типам</h2>
                <p>Выручка и количество по каждому блоку</p>
              </header>
              {normalized.salesByType.length ? (
                <ul className="report-bars">
                  {normalized.salesByType.map((row) => (
                    <li key={row.name}>
                      <div className="report-bars__meta">
                        <span>{row.name}</span>
                        <strong>{money(row.amount)}</strong>
                      </div>
                      <div className="report-bars__track">
                        <div
                          className="report-bars__fill report-bars__fill--amber"
                          style={{ width: `${barWidth(row.amount, normalized.maxSales)}%` }}
                        />
                      </div>
                      <small>
                        {money(row.quantity)} шт · в {row.orders} зак.
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="report-empty">За период продаж не было</p>
              )}
            </section>

            <section className="report-panel">
              <header>
                <h2>Склад сейчас</h2>
                <p>Текущие остатки и минимальные пороги</p>
              </header>
              {normalized.stockItems.length ? (
                <ul className="report-stock">
                  {normalized.stockItems.map((item) => (
                    <li key={item.blockType.name} className={item.isLow ? 'is-low' : undefined}>
                      <div className="report-stock__top">
                        <div>
                          <strong>{item.blockType.name}</strong>
                          {item.blockType.code ? <span>{item.blockType.code}</span> : null}
                        </div>
                        <em>{item.isLow ? 'Низкий остаток' : 'Норма'}</em>
                      </div>
                      <div className="report-bars__track">
                        <div
                          className={`report-bars__fill ${item.isLow ? 'report-bars__fill--warn' : 'report-bars__fill--teal'}`}
                          style={{ width: `${barWidth(item.quantity, normalized.maxStock)}%` }}
                        />
                      </div>
                      <div className="report-stock__nums">
                        <span>Остаток: {money(item.quantity)}</span>
                        <span>Мин: {money(item.minStock)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="report-empty">Нет данных склада</p>
              )}
            </section>

            <section className="report-panel">
              <header>
                <h2>Последние продажи</h2>
                <p>Детализация заказов за выбранный период</p>
              </header>
              {normalized.recentOrders.length ? (
                <ul className="report-orders">
                  {normalized.recentOrders.map((order) => (
                    <li key={order.id}>
                      <div className="report-orders__head">
                        <strong>
                          {order.items.map((i) => `${i.blockType.name} × ${i.quantity}`).join(', ')}
                        </strong>
                        <span>{money(order.totalAmount)}</span>
                      </div>
                      <div className="report-orders__meta">
                        <em>{order.status}</em>
                        <time>{new Date(order.createdAt).toLocaleString('ru-RU')}</time>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="report-empty">Заказов за период нет</p>
              )}
            </section>

            <section className="report-export">
              <IonButton expand="block" onClick={() => download('pdf').catch((e) => setError(e.message))}>
                <IonIcon slot="start" icon={documentTextOutline} />
                Скачать PDF
              </IonButton>
              <IonButton
                expand="block"
                fill="outline"
                onClick={() => download('excel').catch((e) => setError(e.message))}
              >
                <IonIcon slot="start" icon={downloadOutline} />
                Скачать Excel
              </IonButton>
            </section>
          </>
        ) : null}
      </div>
    </AppPage>
  );
}

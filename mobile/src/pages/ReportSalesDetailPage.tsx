import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonRefresher, IonRefresherContent, IonSpinner, IonText, RefresherEventDetail } from '@ionic/react';
import AppPage from '../components/AppPage';
import { api } from '../lib/api';
import './ReportsPage.css';

type OrderItem = {
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  blockType: { name: string; code?: string };
};

type Order = {
  id: string;
  status: string;
  notes?: string | null;
  needsDelivery: boolean;
  totalAmount: number;
  createdAt: string;
  customer?: { fullName: string; phone?: string } | null;
  createdBy?: { login: string } | null;
  delivery?: { status: string; address: string } | null;
  items: OrderItem[];
};

type Report = {
  from: string;
  to: string;
  period: string;
  sales: {
    orders: number;
    quantity: number;
    amount: number;
    averageCheck: number;
    byType: Array<{ name: string; quantity: number; amount: number; orders: number }>;
  };
  orders?: Order[];
  recentOrders?: Order[];
};

const PERIOD_LABEL: Record<string, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
};

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
  COMPLETED: 'Завершён',
};

function money(n: number) {
  return Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function formatRange(from?: string, to?: string) {
  if (!from || !to) return '';
  const opts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dushanbe',
  };
  return `${new Date(from).toLocaleDateString('ru-RU', opts)} — ${new Date(to).toLocaleDateString('ru-RU', opts)}`;
}

export default function ReportSalesDetailPage() {
  const { period: periodParam } = useParams<{ period?: string }>();
  const period = periodParam && PERIOD_LABEL[periodParam] ? periodParam : 'day';
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    setLoading(true);
    try {
      setReport(await api<Report>(`/reports/${period}`));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  }, [period]);

  async function refresh(e: CustomEvent<RefresherEventDetail>) {
    await load().catch((err) => setError(err.message));
    e.detail.complete();
  }

  const orders = useMemo(
    () => report?.orders || report?.recentOrders || [],
    [report]
  );

  return (
    <AppPage title="Продажи — детали" backHref="/reports">
      <IonRefresher slot="fixed" onIonRefresh={refresh}>
        <IonRefresherContent />
      </IonRefresher>

      <div className="report-page">
        <section className="report-hero">
          <p className="report-kicker">Подробный отчёт</p>
          <h1>Продажи</h1>
          <p className="report-range">
            {PERIOD_LABEL[period]} · {report ? formatRange(report.from, report.to) : '…'}
          </p>
        </section>

        {error ? (
          <IonText color="danger">
            <p className="report-error">{error}</p>
          </IonText>
        ) : null}

        {loading && !report ? (
          <div className="report-loading">
            <IonSpinner name="crescent" />
            <span>Загрузка…</span>
          </div>
        ) : null}

        {report ? (
          <>
            <section className="report-kpi-grid">
              <article className="report-kpi report-kpi--amber">
                <p>Выручка</p>
                <strong>{money(report.sales.amount)}</strong>
                <span>{report.sales.orders} заказов</span>
              </article>
              <article className="report-kpi report-kpi--green">
                <p>Продано блоков</p>
                <strong>{money(report.sales.quantity)}</strong>
                <span>средний чек {money(report.sales.averageCheck)}</span>
              </article>
            </section>

            <section className="report-panel">
              <header>
                <h2>По типам блоков</h2>
                <p>Количество, сумма и число заказов</p>
              </header>
              {report.sales.byType.length ? (
                <ul className="report-orders">
                  {report.sales.byType.map((row) => (
                    <li key={row.name}>
                      <div className="report-orders__head">
                        <strong>{row.name}</strong>
                        <span>{money(row.amount)}</span>
                      </div>
                      <div className="report-orders__meta">
                        <em>{money(row.quantity)} шт</em>
                        <span>в {row.orders} зак.</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="report-empty">За период продаж не было</p>
              )}
            </section>

            <section className="report-panel">
              <header>
                <h2>Все заказы</h2>
                <p>Полная детализация продаж за период</p>
              </header>
              {orders.length ? (
                <ul className="report-orders">
                  {orders.map((order) => (
                    <li key={order.id}>
                      <div className="report-orders__head">
                        <strong>
                          {order.items
                            .map((i) => `${i.blockType.name} × ${i.quantity}`)
                            .join(', ') || 'Заказ'}
                        </strong>
                        <span>{money(order.totalAmount)}</span>
                      </div>
                      <div className="report-orders__meta">
                        <em>{STATUS_LABEL[order.status] || order.status}</em>
                        <time>
                          {new Date(order.createdAt).toLocaleString('ru-RU', {
                            timeZone: 'Asia/Dushanbe',
                          })}
                        </time>
                      </div>
                      <div className="report-orders__meta" style={{ marginTop: '0.25rem' }}>
                        <span>
                          {order.customer?.fullName || 'Розничный покупатель'}
                          {order.customer?.phone ? ` · ${order.customer.phone}` : ''}
                        </span>
                        <span>{order.createdBy?.login ? `@${order.createdBy.login}` : ''}</span>
                      </div>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="report-orders__meta" style={{ marginTop: '0.2rem' }}>
                          <span>
                            {item.blockType.name}: {item.quantity} × {money(item.unitPrice)}
                          </span>
                          <span>{money(item.totalPrice)}</span>
                        </div>
                      ))}
                      {order.needsDelivery && order.delivery ? (
                        <div className="report-orders__meta" style={{ marginTop: '0.35rem' }}>
                          <em>Доставка: {order.delivery.status}</em>
                          <span>{order.delivery.address}</span>
                        </div>
                      ) : null}
                      {order.notes ? (
                        <p className="report-empty" style={{ marginTop: '0.35rem' }}>{order.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="report-empty">Заказов за период нет</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppPage>
  );
}

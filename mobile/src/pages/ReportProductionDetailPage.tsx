import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonRefresher, IonRefresherContent, IonSpinner, IonText, RefresherEventDetail } from '@ionic/react';
import AppPage from '../components/AppPage';
import { api } from '../lib/api';
import './ReportsPage.css';

type ProductionItem = {
  id: string;
  quantity: number;
  shift: string;
  comment?: string | null;
  producedAt: string;
  blockType: { name: string; code?: string };
  employee?: { fullName: string } | null;
  createdBy?: { login: string } | null;
};

type Report = {
  from: string;
  to: string;
  period: string;
  production: {
    quantity: number;
    records: number;
    byType: Array<{ name: string; quantity: number; records: number }>;
    items?: ProductionItem[];
  };
};

const PERIOD_LABEL: Record<string, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
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

export default function ReportProductionDetailPage() {
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

  const items = useMemo(() => report?.production.items || [], [report]);
  const total = report?.production.quantity || 0;

  return (
    <AppPage title="Производство — детали" backHref="/reports">
      <IonRefresher slot="fixed" onIonRefresh={refresh}>
        <IonRefresherContent />
      </IonRefresher>

      <div className="report-page">
        <section className="report-hero">
          <p className="report-kicker">Подробный отчёт</p>
          <h1>Производство</h1>
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
              <article className="report-kpi report-kpi--green">
                <p>Всего произведено</p>
                <strong>{money(total)}</strong>
                <span>блоков</span>
              </article>
              <article className="report-kpi report-kpi--slate">
                <p>Записей</p>
                <strong>{money(report.production.records)}</strong>
                <span>за период</span>
              </article>
            </section>

            <section className="report-panel">
              <header>
                <h2>По типам блоков</h2>
                <p>Сводка выпуска за выбранный период</p>
              </header>
              {report.production.byType.length ? (
                <ul className="report-orders">
                  {report.production.byType.map((row) => (
                    <li key={row.name}>
                      <div className="report-orders__head">
                        <strong>{row.name}</strong>
                        <span>{money(row.quantity)} шт</span>
                      </div>
                      <div className="report-orders__meta">
                        <em>{row.records} записей</em>
                        <span>
                          {total ? Math.round((row.quantity / total) * 100) : 0}% от общего
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="report-empty">За период производства не было</p>
              )}
            </section>

            <section className="report-panel">
              <header>
                <h2>Все записи</h2>
                <p>Каждая операция производства с деталями</p>
              </header>
              {items.length ? (
                <ul className="report-orders">
                  {items.map((item) => (
                    <li key={item.id}>
                      <div className="report-orders__head">
                        <strong>
                          {item.blockType.name} × {money(item.quantity)}
                        </strong>
                        <span>{item.shift === 'NIGHT' ? 'Ночная' : 'Дневная'}</span>
                      </div>
                      <div className="report-orders__meta">
                        <em>
                          {new Date(item.producedAt).toLocaleString('ru-RU', {
                            timeZone: 'Asia/Dushanbe',
                          })}
                        </em>
                        <span>
                          {[item.employee?.fullName, item.createdBy?.login && `@${item.createdBy.login}`]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </div>
                      {item.comment ? <p className="report-empty" style={{ marginTop: '0.4rem' }}>{item.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="report-empty">Записей нет</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppPage>
  );
}

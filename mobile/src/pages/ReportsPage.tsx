import { useEffect, useState } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/react';
import AppPage from '../components/AppPage';
import { API_URL, api, getToken } from '../lib/api';

type Report = {
  production: { quantity: number; records: number };
  sales: { orders: number; quantity: number; amount: number };
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

  return (
    <AppPage title="Отчеты">
      <IonItem>
        <IonSelect
          label="Период"
          labelPlacement="stacked"
          value={period}
          onIonChange={(e) => {
            setPeriod(e.detail.value);
            load(e.detail.value).catch((err) => setError(err.message));
          }}
        >
          <IonSelectOption value="day">День</IonSelectOption>
          <IonSelectOption value="week">Неделя</IonSelectOption>
          <IonSelectOption value="month">Месяц</IonSelectOption>
          <IonSelectOption value="year">Год</IonSelectOption>
        </IonSelect>
      </IonItem>
      {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
      {report ? (
        <>
          <IonCard>
            <IonCardHeader><IonCardTitle>Производство</IonCardTitle></IonCardHeader>
            <IonCardContent>{report.production.quantity} блоков</IonCardContent>
          </IonCard>
          <IonCard>
            <IonCardHeader><IonCardTitle>Продажи</IonCardTitle></IonCardHeader>
            <IonCardContent>
              {report.sales.orders} заказов · {Number(report.sales.amount).toLocaleString('ru-RU')}
            </IonCardContent>
          </IonCard>
          <IonButton expand="block" onClick={() => download('pdf').catch((e) => setError(e.message))}>
            Скачать PDF
          </IonButton>
          <IonButton expand="block" fill="outline" onClick={() => download('excel').catch((e) => setError(e.message))}>
            Скачать Excel
          </IonButton>
        </>
      ) : (
        <p>Загрузка...</p>
      )}
    </AppPage>
  );
}

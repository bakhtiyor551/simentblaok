import { useEffect, useState } from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
} from '@ionic/react';
import AppPage from '../components/AppPage';
import { api } from '../lib/api';

type Dashboard = {
  stock: { totalBlocks: number; lowStock: Array<{ quantity: number; blockType: { name: string; minStock: number } }> };
  productionToday: { quantity: number };
  salesToday: { count: number; amount: number };
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  async function load() {
    setData(await api<Dashboard>('/dashboard'));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function refresh(e: CustomEvent<RefresherEventDetail>) {
    await load().catch(console.error);
    e.detail.complete();
  }

  return (
    <AppPage title="Главная">
      <IonRefresher slot="fixed" onIonRefresh={refresh}>
        <IonRefresherContent />
      </IonRefresher>
      {data ? (
        <>
          <IonCard>
            <IonCardHeader><IonCardTitle>Склад</IonCardTitle></IonCardHeader>
            <IonCardContent>{data.stock.totalBlocks} блоков</IonCardContent>
          </IonCard>
          <IonCard>
            <IonCardHeader><IonCardTitle>Производство сегодня</IonCardTitle></IonCardHeader>
            <IonCardContent>{data.productionToday.quantity}</IonCardContent>
          </IonCard>
          <IonCard>
            <IonCardHeader><IonCardTitle>Продажи сегодня</IonCardTitle></IonCardHeader>
            <IonCardContent>
              {data.salesToday.count} заказов · {Number(data.salesToday.amount).toLocaleString('ru-RU')}
            </IonCardContent>
          </IonCard>
          {data.stock.lowStock.length > 0 ? (
            <IonCard color="warning">
              <IonCardHeader><IonCardTitle>Низкий остаток</IonCardTitle></IonCardHeader>
              <IonCardContent>
                {data.stock.lowStock.map((s, i) => (
                  <div key={i}>
                    {s.blockType.name}: {s.quantity} (мин. {s.blockType.minStock})
                  </div>
                ))}
              </IonCardContent>
            </IonCard>
          ) : null}
        </>
      ) : (
        <p>Загрузка...</p>
      )}
    </AppPage>
  );
}

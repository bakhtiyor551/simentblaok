import { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
} from '@ionic/react';
import { api } from '../lib/api';

type Dashboard = {
  stock: { totalBlocks: number; lowStock: unknown[] };
  productionToday: { quantity: number };
  salesToday: { count: number; amount: number };
  deliveriesActive: number;
  employeesActive: number;
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
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={refresh}>
          <IonRefresherContent />
        </IonRefresher>
        {data ? (
          <div className="ion-padding">
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
                {data.salesToday.count} / {Number(data.salesToday.amount).toLocaleString('ru-RU')}
              </IonCardContent>
            </IonCard>
            <IonCard>
              <IonCardHeader><IonCardTitle>Доставки / Сотрудники</IonCardTitle></IonCardHeader>
              <IonCardContent>
                {data.deliveriesActive} активных · {data.employeesActive} сотрудников
              </IonCardContent>
            </IonCard>
          </div>
        ) : (
          <div className="ion-padding">Загрузка...</div>
        )}
      </IonContent>
    </IonPage>
  );
}

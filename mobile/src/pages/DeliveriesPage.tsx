import { useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  IonText,
  IonToast,
} from '@ionic/react';
import { API_URL, api, getToken } from '../lib/api';

type Delivery = {
  id: string;
  status: string;
  address: string;
  order: { customer: { fullName: string } };
};

export default function DeliveriesPage() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function load() {
    setItems(await api<Delivery[]>('/deliveries?mine=true').catch(() => api<Delivery[]>('/deliveries')));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function confirm(id: string) {
    setError('');
    try {
      const form = new FormData();
      const token = getToken();
      const res = await fetch(`${API_URL}/deliveries/${id}/confirm`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка');
      }
      setOk(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Доставки</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {error ? (
          <IonText color="danger">
            <p className="ion-padding">{error}</p>
          </IonText>
        ) : null}
        <IonList>
          {items.map((d) => (
            <IonItem key={d.id}>
              <IonLabel>
                <h2>{d.order.customer.fullName}</h2>
                <p>{d.address}</p>
                <p>{d.status}</p>
              </IonLabel>
              {d.status !== 'DELIVERED' ? (
                <IonButton slot="end" onClick={() => confirm(d.id)}>
                  Подтвердить
                </IonButton>
              ) : null}
            </IonItem>
          ))}
        </IonList>
        <IonToast
          isOpen={ok}
          message="Доставка подтверждена"
          duration={2000}
          onDidDismiss={() => setOk(false)}
        />
      </IonContent>
    </IonPage>
  );
}

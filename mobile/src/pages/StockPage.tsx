import { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonSearchbar,
} from '@ionic/react';
import { api } from '../lib/api';

type StockItem = {
  id: string;
  quantity: number;
  isLow: boolean;
  blockType: { name: string; code: string; minStock: number };
};

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [q, setQ] = useState('');

  async function load(search = q) {
    setItems(await api<StockItem[]>(`/stock?q=${encodeURIComponent(search)}`));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Склад</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={q}
            onIonInput={(e) => setQ(e.detail.value || '')}
            onIonClear={() => load('')}
            onKeyUp={(e) => {
              if (e.key === 'Enter') load();
            }}
            placeholder="Поиск по типу блока"
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          {items.map((item) => (
            <IonItem key={item.id}>
              <IonLabel>
                <h2>{item.blockType.name}</h2>
                <p>
                  {item.blockType.code} · мин. {item.blockType.minStock}
                </p>
              </IonLabel>
              <IonBadge color={item.isLow ? 'warning' : 'success'}>{item.quantity}</IonBadge>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}

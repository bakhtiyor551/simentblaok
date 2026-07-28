import { useEffect, useState } from 'react';
import { IonBadge, IonItem, IonLabel, IonList, IonSearchbar } from '@ionic/react';
import AppPage from '../components/AppPage';
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
    <AppPage title="Склад">
      <IonSearchbar
        value={q}
        debounce={400}
        onIonInput={(e) => {
          const value = e.detail.value || '';
          setQ(value);
          load(value).catch(console.error);
        }}
        placeholder="Поиск по типу блока"
      />
      <IonList>
        {items.map((item) => (
          <IonItem key={item.id}>
            <IonLabel>
              <h2>{item.blockType.name}</h2>
              <p>{item.blockType.code} · мин. {item.blockType.minStock}</p>
            </IonLabel>
            <IonBadge color={item.isLow ? 'warning' : 'success'}>{item.quantity}</IonBadge>
          </IonItem>
        ))}
      </IonList>
    </AppPage>
  );
}

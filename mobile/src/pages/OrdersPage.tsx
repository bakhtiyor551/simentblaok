import { useEffect, useState } from 'react';
import {
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonText,
  IonToast,
} from '@ionic/react';
import AppPage from '../components/AppPage';
import { api } from '../lib/api';

type BlockType = { id: string; name: string; unitPrice: string | number };
type Order = {
  id: string;
  totalAmount: string | number;
  status: string;
  createdAt: string;
  items: Array<{ quantity: number; blockType: { name: string } }>;
};

export default function OrdersPage() {
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [blockTypeId, setBlockTypeId] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [unitPrice, setUnitPrice] = useState(4500);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function load() {
    const [b, o] = await Promise.all([
      api<BlockType[]>('/block-types'),
      api<Order[]>('/orders'),
    ]);
    setBlocks(b);
    setOrders(o);
    if (!blockTypeId && b[0]) {
      setBlockTypeId(b[0].id);
      setUnitPrice(Number(b[0].unitPrice));
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function submit() {
    setError('');
    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          needsDelivery: false,
          items: [{ blockTypeId, quantity: Number(quantity), unitPrice: Number(unitPrice) }],
        }),
      });
      setOk(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  return (
    <AppPage title="Продажи">
      <IonList>
        <IonItem>
          <IonSelect label="Блок" labelPlacement="stacked" value={blockTypeId} onIonChange={(e) => {
            setBlockTypeId(e.detail.value);
            const b = blocks.find((x) => x.id === e.detail.value);
            if (b) setUnitPrice(Number(b.unitPrice));
          }}>
            {blocks.map((b) => <IonSelectOption key={b.id} value={b.id}>{b.name}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonInput type="number" label="Количество" labelPlacement="stacked" value={quantity} onIonInput={(e) => setQuantity(Number(e.detail.value || 0))} />
        </IonItem>
        <IonItem>
          <IonInput type="number" label="Цена" labelPlacement="stacked" value={unitPrice} onIonInput={(e) => setUnitPrice(Number(e.detail.value || 0))} />
        </IonItem>
      </IonList>
      {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
      <IonButton expand="block" onClick={submit}>Создать заказ</IonButton>

      <h3 className="ion-padding-top">Заказы</h3>
      <IonList>
        {orders.map((o) => (
          <IonItem key={o.id}>
            <IonLabel>
              <h2>{o.items.map((i) => `${i.blockType.name} × ${i.quantity}`).join(', ')}</h2>
              <p>{o.status} · {Number(o.totalAmount).toLocaleString('ru-RU')}</p>
              <p>{new Date(o.createdAt).toLocaleString('ru-RU')}</p>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
      <IonToast isOpen={ok} message="Заказ создан" duration={2000} onDidDismiss={() => setOk(false)} />
    </AppPage>
  );
}

import { useEffect, useState } from 'react';
import {
  IonButton,
  IonCheckbox,
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

type Customer = { id: string; fullName: string; address?: string };
type BlockType = { id: string; name: string; unitPrice: string | number };
type Order = {
  id: string;
  totalAmount: string | number;
  status: string;
  createdAt: string;
  customer: { fullName: string };
  items: Array<{ quantity: number; blockType: { name: string } }>;
};

export default function OrdersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [blockTypeId, setBlockTypeId] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [unitPrice, setUnitPrice] = useState(4500);
  const [needsDelivery, setNeedsDelivery] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function load() {
    const [c, b, o] = await Promise.all([
      api<Customer[]>('/customers'),
      api<BlockType[]>('/block-types'),
      api<Order[]>('/orders'),
    ]);
    setCustomers(c);
    setBlocks(b);
    setOrders(o);
    if (!customerId && c[0]) {
      setCustomerId(c[0].id);
      setDeliveryAddress(c[0].address || '');
    }
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
          customerId,
          needsDelivery,
          deliveryAddress,
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
          <IonSelect label="Клиент" labelPlacement="stacked" value={customerId} onIonChange={(e) => {
            setCustomerId(e.detail.value);
            const c = customers.find((x) => x.id === e.detail.value);
            if (c?.address) setDeliveryAddress(c.address);
          }}>
            {customers.map((c) => <IonSelectOption key={c.id} value={c.id}>{c.fullName}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
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
        <IonItem>
          <IonCheckbox checked={needsDelivery} onIonChange={(e) => setNeedsDelivery(e.detail.checked)} labelPlacement="end">
            Оформить доставку
          </IonCheckbox>
        </IonItem>
        {needsDelivery ? (
          <IonItem>
            <IonInput label="Адрес доставки" labelPlacement="stacked" value={deliveryAddress} onIonInput={(e) => setDeliveryAddress(String(e.detail.value || ''))} />
          </IonItem>
        ) : null}
      </IonList>
      {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
      <IonButton expand="block" onClick={submit}>Создать заказ</IonButton>

      <h3 className="ion-padding-top">Заказы</h3>
      <IonList>
        {orders.map((o) => (
          <IonItem key={o.id}>
            <IonLabel>
              <h2>{o.customer.fullName}</h2>
              <p>{o.status} · {Number(o.totalAmount).toLocaleString('ru-RU')}</p>
              <p>{o.items.map((i) => `${i.blockType.name} × ${i.quantity}`).join(', ')}</p>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
      <IonToast isOpen={ok} message="Заказ создан" duration={2000} onDidDismiss={() => setOk(false)} />
    </AppPage>
  );
}

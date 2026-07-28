import { useEffect, useState } from 'react';
import {
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonToast,
} from '@ionic/react';
import AppPage from '../components/AppPage';
import { api } from '../lib/api';

type Customer = { id: string; fullName: string; phone: string; address?: string | null };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function load() {
    setItems(await api<Customer[]>('/customers'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function submit() {
    setError('');
    try {
      await api('/customers', {
        method: 'POST',
        body: JSON.stringify({ fullName, phone, address }),
      });
      setFullName('');
      setPhone('');
      setAddress('');
      setOk(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  return (
    <AppPage title="Клиенты">
      <IonList>
        <IonItem>
          <IonInput label="ФИО" labelPlacement="stacked" value={fullName} onIonInput={(e) => setFullName(String(e.detail.value || ''))} />
        </IonItem>
        <IonItem>
          <IonInput label="Телефон" labelPlacement="stacked" value={phone} onIonInput={(e) => setPhone(String(e.detail.value || ''))} />
        </IonItem>
        <IonItem>
          <IonInput label="Адрес" labelPlacement="stacked" value={address} onIonInput={(e) => setAddress(String(e.detail.value || ''))} />
        </IonItem>
      </IonList>
      {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
      <IonButton expand="block" onClick={submit}>Добавить</IonButton>
      <IonList className="ion-margin-top">
        {items.map((c) => (
          <IonItem key={c.id}>
            <IonLabel>
              <h2>{c.fullName}</h2>
              <p>{c.phone} · {c.address || 'без адреса'}</p>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
      <IonToast isOpen={ok} message="Клиент добавлен" duration={2000} onDidDismiss={() => setOk(false)} />
    </AppPage>
  );
}

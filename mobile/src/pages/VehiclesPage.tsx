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

type Vehicle = { id: string; plateNumber: string; model?: string | null; capacity?: number | null };

export default function VehiclesPage() {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [plateNumber, setPlateNumber] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState(3000);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function load() {
    setItems(await api<Vehicle[]>('/vehicles'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function submit() {
    setError('');
    try {
      await api('/vehicles', {
        method: 'POST',
        body: JSON.stringify({ plateNumber, model, capacity }),
      });
      setPlateNumber('');
      setModel('');
      setOk(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  return (
    <AppPage title="Автопарк">
      <IonList>
        <IonItem>
          <IonInput label="Госномер" labelPlacement="stacked" value={plateNumber} onIonInput={(e) => setPlateNumber(String(e.detail.value || ''))} />
        </IonItem>
        <IonItem>
          <IonInput label="Модель" labelPlacement="stacked" value={model} onIonInput={(e) => setModel(String(e.detail.value || ''))} />
        </IonItem>
        <IonItem>
          <IonInput type="number" label="Вместимость" labelPlacement="stacked" value={capacity} onIonInput={(e) => setCapacity(Number(e.detail.value || 0))} />
        </IonItem>
      </IonList>
      {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
      <IonButton expand="block" onClick={submit}>Добавить</IonButton>
      <IonList className="ion-margin-top">
        {items.map((v) => (
          <IonItem key={v.id}>
            <IonLabel>
              <h2>{v.plateNumber}</h2>
              <p>{v.model || '—'} · {v.capacity || '—'}</p>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
      <IonToast isOpen={ok} message="Авто добавлено" duration={2000} onDidDismiss={() => setOk(false)} />
    </AppPage>
  );
}

import { useEffect, useState } from 'react';
import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonText,
  IonToast,
} from '@ionic/react';
import AppPage from '../components/AppPage';
import { API_URL, api, getToken } from '../lib/api';

type Vehicle = { id: string; plateNumber: string };
type Driver = { id: string; login: string; employee?: { fullName: string } | null };
type Delivery = {
  id: string;
  status: string;
  address: string;
  order: { customer: { fullName: string } };
  vehicle?: { plateNumber: string } | null;
};

export default function DeliveriesPage() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    const [d, v, dr] = await Promise.all([
      api<Delivery[]>('/deliveries'),
      api<Vehicle[]>('/vehicles').catch(() => [] as Vehicle[]),
      api<Driver[]>('/users/drivers').catch(() => [] as Driver[]),
    ]);
    setItems(d);
    setVehicles(v);
    setDrivers(dr);
    if (!selectedId && d[0]) setSelectedId(d[0].id);
    if (!vehicleId && v[0]) setVehicleId(v[0].id);
    if (!driverId && dr[0]) setDriverId(dr[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function assign() {
    setError('');
    try {
      await api(`/deliveries/${selectedId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ vehicleId, driverId }),
      });
      setOk('Назначено');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

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
      setOk('Доставка подтверждена');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  return (
    <AppPage title="Доставки">
      {error ? <IonText color="danger"><p>{error}</p></IonText> : null}

      <h3>Назначить авто / водителя</h3>
      <IonList>
        <IonItem>
          <IonSelect label="Доставка" labelPlacement="stacked" value={selectedId} onIonChange={(e) => setSelectedId(e.detail.value)}>
            {items.map((d) => (
              <IonSelectOption key={d.id} value={d.id}>
                {d.order.customer.fullName} — {d.status}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonSelect label="Авто" labelPlacement="stacked" value={vehicleId} onIonChange={(e) => setVehicleId(e.detail.value)}>
            {vehicles.map((v) => <IonSelectOption key={v.id} value={v.id}>{v.plateNumber}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonSelect label="Водитель" labelPlacement="stacked" value={driverId} onIonChange={(e) => setDriverId(e.detail.value)}>
            {drivers.map((d) => (
              <IonSelectOption key={d.id} value={d.id}>{d.employee?.fullName || d.login}</IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
      </IonList>
      <IonButton expand="block" onClick={assign}>Назначить</IonButton>

      <h3 className="ion-padding-top">Список</h3>
      <IonList>
        {items.map((d) => (
          <IonItem key={d.id}>
            <IonLabel>
              <h2>{d.order.customer.fullName}</h2>
              <p>{d.address}</p>
              <p>{d.status} · {d.vehicle?.plateNumber || 'без авто'}</p>
            </IonLabel>
            {d.status !== 'DELIVERED' ? (
              <IonButton slot="end" onClick={() => confirm(d.id)}>OK</IonButton>
            ) : null}
          </IonItem>
        ))}
      </IonList>
      <IonToast isOpen={Boolean(ok)} message={ok} duration={2000} onDidDismiss={() => setOk('')} />
    </AppPage>
  );
}

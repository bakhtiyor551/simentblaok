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

type Employee = {
  id: string;
  fullName: string;
  phone?: string | null;
  position?: string | null;
  calcType: string;
  ratePerBlock: string | number;
};

export default function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [ratePerBlock, setRatePerBlock] = useState(500);
  const [calcType, setCalcType] = useState('PER_BLOCK');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  async function load() {
    setItems(await api<Employee[]>('/employees'));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function submit() {
    setError('');
    try {
      await api('/employees', {
        method: 'POST',
        body: JSON.stringify({ fullName, phone, position, ratePerBlock, calcType }),
      });
      setFullName('');
      setPhone('');
      setPosition('');
      setOk(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  return (
    <AppPage title="Сотрудники">
      <IonList>
        <IonItem>
          <IonInput label="ФИО" labelPlacement="stacked" value={fullName} onIonInput={(e) => setFullName(String(e.detail.value || ''))} />
        </IonItem>
        <IonItem>
          <IonInput label="Телефон" labelPlacement="stacked" value={phone} onIonInput={(e) => setPhone(String(e.detail.value || ''))} />
        </IonItem>
        <IonItem>
          <IonInput label="Должность" labelPlacement="stacked" value={position} onIonInput={(e) => setPosition(String(e.detail.value || ''))} />
        </IonItem>
        <IonItem>
          <IonSelect label="Расчет ЗП" labelPlacement="stacked" value={calcType} onIonChange={(e) => setCalcType(e.detail.value)}>
            <IonSelectOption value="PER_BLOCK">По блокам</IonSelectOption>
            <IonSelectOption value="FIXED">Фиксированная</IonSelectOption>
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonInput type="number" label="Ставка за блок" labelPlacement="stacked" value={ratePerBlock} onIonInput={(e) => setRatePerBlock(Number(e.detail.value || 0))} />
        </IonItem>
      </IonList>
      {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
      <IonButton expand="block" onClick={submit}>Добавить</IonButton>

      <IonList className="ion-margin-top">
        {items.map((e) => (
          <IonItem key={e.id}>
            <IonLabel>
              <h2>{e.fullName}</h2>
              <p>{e.position || '—'} · {e.phone || 'нет телефона'} · {e.calcType}</p>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
      <IonToast isOpen={ok} message="Сотрудник добавлен" duration={2000} onDidDismiss={() => setOk(false)} />
    </AppPage>
  );
}

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

type Employee = { id: string; fullName: string };
type Salary = {
  id: string;
  amount: string | number;
  finesAmount: string | number;
  netAmount: string | number;
  blocksCount: number;
  employee: { fullName: string };
  payments: Array<{ amount: string | number }>;
};

export default function SalaryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<Salary[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function load() {
    const [emps, salaries] = await Promise.all([
      api<Employee[]>('/employees'),
      api<Salary[]>('/salary'),
    ]);
    setEmployees(emps);
    setItems(salaries);
    if (!employeeId && emps[0]) setEmployeeId(emps[0].id);
  }

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setPeriodStart(start.toISOString().slice(0, 10));
    setPeriodEnd(now.toISOString().slice(0, 10));
    load().catch((e) => setError(e.message));
  }, []);

  async function accrue() {
    setError('');
    try {
      await api('/salary/accrue', {
        method: 'POST',
        body: JSON.stringify({ employeeId, periodStart, periodEnd }),
      });
      setOk('Начислено');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  async function pay(id: string) {
    setError('');
    try {
      await api(`/salary/${id}/pay`, { method: 'POST', body: JSON.stringify({}) });
      setOk('Выплачено');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  return (
    <AppPage title="Зарплата">
      <IonList>
        <IonItem>
          <IonSelect label="Сотрудник" labelPlacement="stacked" value={employeeId} onIonChange={(e) => setEmployeeId(e.detail.value)}>
            {employees.map((e) => <IonSelectOption key={e.id} value={e.id}>{e.fullName}</IonSelectOption>)}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonInput type="date" label="С" labelPlacement="stacked" value={periodStart} onIonInput={(e) => setPeriodStart(String(e.detail.value || ''))} />
        </IonItem>
        <IonItem>
          <IonInput type="date" label="По" labelPlacement="stacked" value={periodEnd} onIonInput={(e) => setPeriodEnd(String(e.detail.value || ''))} />
        </IonItem>
      </IonList>
      {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
      <IonButton expand="block" onClick={accrue}>Начислить</IonButton>

      <IonList className="ion-margin-top">
        {items.map((s) => {
          const paid = s.payments.reduce((acc, p) => acc + Number(p.amount), 0);
          return (
            <IonItem key={s.id}>
              <IonLabel>
                <h2>{s.employee.fullName}</h2>
                <p>
                  Блоков: {s.blocksCount} · к выплате {Number(s.netAmount).toLocaleString('ru-RU')} ·
                  выплачено {paid.toLocaleString('ru-RU')}
                </p>
              </IonLabel>
              <IonButton slot="end" disabled={paid >= Number(s.netAmount)} onClick={() => pay(s.id)}>
                Выплатить
              </IonButton>
            </IonItem>
          );
        })}
      </IonList>
      <IonToast isOpen={Boolean(ok)} message={ok} duration={2000} onDidDismiss={() => setOk('')} />
    </AppPage>
  );
}

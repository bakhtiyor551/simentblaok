import { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  IonText,
} from '@ionic/react';
import { api, AuthUser } from '../lib/api';

export default function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [login, setLogin] = useState('production');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const data = await api<{ token: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      });
      localStorage.setItem('blockerp_token', data.token);
      onLogin(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>BlockERP</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <h2>Вход</h2>
        <p>Приложение завода цементных блоков</p>
        <IonList>
          <IonItem>
            <IonInput label="Логин" labelPlacement="stacked" value={login} onIonInput={(e) => setLogin(String(e.detail.value || ''))} />
          </IonItem>
          <IonItem>
            <IonInput
              type="password"
              label="Пароль"
              labelPlacement="stacked"
              value={password}
              onIonInput={(e) => setPassword(String(e.detail.value || ''))}
            />
          </IonItem>
        </IonList>
        {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
        <IonButton expand="block" className="ion-margin-top" onClick={submit} disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </IonButton>
      </IonContent>
    </IonPage>
  );
}

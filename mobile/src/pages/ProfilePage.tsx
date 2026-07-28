import {
  IonButton,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/react';
import AppPage from '../components/AppPage';
import { AuthUser } from '../lib/api';

export default function ProfilePage({
  user,
  onLogout,
}: {
  user: AuthUser;
  onLogout: () => void;
}) {
  return (
    <AppPage title="Профиль">
      <IonList>
        <IonItem>
          <IonLabel>
            <h2>{user.login}</h2>
            <p>{user.roleName || user.role}</p>
          </IonLabel>
        </IonItem>
        {user.employee ? (
          <IonItem>
            <IonLabel>
              <h2>{user.employee.fullName}</h2>
              <p>Сотрудник</p>
            </IonLabel>
          </IonItem>
        ) : null}
      </IonList>
      <IonButton
        expand="block"
        color="medium"
        className="ion-margin-top"
        onClick={() => {
          localStorage.removeItem('blockerp_token');
          onLogout();
        }}
      >
        Выйти
      </IonButton>
    </AppPage>
  );
}

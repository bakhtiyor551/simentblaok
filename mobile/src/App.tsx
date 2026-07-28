import { useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  cubeOutline,
  homeOutline,
  carOutline,
  layersOutline,
  personOutline,
} from 'ionicons/icons';
import { api, AuthUser, getToken } from './lib/api';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductionPage from './pages/ProductionPage';
import StockPage from './pages/StockPage';
import DeliveriesPage from './pages/DeliveriesPage';
import ProfilePage from './pages/ProfilePage';

setupIonicReact();

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('blockerp_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <IonApp>
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>Загрузка...</div>
      </IonApp>
    );
  }

  if (!user) {
    return (
      <IonApp>
        <LoginPage
          onLogin={(u) => {
            setUser(u);
          }}
        />
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/dashboard">
              <DashboardPage />
            </Route>
            <Route exact path="/production">
              <ProductionPage />
            </Route>
            <Route exact path="/stock">
              <StockPage />
            </Route>
            <Route exact path="/deliveries">
              <DeliveriesPage />
            </Route>
            <Route exact path="/profile">
              <ProfilePage user={user} onLogout={() => setUser(null)} />
            </Route>
            <Route exact path="/">
              <Redirect to="/dashboard" />
            </Route>
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonIcon icon={homeOutline} />
              <IonLabel>Главная</IonLabel>
            </IonTabButton>
            <IonTabButton tab="production" href="/production">
              <IonIcon icon={cubeOutline} />
              <IonLabel>Производство</IonLabel>
            </IonTabButton>
            <IonTabButton tab="stock" href="/stock">
              <IonIcon icon={layersOutline} />
              <IonLabel>Склад</IonLabel>
            </IonTabButton>
            <IonTabButton tab="deliveries" href="/deliveries">
              <IonIcon icon={carOutline} />
              <IonLabel>Доставки</IonLabel>
            </IonTabButton>
            <IonTabButton tab="profile" href="/profile">
              <IonIcon icon={personOutline} />
              <IonLabel>Профиль</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}

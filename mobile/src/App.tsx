import { useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonSplitPane,
  IonTitle,
  IonToolbar,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  homeOutline,
  cubeOutline,
  layersOutline,
  cartOutline,
  documentTextOutline,
  personOutline,
  businessOutline,
} from 'ionicons/icons';
import { api, AuthUser, getToken } from './lib/api';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductionPage from './pages/ProductionPage';
import StockPage from './pages/StockPage';
import OrdersPage from './pages/OrdersPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';

setupIonicReact();

type MenuItem = {
  url: string;
  title: string;
  icon: string;
  roles?: string[];
};

const menuItems: MenuItem[] = [
  { url: '/dashboard', title: 'Главная', icon: homeOutline },
  { url: '/production', title: 'Производство', icon: cubeOutline },
  { url: '/stock', title: 'Склад', icon: layersOutline },
  { url: '/orders', title: 'Продажи', icon: cartOutline, roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'ACCOUNTANT'] },
  { url: '/reports', title: 'Отчеты', icon: documentTextOutline, roles: ['ADMIN', 'DIRECTOR', 'ACCOUNTANT', 'MANAGER'] },
  { url: '/profile', title: 'Профиль', icon: personOutline },
];

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
        <LoginPage onLogin={setUser} />
      </IonApp>
    );
  }

  const visibleMenu = menuItems.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  return (
    <IonApp>
      <IonReactRouter>
        <IonSplitPane contentId="main">
          <IonMenu contentId="main" type="overlay">
            <IonHeader>
              <IonToolbar color="primary">
                <IonTitle>BlockERP</IonTitle>
              </IonToolbar>
            </IonHeader>
            <IonContent>
              <IonList>
                <IonItem lines="none">
                  <IonIcon icon={businessOutline} slot="start" />
                  <IonLabel>
                    <h2>{user.login}</h2>
                    <p>{user.roleName || user.role}</p>
                  </IonLabel>
                </IonItem>
                {visibleMenu.map((item) => (
                  <IonMenuToggle key={item.url} autoHide>
                    <IonItem routerLink={item.url} routerDirection="none" lines="none" detail={false}>
                      <IonIcon slot="start" icon={item.icon} />
                      <IonLabel>{item.title}</IonLabel>
                    </IonItem>
                  </IonMenuToggle>
                ))}
              </IonList>
            </IonContent>
          </IonMenu>

          <IonRouterOutlet id="main">
            <Route exact path="/dashboard" component={DashboardPage} />
            <Route exact path="/production" component={ProductionPage} />
            <Route exact path="/stock" component={StockPage} />
            <Route exact path="/orders" component={OrdersPage} />
            <Route exact path="/reports" component={ReportsPage} />
            <Route
              exact
              path="/profile"
              render={() => <ProfilePage user={user} onLogout={() => setUser(null)} />}
            />
            <Route exact path="/">
              <Redirect to="/dashboard" />
            </Route>
          </IonRouterOutlet>
        </IonSplitPane>
      </IonReactRouter>
    </IonApp>
  );
}

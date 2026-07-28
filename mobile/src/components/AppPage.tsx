import { ReactNode } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';

export default function AppPage({
  title,
  children,
  footer,
  backHref,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  backHref?: string;
}) {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            {backHref ? <IonBackButton defaultHref={backHref} text="Назад" /> : <IonMenuButton />}
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">{children}</IonContent>
      {footer}
    </IonPage>
  );
}

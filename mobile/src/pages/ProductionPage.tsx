import { useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  IonText,
  IonToast,
} from '@ionic/react';
import { api } from '../lib/api';

type BlockType = { id: string; name: string };

export default function ProductionPage() {
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [blockTypeId, setBlockTypeId] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [shift, setShift] = useState('DAY');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [showOk, setShowOk] = useState(false);

  useEffect(() => {
    api<BlockType[]>('/block-types')
      .then((b) => {
        setBlocks(b);
        if (b[0]) setBlockTypeId(b[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function submit() {
    setError('');
    try {
      await api('/production', {
        method: 'POST',
        body: JSON.stringify({ blockTypeId, quantity: Number(quantity), shift, comment }),
      });
      setComment('');
      setShowOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Производство</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem>
            <IonSelect label="Тип блока" labelPlacement="stacked" value={blockTypeId} onIonChange={(e) => setBlockTypeId(e.detail.value)}>
              {blocks.map((b) => (
                <IonSelectOption key={b.id} value={b.id}>{b.name}</IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonInput
              type="number"
              label="Количество"
              labelPlacement="stacked"
              value={quantity}
              onIonInput={(e) => setQuantity(Number(e.detail.value || 0))}
            />
          </IonItem>
          <IonItem>
            <IonSelect label="Смена" labelPlacement="stacked" value={shift} onIonChange={(e) => setShift(e.detail.value)}>
              <IonSelectOption value="DAY">Дневная</IonSelectOption>
              <IonSelectOption value="NIGHT">Ночная</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonTextarea label="Комментарий" labelPlacement="stacked" value={comment} onIonInput={(e) => setComment(String(e.detail.value || ''))} />
          </IonItem>
        </IonList>
        {error ? <IonText color="danger"><p>{error}</p></IonText> : null}
        <IonButton expand="block" onClick={submit}>Сохранить</IonButton>
        <IonToast isOpen={showOk} message="Производство сохранено" duration={2000} onDidDismiss={() => setShowOk(false)} />
      </IonContent>
    </IonPage>
  );
}

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
  IonTextarea,
  IonToast,
} from '@ionic/react';
import AppPage from '../components/AppPage';
import { api } from '../lib/api';

type BlockType = { id: string; name: string };
type Production = {
  id: string;
  quantity: number;
  shift: string;
  producedAt: string;
  comment?: string | null;
  blockType: { name: string };
};

export default function ProductionPage() {
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [items, setItems] = useState<Production[]>([]);
  const [blockTypeId, setBlockTypeId] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [shift, setShift] = useState('DAY');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [showOk, setShowOk] = useState(false);

  async function load() {
    const [b, p] = await Promise.all([
      api<BlockType[]>('/block-types'),
      api<Production[]>('/production'),
    ]);
    setBlocks(b);
    setItems(p);
    if (!blockTypeId && b[0]) setBlockTypeId(b[0].id);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
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
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  const total = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <AppPage title="Производство">
      <IonList>
        <IonItem>
          <IonSelect label="Тип блока" labelPlacement="stacked" value={blockTypeId} onIonChange={(e) => setBlockTypeId(e.detail.value)}>
            {blocks.map((b) => (
              <IonSelectOption key={b.id} value={b.id}>{b.name}</IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
        <IonItem>
          <IonInput type="number" label="Количество" labelPlacement="stacked" value={quantity} onIonInput={(e) => setQuantity(Number(e.detail.value || 0))} />
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
      <IonButton expand="block" className="ion-margin-top" onClick={submit}>Сохранить</IonButton>

      <h3 className="ion-padding-top ion-padding-horizontal">
        История · всего {total.toLocaleString('ru-RU')}
      </h3>
      <IonList>
        {items.map((p) => (
          <IonItem key={p.id}>
            <IonLabel>
              <h2>{p.blockType.name} × {p.quantity}</h2>
              <p>
                {p.shift === 'NIGHT' ? 'Ночная' : 'Дневная'} ·{' '}
                {new Date(p.producedAt).toLocaleString('ru-RU', { timeZone: 'Asia/Dushanbe' })}
              </p>
              {p.comment ? <p>{p.comment}</p> : null}
            </IonLabel>
          </IonItem>
        ))}
        {items.length === 0 ? (
          <IonItem>
            <IonLabel>Записей пока нет</IonLabel>
          </IonItem>
        ) : null}
      </IonList>

      <IonToast isOpen={showOk} message="Производство сохранено, склад обновлен" duration={2000} onDidDismiss={() => setShowOk(false)} />
    </AppPage>
  );
}

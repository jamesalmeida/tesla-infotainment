import { APPS, SHELF_PLACEHOLDERS, type AppId } from '../../apps/registry';
import { useCarActions } from '../../state/CarStateContext';
import { getImagePath } from '../../utils/assetPaths';
import styles from './AppShelf.module.css';

const QUICK_CONTROLS = [
  { id: 'wipers', label: 'Wipers' },
  { id: 'defrost-front', label: 'Defrost Front' },
  { id: 'defrost-rear', label: 'Defrost Rear' },
  { id: 'left-seat', label: 'Left Seat' },
  { id: 'fan', label: 'Fan' },
];

const SHELF_APPS: AppId[] = [
  'bluetooth',
  'camera',
  'calendar',
  'dashcam',
  'podcasts',
  'apple-music',
  'theater',
  'toybox',
  'arcade',
];

function ShelfIcon({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <button type="button" className={styles.appShelfIcon} onClick={onPress}>
      <img src={getImagePath(icon)} alt={`${label} icon`} />
      <div className={styles.appShelfIconText}>{label}</div>
    </button>
  );
}

export function AppShelf() {
  const { toggleApp, closeModal, showNotice } = useCarActions();

  const launch = (app: AppId) => {
    closeModal();
    toggleApp(app);
  };

  const comingSoon = (label: string) => {
    closeModal();
    showNotice(`${label} isn't available yet`);
  };

  return (
    <div className={styles.appShelfContainer}>
      <div className={styles.appTopShelf}>
        {QUICK_CONTROLS.map(({ id, label }) => (
          <ShelfIcon
            key={id}
            icon={`app-${id}.svg`}
            label={label}
            onPress={() => comingSoon(label)}
          />
        ))}
      </div>
      <div className={styles.appShelf}>
        {SHELF_APPS.map((app) => (
          <ShelfIcon
            key={app}
            icon={APPS[app].icon}
            label={APPS[app].label}
            onPress={() => launch(app)}
          />
        ))}
        {SHELF_PLACEHOLDERS.map(({ id, label }) => (
          <ShelfIcon
            key={id}
            icon={`app-${id}.svg`}
            label={label}
            onPress={() => comingSoon(label)}
          />
        ))}
      </div>
    </div>
  );
}

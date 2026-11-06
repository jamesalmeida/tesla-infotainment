import { DOCK, APPS, type AppId } from '../../apps/registry';
import TemperatureControl from '../TemperatureControl/TemperatureControl';
import VolumeControl from '../VolumeControl/VolumeControl';
import { getImagePath } from '../../utils/assetPaths';
import { useCar, useCarActions } from '../../state/CarStateContext';
import { activeApp, isCameraForced } from '../../state/carState';
import styles from './BtmNavBar.module.css';

function DockIcon({ app }: { app: AppId }) {
  const isActive = useCar((state) => activeApp(state) === app);
  const isDisabled = useCar(isCameraForced);
  const { toggleApp } = useCarActions();

  return (
    <button
      type="button"
      className={`navIconWrapper ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
      disabled={isDisabled}
      aria-pressed={isActive}
      onClick={() => toggleApp(app)}
    >
      <img className={`navIcons ${app}`} src={getImagePath(APPS[app].icon)} alt={`${app} icon`} />
    </button>
  );
}

function ShelfButton() {
  const isOpen = useCar((state) => state.activeModal === 'app-shelf');
  const { toggleModal } = useCarActions();

  return (
    <button
      type="button"
      className="navIconWrapper"
      aria-expanded={isOpen}
      onClick={() => toggleModal('app-shelf')}
    >
      <img
        className="icon"
        src={getImagePath(isOpen ? 'icon-close-shelf.svg' : 'icon-open-shelf.svg')}
        alt={isOpen ? 'Close Menu' : 'Open Menu'}
      />
    </button>
  );
}

function ClimateControl() {
  const temperature = useCar((state) => state.temperature);
  const { stepTemperature } = useCarActions();

  return (
    <TemperatureControl
      temperature={temperature}
      onIncrement={() => stepTemperature(1)}
      onDecrement={() => stepTemperature(-1)}
    />
  );
}

function AudioControl() {
  const volume = useCar((state) => state.volume);
  const { setVolume, toggleApp } = useCarActions();

  return (
    <VolumeControl
      volume={volume}
      onVolumeChange={setVolume}
      onOpenAudioSettings={() => toggleApp('car-settings')}
    />
  );
}

const BtmNavBar = () => {
  const { toggleApp } = useCarActions();

  return (
    <div className={styles.btmNavBar}>
      <div className={`${styles.btmNavItems} no-select`}>
        <div className={styles['car-settings']}>
          <button
            type="button"
            className="navIconWrapper"
            onClick={() => toggleApp('car-settings')}
          >
            <img
              className="navIcons"
              src={getImagePath(APPS['car-settings'].icon)}
              alt="car settings icon"
            />
          </button>
        </div>
        <ClimateControl />
        <div className={styles.dockApps}>
          {DOCK.map((item) =>
            item === 'open-shelf' ? <ShelfButton key={item} /> : <DockIcon key={item} app={item} />,
          )}
        </div>
        <AudioControl />
      </div>
    </div>
  );
};

export default BtmNavBar;

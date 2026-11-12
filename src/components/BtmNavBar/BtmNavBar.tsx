import { APPS, type AppId } from '../../apps/registry';
import TemperatureControl from '../TemperatureControl/TemperatureControl';
import VolumeControl from '../VolumeControl/VolumeControl';
import { getImagePath } from '../../utils/assetPaths';
import { useCar, useCarActions } from '../../state/CarStateContext';
import { activeApp, dockOrder, isCameraForced, type TemperatureZone } from '../../state/carState';
import { SeatButton } from './SeatButton';
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

function ClimateControl({ zone }: { zone: TemperatureZone }) {
  const temperature = useCar((state) =>
    zone === 'driver' ? state.climate.driverTemp : state.climate.passengerTemp,
  );
  const isSplit = useCar((state) => state.climate.isSplit);
  const isClimateOn = useCar((state) => state.climate.cabin.isOn);
  const isPanelOpen = useCar((state) => state.activeModal === 'climate');
  const { stepTemperature, toggleModal } = useCarActions();

  return (
    <TemperatureControl
      temperature={temperature}
      zone={isSplit ? zone : undefined}
      isClimateOn={isClimateOn}
      isPanelOpen={isPanelOpen}
      onOpenPanel={() => toggleModal('climate')}
      onIncrement={() => stepTemperature(zone, 1)}
      onDecrement={() => stepTemperature(zone, -1)}
    />
  );
}

function AudioControl() {
  const volume = useCar((state) => state.volume);
  const { setVolume, openSettings } = useCarActions();

  return (
    <VolumeControl
      volume={volume}
      onVolumeChange={setVolume}
      onOpenAudioSettings={() => openSettings('Audio')}
    />
  );
}

const BtmNavBar = () => {
  const isSplit = useCar((state) => state.climate.isSplit);
  const dock = useCar(dockOrder);
  const { toggleApp } = useCarActions();

  return (
    <div className={styles.btmNavBar}>
      <div className={`${styles.btmNavItems} no-select`} data-split={isSplit}>
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
        <div className={styles.climateGroup} data-group="driver">
          <ClimateControl zone="driver" />
          <SeatButton seat="driver" side="left" />
        </div>
        <div className={styles.dockApps}>
          {dock.map((item) =>
            item === 'open-shelf' ? <ShelfButton key={item} /> : <DockIcon key={item} app={item} />,
          )}
        </div>
        {isSplit ? (
          <div className={styles.climateGroup} data-group="passenger">
            <SeatButton seat="passenger" side="right" />
            <ClimateControl zone="passenger" />
          </div>
        ) : null}
        <div className={styles.climateGroup} data-group="audio">
          {!isSplit && <SeatButton seat="passenger" side="right" />}
          <AudioControl />
        </div>
      </div>
    </div>
  );
};

export default BtmNavBar;

import type { ReactNode } from 'react';
import { APPS, SHELF_PLACEHOLDERS, type AppId } from '../../apps/registry';
import { SeatLevel } from '../Climate/SeatLevel';
import { useCar, useCarActions } from '../../state/CarStateContext';
import type { SeatId, Wipers } from '../../state/carState';
import { isFrontDefrostOn, nextFanSpeed, seatHeatLabel } from '../../state/climate';
import { getImagePath } from '../../utils/assetPaths';
import styles from './AppShelf.module.css';

const WIPER_CYCLE: { value: Wipers; label: string }[] = [
  { value: { mode: 'off' }, label: 'Off' },
  { value: { mode: 'auto' }, label: 'Auto' },
  { value: { mode: 'manual', speed: 1 }, label: 'Speed 1' },
  { value: { mode: 'manual', speed: 2 }, label: 'Speed 2' },
  { value: { mode: 'manual', speed: 3 }, label: 'Speed 3' },
  { value: { mode: 'manual', speed: 4 }, label: 'Speed 4' },
];

const wiperIndex = (wipers: Wipers) =>
  WIPER_CYCLE.findIndex(({ value }) => JSON.stringify(value) === JSON.stringify(wipers));

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

// Quick controls act in place, so the shelf stays open to show what changed.
function QuickControl({
  icon,
  label,
  status,
  isActive,
  onPress,
  children,
}: {
  icon: string;
  label: string;
  status: string;
  isActive: boolean;
  onPress: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.appShelfIcon}
      data-active={isActive}
      aria-label={`${label}: ${status}`}
      onClick={onPress}
    >
      <img src={getImagePath(icon)} alt="" />
      {children}
      <div className={styles.appShelfIconText}>{label}</div>
      <div className={styles.quickStatus}>{status}</div>
    </button>
  );
}

function WipersControl() {
  const index = useCar((state) => wiperIndex(state.settings.wipers));
  const { setSettings } = useCarActions();

  return (
    <QuickControl
      icon="app-wipers.svg"
      label="Wipers"
      status={WIPER_CYCLE[index].label}
      isActive={index > 0}
      onPress={() => setSettings({ wipers: WIPER_CYCLE[(index + 1) % WIPER_CYCLE.length].value })}
    />
  );
}

function DefrostControls() {
  const front = useCar((state) => isFrontDefrostOn(state.climate));
  const rear = useCar((state) => state.climate.rearDefrost);
  const { toggleDefrost } = useCarActions();

  return (
    <>
      <QuickControl
        icon="app-defrost-front.svg"
        label="Defrost Front"
        status={front ? 'On' : 'Off'}
        isActive={front}
        onPress={() => toggleDefrost('front')}
      />
      <QuickControl
        icon="app-defrost-rear.svg"
        label="Defrost Rear"
        status={rear ? 'On' : 'Off'}
        isActive={rear}
        onPress={() => toggleDefrost('rear')}
      />
    </>
  );
}

function SeatControl({ seat, icon, label }: { seat: SeatId; icon: string; label: string }) {
  const heat = useCar((state) => state.climate.seats[seat]);
  const { cycleSeat } = useCarActions();

  return (
    <QuickControl
      icon={icon}
      label={label}
      status={seatHeatLabel(heat)}
      isActive={heat !== 0}
      onPress={() => cycleSeat(seat, 'heat')}
    >
      <SeatLevel heat={heat} />
    </QuickControl>
  );
}

function FanControl() {
  const cabin = useCar((state) => state.climate.cabin);
  const { setCabin } = useCarActions();

  return (
    <QuickControl
      icon="app-fan.svg"
      label="Fan"
      status={cabin.isOn ? `Speed ${cabin.fanSpeed}` : 'Off'}
      isActive={cabin.isOn}
      onPress={() => setCabin({ fanSpeed: nextFanSpeed(cabin) })}
    />
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
        <WipersControl />
        <DefrostControls />
        <SeatControl seat="driver" icon="app-left-seat.svg" label="Left Seat" />
        <SeatControl seat="passenger" icon="app-right-seat.svg" label="Right Seat" />
        <FanControl />
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

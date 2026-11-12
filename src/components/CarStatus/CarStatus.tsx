import { useCar, useCarActions } from '../../state/CarStateContext';
import { useBlink } from '../../hooks/useBlink';
import { isDriving, leftSignalLit, rightSignalLit, SPEED_LIMIT_MPH } from '../../state/carState';
import { getImagePath } from '../../utils/assetPaths';
import { formatSpeed, speedUnit } from '../../utils/units';
import BatteryStatus from '../BatteryStatus/BatteryStatus';
import GearSelect from '../GearSelect/GearSelect';
import { PedalButton } from '../PedalDeck/PedalDeck';
import { Telltales } from './Telltales';
import { SelfDrivingCorner } from '../SelfDriving/SelfDrivingButton';

function TurnSignal({
  side,
  isLit,
  isBlinkOn,
  onPress,
}: {
  side: 'left' | 'right';
  isLit: boolean;
  isBlinkOn: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      className={`turnSignal ${isLit ? 'active' : ''} ${isLit && isBlinkOn ? 'lit' : ''}`}
      aria-pressed={isLit}
      onClick={onPress}
    >
      <img src={getImagePath(`icon-turn-${side}.svg`)} alt={`Turn Signal ${side}`} />
    </button>
  );
}

function TurnSignals() {
  const leftLit = useCar(leftSignalLit);
  const rightLit = useCar(rightSignalLit);
  const { toggleLeftSignal, toggleRightSignal } = useCarActions();
  const isBlinkOn = useBlink(leftLit || rightLit);

  return (
    <>
      <TurnSignal side="left" isLit={leftLit} isBlinkOn={isBlinkOn} onPress={toggleLeftSignal} />
      <TurnSignal side="right" isLit={rightLit} isBlinkOn={isBlinkOn} onPress={toggleRightSignal} />
    </>
  );
}

function HazardButton() {
  const hazards = useCar((state) => state.hazards);
  const { toggleHazards } = useCarActions();

  return (
    <button
      type="button"
      className={`hazardBtn ${hazards ? 'active' : ''}`}
      aria-label="Hazard lights"
      aria-pressed={hazards}
      onClick={toggleHazards}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 22 20H2Z" />
        <path d="M12 9.5 16.5 17.5H7.5Z" />
      </svg>
    </button>
  );
}

function Speedometer() {
  const driving = useCar(isDriving);
  const speed = useCar((state) => state.speed);
  const preferences = useCar((state) => state.settings.preferences);

  return (
    <div className={`speedometer ${driving ? 'fade-in' : 'fade-out'}`}>
      {formatSpeed(speed, preferences)}
      <br />
      <span>{speedUnit(preferences).toUpperCase()}</span>
    </div>
  );
}

// Small, in the column under the speed, where the car shows it.
function SpeedLimit() {
  const preferences = useCar((state) => state.settings.preferences);

  return (
    <div
      className="speedLimit"
      role="img"
      aria-label={`Speed limit ${formatSpeed(SPEED_LIMIT_MPH, preferences)}`}
    >
      SPEED
      <br />
      LIMIT
      <br />
      <span>{formatSpeed(SPEED_LIMIT_MPH, preferences)}</span>
    </div>
  );
}

// Stands in for the stalk on a touch screen, which has no keyboard shortcut to signal with.
function SignalButton({ side }: { side: 'left' | 'right' }) {
  const on = useCar((state) => state.signal === side);
  const { toggleLeftSignal, toggleRightSignal } = useCarActions();

  return (
    <button
      type="button"
      className="pedalBtn signalBtn"
      aria-label={side === 'left' ? 'Left turn signal' : 'Right turn signal'}
      aria-pressed={on}
      onClick={side === 'left' ? toggleLeftSignal : toggleRightSignal}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={side === 'left' ? 'M2 12 11 4v5h11v6H11v5Z' : 'M22 12 13 4v5H2v6h11v5Z'} />
      </svg>
    </button>
  );
}

// Phones and tablets have no room under the screen, so their pedals sit on it.
export function Pedals() {
  return (
    <div className="pedals">
      <SignalButton side="left" />
      <SignalButton side="right" />
      <PedalButton className="pedalBtn" pedal="brake" label="Brake" hint="↓" />
      <PedalButton className="pedalBtn" pedal="accelerate" label="Go" hint="↑" />
    </div>
  );
}

export function CarStatus() {
  const driving = useCar(isDriving);

  return (
    <div className={`carStatusIcons ${driving ? 'drivingIndicators' : ''}`}>
      <div className="topBarCarStatusIcons">
        <GearSelect />
        <BatteryStatus />
      </div>
      <div className="drivingGearIcons">
        <Speedometer />
        <TurnSignals />
      </div>
      {/* The column down the left: in Drive, the speed limit first. */}
      <Telltales leading={driving ? <SpeedLimit /> : null} trailing={<HazardButton />} />
      {/* Start and stop stay in one place, top right, in Park and in Drive, with the mode under. */}
      <SelfDrivingCorner driving={driving} />
    </div>
  );
}

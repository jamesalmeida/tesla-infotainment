import { useCar, useCarActions } from '../../state/CarStateContext';
import { useBlink } from '../../hooks/useBlink';
import {
  isDriving,
  leftSignalLit,
  rightSignalLit,
  SPEED_LIMIT_MPH,
  type Pedal,
} from '../../state/carState';
import { getImagePath } from '../../utils/assetPaths';
import { formatSpeed, speedUnit } from '../../utils/units';
import BatteryStatus from '../BatteryStatus/BatteryStatus';
import GearSelect from '../GearSelect/GearSelect';
import { Telltales } from './Telltales';

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

function SpeedLimit() {
  const driving = useCar(isDriving);
  const preferences = useCar((state) => state.settings.preferences);

  return (
    <div className={`speedLimit ${driving ? 'fade-in' : 'fade-out'}`}>
      SPEED
      <br />
      LIMIT
      <br />
      <span>{formatSpeed(SPEED_LIMIT_MPH, preferences)}</span>
    </div>
  );
}

function PedalButton({ pedal, label }: { pedal: Pedal; label: string }) {
  const { setPedal } = useCarActions();
  const release = () => setPedal('none');

  return (
    <button
      type="button"
      className="pedalBtn"
      onPointerDown={() => setPedal(pedal)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      {label}
    </button>
  );
}

// Held like real pedals. Keyboard users get the same from the up and down arrows.
function Pedals() {
  const canDrive = useCar((state) => state.gear === 'D' || state.gear === 'R');
  if (!canDrive) return null;

  return (
    <div className="pedals">
      <PedalButton pedal="brake" label="Brake" />
      <PedalButton pedal="accelerate" label="Go" />
    </div>
  );
}

export function CarStatus() {
  return (
    <div className="carStatusIcons">
      <div className="topBarCarStatusIcons">
        <GearSelect />
        <HazardButton />
        <BatteryStatus />
      </div>
      <div className="drivingGearIcons">
        <Speedometer />
        <TurnSignals />
        <SpeedLimit />
      </div>
      <Telltales />
      <Pedals />
    </div>
  );
}

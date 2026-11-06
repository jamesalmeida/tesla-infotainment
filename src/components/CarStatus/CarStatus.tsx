import { useEffect, useState } from 'react';
import { useCar, useCarActions } from '../../state/CarStateContext';
import { isDriving, leftSignalLit, rightSignalLit } from '../../state/carState';
import { getImagePath } from '../../utils/assetPaths';
import BatteryStatus from '../BatteryStatus/BatteryStatus';
import GearSelect from '../GearSelect/GearSelect';

const BLINK_MS = 500;

// One clock for both arrows, so they can't drift apart when started at different times.
function useBlink(isActive: boolean) {
  const [isOn, setIsOn] = useState(true);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => setIsOn((on) => !on), BLINK_MS);
    return () => {
      clearInterval(timer);
      setIsOn(true);
    };
  }, [isActive]);

  return isOn;
}

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

  return (
    <div className={`speedometer ${driving ? 'fade-in' : 'fade-out'}`}>
      {Math.round(speed)}
      <br />
      <span>MPH</span>
    </div>
  );
}

function SpeedLimit() {
  const driving = useCar(isDriving);

  return (
    <div className={`speedLimit ${driving ? 'fade-in' : 'fade-out'}`}>
      SPEED
      <br />
      LIMIT
      <br />
      <span>30</span>
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
    </div>
  );
}

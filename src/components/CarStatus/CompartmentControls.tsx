import { useCar, useCarActions } from '../../state/CarStateContext';
import { isDriving } from '../../state/carState';
import CarLock from '../CarLock/CarLock';

export function CompartmentControls() {
  const driving = useCar(isDriving);
  const openCompartment = useCar((state) => state.openCompartment);
  const { toggleCompartment } = useCarActions();

  return (
    <div className={`carModelStatus ${driving ? 'fade-out' : 'fade-in'}`}>
      <button
        type="button"
        className="toggleFrunk no-select"
        onClick={() => toggleCompartment('frunk')}
      >
        {openCompartment === 'frunk' ? 'Close' : 'Open'}
        <br />
        <span className="frunk">Frunk</span>
      </button>
      <div className="toggleLocks">
        <CarLock />
      </div>
      <button
        type="button"
        className="toggleTrunk no-select"
        onClick={() => toggleCompartment('trunk')}
      >
        {openCompartment === 'trunk' ? 'Close' : 'Open'}
        <br />
        <span className="trunk">Trunk</span>
      </button>
    </div>
  );
}

import { useCar } from '../../state/CarStateContext';
import { isRestarting } from '../../state/carState';
import LoadingScreen from '../LoadingScreen/LoadingScreen';

// A restart replays the boot screen, after a software update or from Service.
export function RestartOverlay() {
  const restarting = useCar(isRestarting);
  return restarting ? <LoadingScreen /> : null;
}

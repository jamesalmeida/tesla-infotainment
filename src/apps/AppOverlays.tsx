import { UpcomingCard } from '../components/Apps/Calendar/UpcomingCard';
import { useEnergySampler } from './energyHistory';

// What apps need to keep doing, or to show, while their own screen is closed.
export function AppOverlays() {
  useEnergySampler();

  return <UpcomingCard />;
}

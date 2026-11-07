import type { ReactNode } from 'react';
import { useCar } from '../../../../state/CarStateContext';
import { isValet } from '../../../../state/carState';
import { Section } from './SystemPanel';

// Valet Mode hides personal data. This wraps whatever a valet shouldn't see.
export function ValetHidden({ what, children }: { what: string; children: ReactNode }) {
  const hidden = useCar(isValet);
  if (!hidden) return <>{children}</>;

  return <Section title="Hidden in Valet Mode" hint={`${what} comes back when Valet Mode ends.`} />;
}

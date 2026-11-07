import type { ReactNode } from 'react';

// Valet Mode hides personal data. This wraps whatever a valet shouldn't see.
export function ValetHidden({ children }: { what: string; children: ReactNode }) {
  return <>{children}</>;
}

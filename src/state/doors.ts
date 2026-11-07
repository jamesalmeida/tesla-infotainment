// Door state belongs to the car, not to the 3D model. The model reads it and asks the store
// to change it, so a door can't disagree with anything else that shows it.

export type DoorId = 'lf' | 'lr' | 'rf' | 'rr';

export type DoorStates = Record<DoorId, boolean>;

export const DOOR_IDS: readonly DoorId[] = ['lf', 'lr', 'rf', 'rr'];

export const CLOSED_DOORS: DoorStates = { lf: false, lr: false, rf: false, rr: false };

export const DOOR_LABELS: Record<DoorId, string> = {
  lf: 'Front left door',
  lr: 'Rear left door',
  rf: 'Front right door',
  rr: 'Rear right door',
};

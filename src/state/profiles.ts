import { getImagePath } from '../utils/assetPaths';
import type { DisplaySettings, VehicleSettings } from './carState';

// Each runs 0-100, from the car's own travel limits rather than any real measurement.
export interface CabinPosition {
  seatPosition: number;
  seatHeight: number;
  seatRecline: number;
  mirrorTilt: number;
  mirrorPan: number;
  steeringTilt: number;
  steeringReach: number;
}

// The preferences a driver takes with them. Everything else belongs to the car.
export const PROFILE_SETTING_KEYS = [
  'easyEntry',
  'acceleration',
  'mapUnits',
  'navVolume',
  'avoidTolls',
  'avoidFerries',
  'eqBass',
  'eqMid',
  'eqTreble',
  'audioBalance',
  'audioFade',
  'immersiveSound',
] as const satisfies readonly (keyof VehicleSettings)[];

export type ProfileSettings = Pick<VehicleSettings, (typeof PROFILE_SETTING_KEYS)[number]>;

export interface ProfileSnapshot {
  cabin: CabinPosition;
  temperature: number;
  volume: number;
  display: DisplaySettings;
  settings: ProfileSettings;
}

export interface Profile {
  id: number;
  name: string;
  image: string;
  // What this driver left the car like. Null until they have driven it.
  saved: ProfileSnapshot | null;
}

// Always in the list, and never renamed or deleted: choosing it means entering Valet Mode.
export const VALET_PROFILE_ID = 4;

export const MAX_PROFILES = 8;

// The owner's own driver profile has their photo; everyone else gets the default icon.
const OWNER_PROFILE_ID = 1;

export const profileImage = (id: number): string => {
  if (id === VALET_PROFILE_ID) return getImagePath('icon-valet.svg');
  if (id === OWNER_PROFILE_ID) return getImagePath('profile01.svg');
  return getImagePath('icon-profile-default.svg');
};

const defaultProfile = (id: number, name: string): Profile => ({
  id,
  name,
  image: profileImage(id),
  saved: null,
});

export const DEFAULT_PROFILES: Profile[] = [
  defaultProfile(OWNER_PROFILE_ID, 'James'),
  defaultProfile(2, 'Lauren'),
  defaultProfile(3, 'Guest'),
  defaultProfile(VALET_PROFILE_ID, 'Valet'),
];

// For a week the defaults were renamed. A visit saved then keeps any name someone typed, but
// the two untouched placeholders come back as the real names.
const RENAMED_DEFAULTS: Record<number, [placeholder: string, name: string]> = {
  1: ['Alex', 'James'],
  2: ['Sam', 'Lauren'],
};

export const restoreDefaultName = (id: number, name: string): string => {
  const renamed = RENAMED_DEFAULTS[id];
  return renamed && renamed[0] === name ? renamed[1] : name;
};

export const isDriverProfile = (profile: Profile): boolean => profile.id !== VALET_PROFILE_ID;

export const findProfile = (profiles: Profile[], id: number): Profile =>
  profiles.find((profile) => profile.id === id) ?? profiles[0];

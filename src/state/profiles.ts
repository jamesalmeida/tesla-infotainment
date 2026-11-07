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

export const profileImage = (id: number): string =>
  getImagePath(id === VALET_PROFILE_ID ? 'icon-valet.svg' : 'icon-profile-default.svg');

const defaultProfile = (id: number, name: string): Profile => ({
  id,
  name,
  image: profileImage(id),
  saved: null,
});

export const DEFAULT_PROFILES: Profile[] = [
  defaultProfile(1, 'Alex'),
  defaultProfile(2, 'Sam'),
  defaultProfile(3, 'Guest'),
  defaultProfile(VALET_PROFILE_ID, 'Valet'),
];

export const isDriverProfile = (profile: Profile): boolean => profile.id !== VALET_PROFILE_ID;

export const findProfile = (profiles: Profile[], id: number): Profile =>
  profiles.find((profile) => profile.id === id) ?? profiles[0];

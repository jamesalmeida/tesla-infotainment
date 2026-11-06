import { getImagePath } from '../utils/assetPaths';

export interface Profile {
  id: number;
  name: string;
  image: string;
}

export const PROFILES: Profile[] = [
  { id: 1, name: 'Alex', image: getImagePath('icon-profile-default.svg') },
  { id: 2, name: 'Sam', image: getImagePath('icon-profile-default.svg') },
  { id: 3, name: 'Guest', image: getImagePath('icon-profile-default.svg') },
  { id: 4, name: 'Valet', image: getImagePath('icon-valet.svg') },
];

export const findProfile = (id: number): Profile =>
  PROFILES.find((profile) => profile.id === id) ?? PROFILES[0];

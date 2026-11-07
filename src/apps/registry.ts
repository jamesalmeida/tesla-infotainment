import type { ComponentType } from 'react';

export interface AppDefinition {
  label: string;
  // File in public/img, used by the dock and the shelf.
  icon: string;
  load: () => Promise<{ default: ComponentType }>;
  // Real cars only allow these while in Park.
  parkedOnly?: boolean;
  // Stays open and pauses on leaving Park, rather than closing.
  pausesOutOfPark?: boolean;
}

const named =
  <M, K extends keyof M>(load: () => Promise<M>, name: K) =>
  () =>
    load().then((module) => ({ default: module[name] as ComponentType }));

// Every app that opens in the slide-up panel. Adding an app means adding one entry here;
// the AppId type, the panel, the dock and the shelf all read from this list.
export const APPS = {
  'apple-music': {
    label: 'Apple Music',
    icon: 'app-apple-music.svg',
    load: named(() => import('../components/Apps/AppleMusic/AppleMusic'), 'AppleMusic'),
  },
  arcade: {
    label: 'Arcade',
    icon: 'app-arcade.svg',
    load: named(() => import('../components/Apps/Arcade/Arcade'), 'Arcade'),
    parkedOnly: true,
    pausesOutOfPark: true,
  },
  bluetooth: {
    label: 'Bluetooth',
    icon: 'app-bluetooth.svg',
    load: named(() => import('../components/Apps/Bluetooth/Bluetooth'), 'Bluetooth'),
  },
  calendar: {
    label: 'Calendar',
    icon: 'app-calendar.svg',
    load: named(() => import('../components/Apps/Calendar/Calendar'), 'Calendar'),
  },
  camera: {
    label: 'Camera',
    icon: 'app-camera.svg',
    load: named(() => import('../components/Apps/BackupCam/BackupCam'), 'BackupCam'),
  },
  'car-settings': {
    label: 'Settings',
    icon: 'icon-car-settings.svg',
    load: named(() => import('../components/Apps/CarSettings/CarSettings'), 'CarSettings'),
  },
  dashcam: {
    label: 'Dashcam',
    icon: 'app-dashcam.svg',
    load: named(() => import('../components/Apps/Dashcam/Dashcam'), 'Dashcam'),
    parkedOnly: true,
  },
  podcasts: {
    label: 'Podcasts',
    icon: 'app-podcasts.svg',
    load: named(() => import('../components/Apps/Podcasts/Podcasts'), 'Podcasts'),
  },
  theater: {
    label: 'Theater',
    icon: 'app-theater.svg',
    load: named(() => import('../components/Apps/Theater/Theater'), 'Theater'),
    parkedOnly: true,
  },
  toybox: {
    label: 'Toybox',
    icon: 'app-toybox.svg',
    load: named(() => import('../components/Apps/Toybox/Toybox'), 'Toybox'),
  },
} satisfies Record<string, AppDefinition>;

export type AppId = keyof typeof APPS;

export const isAppId = (id: string): id is AppId => id in APPS;

export const isParkedOnly = (app: AppId): boolean =>
  (APPS[app] as AppDefinition).parkedOnly === true;

export const pausesOutOfPark = (app: AppId): boolean =>
  (APPS[app] as AppDefinition).pausesOutOfPark === true;

// Bottom bar, left to right. 'open-shelf' marks where the shelf button sits.
export const DOCK: (AppId | 'open-shelf')[] = [
  'camera',
  'arcade',
  'bluetooth',
  'apple-music',
  'dashcam',
  'open-shelf',
  'podcasts',
];

// Shelf entries with no app yet still show, so the shelf matches the real car.
export const SHELF_PLACEHOLDERS = [
  { id: 'amazon-music', label: 'Amazon Music' },
  { id: 'youtube-music', label: 'YouTube Music' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'browser', label: 'Browser' },
  { id: 'radio', label: 'Radio' },
  { id: 'energy', label: 'Energy' },
  { id: 'audible', label: 'Audible' },
  { id: 'nav', label: 'Nav' },
  { id: 'phone', label: 'Phone' },
  { id: 'messages', label: 'Messages' },
  { id: 'caraoke', label: 'Caraoke' },
  { id: 'manual', label: 'Manual' },
  { id: 'tidal', label: 'Tidal' },
];

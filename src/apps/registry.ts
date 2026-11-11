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
  // The colour the app paints, so the panel's grab bar above it matches. Defaults to the
  // standard app background.
  surface?: string;
}

const named =
  <M, K extends keyof M>(load: () => Promise<M>, name: K) =>
  () =>
    load().then((module) => ({ default: module[name] as ComponentType }));

const loadMusicPlaceholder = named(
  () => import('../components/Apps/Radio/StreamingPlaceholder'),
  'MusicStreamingPlaceholder',
);

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
    surface: 'var(--color-settings-bg)',
  },
  browser: {
    label: 'Browser',
    icon: 'app-browser.svg',
    load: named(() => import('../components/Apps/Browser/Browser'), 'Browser'),
  },
  calendar: {
    label: 'Calendar',
    icon: 'app-calendar.svg',
    load: named(() => import('../components/Apps/Calendar/Calendar'), 'Calendar'),
  },
  camera: {
    label: 'Camera',
    icon: 'app-camera.svg',
    load: named(() => import('../components/Apps/Camera/Camera'), 'Camera'),
  },
  caraoke: {
    label: 'Caraoke',
    icon: 'app-caraoke.svg',
    load: named(() => import('../components/Apps/Caraoke/Caraoke'), 'Caraoke'),
    parkedOnly: true,
  },
  'car-settings': {
    label: 'Settings',
    icon: 'icon-car-settings.svg',
    load: named(() => import('../components/Apps/CarSettings/CarSettings'), 'CarSettings'),
    surface: 'var(--color-settings-bg)',
  },
  dashcam: {
    label: 'Dashcam',
    icon: 'app-dashcam.svg',
    load: named(() => import('../components/Apps/Dashcam/Dashcam'), 'Dashcam'),
    parkedOnly: true,
  },
  energy: {
    label: 'Energy',
    icon: 'app-energy.svg',
    load: named(() => import('../components/Apps/Energy/Energy'), 'Energy'),
  },
  manual: {
    label: 'Manual',
    icon: 'app-manual.svg',
    load: named(() => import('../components/Apps/Manual/Manual'), 'Manual'),
  },
  messages: {
    label: 'Messages',
    icon: 'app-messages.svg',
    load: named(() => import('../components/Apps/Messages/Messages'), 'Messages'),
  },
  phone: {
    label: 'Phone',
    icon: 'app-phone.svg',
    load: named(() => import('../components/Apps/Phone/Phone'), 'Phone'),
  },
  podcasts: {
    label: 'Podcasts',
    icon: 'app-podcasts.svg',
    load: named(() => import('../components/Apps/Podcasts/Podcasts'), 'Podcasts'),
  },
  radio: {
    label: 'Radio',
    icon: 'app-radio.svg',
    load: named(() => import('../components/Apps/Radio/Radio'), 'Radio'),
  },
  spotify: {
    label: 'Spotify',
    icon: 'app-spotify.svg',
    load: loadMusicPlaceholder,
  },
  tidal: {
    label: 'Tidal',
    icon: 'app-tidal.svg',
    load: loadMusicPlaceholder,
  },
  'youtube-music': {
    label: 'YouTube Music',
    icon: 'app-youtube-music.svg',
    load: loadMusicPlaceholder,
  },
  'amazon-music': {
    label: 'Amazon Music',
    icon: 'app-amazon-music.svg',
    load: loadMusicPlaceholder,
  },
  audible: {
    label: 'Audible',
    icon: 'app-audible.svg',
    load: named(
      () => import('../components/Apps/Radio/StreamingPlaceholder'),
      'AudiobooksPlaceholder',
    ),
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
export const SHELF_PLACEHOLDERS = [{ id: 'nav', label: 'Nav' }];

// What the slide-up panel paints behind an app, including the strip with the grab bar.
export const appSurface = (app: AppId): string =>
  (APPS[app] as AppDefinition).surface ?? 'var(--color-bg)';

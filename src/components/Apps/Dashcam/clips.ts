import { safeStorage } from '../../../utils/safeStorage';

export const CAMERAS = ['front', 'rear', 'left', 'right'] as const;
export type Camera = (typeof CAMERAS)[number];

export const CAMERA_LABEL: Record<Camera, string> = {
  front: 'Front',
  rear: 'Rear',
  left: 'Left',
  right: 'Right',
};

export type ClipFolder = 'recent' | 'saved' | 'sentry';

export type ClipScene = 'city' | 'highway' | 'night' | 'parked';

export interface Clip {
  id: string;
  folder: ClipFolder;
  title: string;
  // Milliseconds since the epoch, when recording started.
  time: number;
  durationSeconds: number;
  scene: ClipScene;
}

// Which sample clips the driver has changed. Clips are generated, so this is all there is to keep.
export interface ClipChanges {
  saved: string[];
  deleted: string[];
}

const STORAGE_KEY = 'tesla-dashcam-clips';
const HOUR_MS = 3600 * 1000;
// Recent clips are overwritten after a day unless saved.
export const RECENT_RETENTION_MS = 24 * HOUR_MS;

const SCENE_SPEED: Record<ClipScene, number> = { city: 28, highway: 68, night: 42, parked: 0 };

export const sceneSpeed = (scene: ClipScene): number => SCENE_SPEED[scene];

// Generated relative to now, so the demo always has clips inside the retention window.
export function sampleClips(now: number): Clip[] {
  const clip = (
    id: string,
    folder: ClipFolder,
    title: string,
    hoursAgo: number,
    durationSeconds: number,
    scene: ClipScene,
  ): Clip => ({ id, folder, title, time: now - hoursAgo * HOUR_MS, durationSeconds, scene });

  return [
    clip('recent-commute', 'recent', 'Morning commute', 1.5, 45, 'city'),
    clip('recent-freeway', 'recent', 'Freeway merge', 5, 60, 'highway'),
    clip('recent-evening', 'recent', 'Evening drive', 20, 30, 'night'),
    clip('saved-trip', 'saved', 'Coast road', 72, 60, 'highway'),
    clip('sentry-motion', 'sentry', 'Motion near the car', 9, 30, 'parked'),
    clip('sentry-door', 'sentry', 'Someone walked past', 30, 20, 'parked'),
  ];
}

const folderFor = (clip: Clip, changes: ClipChanges): ClipFolder =>
  changes.saved.includes(clip.id) ? 'saved' : clip.folder;

// Applies what the driver did, and drops Recent clips past their retention.
export function visibleClips(clips: Clip[], changes: ClipChanges, now: number): Clip[] {
  return clips
    .filter((clip) => !changes.deleted.includes(clip.id))
    .map((clip) => ({ ...clip, folder: folderFor(clip, changes) }))
    .filter((clip) => clip.folder !== 'recent' || now - clip.time <= RECENT_RETENTION_MS)
    .sort((a, b) => b.time - a.time);
}

export const saveClip = (changes: ClipChanges, id: string): ClipChanges => ({
  ...changes,
  saved: [...new Set([...changes.saved, id])],
});

export const deleteClip = (changes: ClipChanges, id: string): ClipChanges => ({
  saved: changes.saved.filter((saved) => saved !== id),
  deleted: [...new Set([...changes.deleted, id])],
});

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export function parseChanges(raw: string | null): ClipChanges {
  const empty = { saved: [], deleted: [] };
  try {
    const parsed = JSON.parse(raw ?? 'null') as Partial<ClipChanges> | null;
    if (!parsed || !isStringList(parsed.saved) || !isStringList(parsed.deleted)) return empty;
    return { saved: parsed.saved, deleted: parsed.deleted };
  } catch {
    return empty;
  }
}

export const loadChanges = (): ClipChanges => parseChanges(safeStorage.getItem(STORAGE_KEY));

export const saveChanges = (changes: ClipChanges) =>
  safeStorage.setItem(STORAGE_KEY, JSON.stringify(changes));

export const formatClipTime = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export const formatClipDate = (time: number): string =>
  new Date(time).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

// The clock burned into the footage, advancing with playback.
export const stampAt = (clip: Clip, seconds: number): string =>
  new Date(clip.time + seconds * 1000).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

export const groupByDay = (clips: Clip[]): [string, Clip[]][] => {
  const days = new Map<string, Clip[]>();
  clips.forEach((clip) => {
    const day = new Date(clip.time).toLocaleDateString([], {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    days.set(day, [...(days.get(day) ?? []), clip]);
  });
  return [...days];
};

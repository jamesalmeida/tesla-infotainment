export interface Video {
  id: string;
  title: string;
  note: string;
}

export interface PlaceholderSource {
  id: string;
  label: string;
}

// Open films from the Blender Foundation, released under Creative Commons licences.
export const VIDEOS: Video[] = [
  { id: 'aqz-KE-bpKQ', title: 'Big Buck Bunny', note: 'Open film, 10 min' },
  { id: 'eRsGyueVLvQ', title: 'Sintel', note: 'Open film, 15 min' },
  { id: 'R6MlUcmOul8', title: 'Tears of Steel', note: 'Open film, 12 min' },
  { id: 'WhWc3b3KhnY', title: 'Spring', note: 'Open film, 8 min' },
];

// Kinds of source rather than services: nothing here can log in, so nothing claims to.
export const PLACEHOLDER_SOURCES: PlaceholderSource[] = [
  { id: 'movies', label: 'Movies' },
  { id: 'series', label: 'Series' },
  { id: 'sports', label: 'Sports' },
  { id: 'kids', label: 'Kids' },
];

const ID_PATTERN = /^[\w-]{11}$/;

// Reads a video id from a pasted link or a bare id. Anything else is null.
export function parseVideoId(input: string): string | null {
  const text = input.trim();
  if (ID_PATTERN.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id =
      url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? null;
  }
  return id && ID_PATTERN.test(id) ? id : null;
}

export const PLAYER_TIMEOUT_MS = 10000;

// What YouTube's error codes mean, in words a driver can use.
export function playerErrorMessage(code: number): string {
  if (code === 100) return 'This video is private or has been removed.';
  if (code === 101 || code === 150) return "This video's owner doesn't allow it to play here.";
  return "This video can't be played.";
}

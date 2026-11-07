export interface Bookmark {
  label: string;
  url: string;
}

export type Destination =
  | { kind: 'frame'; url: string }
  | { kind: 'tab'; url: string }
  | { kind: 'refused'; reason: string };

// Checked by hand: these send no X-Frame-Options or frame-ancestors header, so they load here.
const FRAMEABLE_HOSTS = ['wikipedia.org', 'wikivoyage.org', 'gutenberg.org', 'example.com'];
// OpenStreetMap blocks framing on its site but offers this one page for embedding.
const FRAMEABLE_PATHS = ['www.openstreetmap.org/export/embed.html'];

export const BOOKMARKS: Bookmark[] = [
  { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Electric_vehicle' },
  { label: 'Wikivoyage', url: 'https://en.wikivoyage.org/wiki/San_Francisco' },
  {
    label: 'OpenStreetMap',
    url: 'https://www.openstreetmap.org/export/embed.html?bbox=-122.52,37.70,-122.35,37.83&layer=mapnik',
  },
  { label: 'Project Gutenberg', url: 'https://www.gutenberg.org/' },
  { label: 'NASA', url: 'https://www.nasa.gov/' },
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
  { label: 'This project', url: 'https://github.com/jamesalmeida/tesla-infotainment' },
];

const isFrameable = ({ hostname, pathname }: URL): boolean =>
  FRAMEABLE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`)) ||
  FRAMEABLE_PATHS.includes(`${hostname}${pathname}`);

export const searchUrl = (query: string): string =>
  `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

// A scheme, but not a port: "example.com:8080" has no scheme.
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:(?!\d)/i;
const LOOKS_LIKE_HOST = /^[^\s/]+\.[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;

// Decides what the address bar should do with what was typed.
export function resolveAddress(input: string): Destination | null {
  const text = input.trim();
  if (!text) return null;

  const isUrl = HAS_SCHEME.test(text);
  if (!isUrl && !LOOKS_LIKE_HOST.test(text)) return { kind: 'tab', url: searchUrl(text) };

  let url: URL;
  try {
    url = new URL(isUrl ? text : `https://${text}`);
  } catch {
    return { kind: 'refused', reason: "That address isn't valid." };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { kind: 'refused', reason: 'Only web addresses can be opened here.' };
  }
  if (!isFrameable(url)) return { kind: 'tab', url: url.href };

  // A secure page may not frame an insecure one.
  url.protocol = 'https:';
  return { kind: 'frame', url: url.href };
}

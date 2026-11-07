import type { AppId } from '../../../apps/registry';
import type { SettingsPanel } from '../../../state/carState';

export type ManualLink =
  | { label: string; app: AppId }
  | { label: string; settings: SettingsPanel }
  | { label: string; shortcuts: true };

export interface ManualTopic {
  id: string;
  section: string;
  title: string;
  // Each entry is one paragraph.
  body: string[];
  // Words a reader might search for that the text doesn't use.
  keywords?: string[];
  links?: ManualLink[];
}

// Written for this simulator, describing what it actually does. It is not the car's manual.
export const MANUAL_TOPICS: ManualTopic[] = [
  {
    id: 'about',
    section: 'Getting started',
    title: 'About this simulator',
    body: [
      'This is a browser simulation of an in-car touchscreen. Nothing here connects to a vehicle: the car, its battery, its contacts and its media are all simulated.',
      'The screen has the car on the left, the map on the right, and a dock of apps along the bottom. Apps slide up over the map. Drag the handle at the top of an app down to close it.',
    ],
    keywords: ['overview', 'introduction', 'help', 'demo'],
  },
  {
    id: 'apps',
    section: 'Getting started',
    title: 'Opening apps',
    body: [
      'Tap an icon on the dock to open an app, and tap it again to close it. The arrow on the dock opens the shelf, which holds every app in the simulator.',
      'Some apps only work in Park, as they do in a real car: Arcade, Theater, Dashcam and Caraoke. Shifting out of Park closes them and shows a message.',
    ],
    keywords: ['dock', 'shelf', 'launcher', 'park only', 'parked'],
  },
  {
    id: 'shortcuts',
    section: 'Getting started',
    title: 'Keyboard shortcuts',
    body: [
      'Almost everything has a key. Press P, R, N or D to change gear, Shift and the arrow keys for the turn signals, and Shift and H for the hazards. The full list is one tap away.',
    ],
    keywords: ['keys', 'keyboard', 'hotkeys'],
    links: [{ label: 'Show all shortcuts', shortcuts: true }],
  },
  {
    id: 'driving',
    section: 'Driving',
    title: 'Driving the simulated car',
    body: [
      'Choose a gear with the gear selector or its key. In D or R, hold the Up arrow to accelerate and the Down arrow to brake. Letting go slows the car with regenerative braking.',
      'The car refuses Park and Reverse above 5 mph, and refuses to leave Park while the charge cable is in.',
    ],
    keywords: ['gear', 'drive', 'reverse', 'neutral', 'accelerate', 'brake', 'pedal', 'speed'],
    links: [{ label: 'Open Dynamics settings', settings: 'Dynamics' }],
  },
  {
    id: 'reverse-camera',
    section: 'Driving',
    title: 'Backup camera',
    body: [
      'Shifting to R brings up the backup camera automatically and it stays until you leave Reverse. It uses your device camera if you allow it. You can also open it from the dock at any time.',
    ],
    keywords: ['rear view', 'parking', 'webcam'],
    links: [{ label: 'Open Camera', app: 'camera' }],
  },
  {
    id: 'closures',
    section: 'Car controls',
    title: 'Frunk, trunk and locks',
    body: [
      'Tap the labels on the 3D car to open the frunk or trunk, or press Shift and F or Shift and T. They only open in Park, and only one can be open at a time.',
      'The lock icon locks and unlocks the car. It can lock itself when you shift to Drive and unlock when you park.',
    ],
    keywords: ['front trunk', 'boot', 'hood', 'doors', 'unlock'],
    links: [{ label: 'Open Locks settings', settings: 'Locks' }],
  },
  {
    id: 'lights-wipers',
    section: 'Car controls',
    title: 'Lights, wipers and mirrors',
    body: [
      'The Controls settings hold the headlights, high beams, mirrors, wipers and window lock. Your choices are remembered between visits.',
    ],
    keywords: ['headlights', 'high beam', 'wiper', 'window', 'child lock'],
    links: [{ label: 'Open Controls', settings: 'Controls' }],
  },
  {
    id: 'display',
    section: 'Car controls',
    title: 'Display and brightness',
    body: [
      'Set the screen brightness, or let it follow automatically, from the Display settings. The layout adapts to the window, from a full display down to a phone.',
    ],
    keywords: ['screen', 'dark mode', 'theme', 'auto brightness'],
    links: [{ label: 'Open Display settings', settings: 'Display' }],
  },
  {
    id: 'charging',
    section: 'Energy',
    title: 'Charging',
    body: [
      'Charging is simulated and sped up, so a session takes a minute or two. It stops at the charge limit you set. The car must be in Park to plug in, and must be unplugged to drive.',
    ],
    keywords: ['battery', 'plug', 'charge limit', 'range', 'supercharger'],
    links: [{ label: 'Open Charging settings', settings: 'Charging' }],
  },
  {
    id: 'energy',
    section: 'Energy',
    title: 'Energy app',
    body: [
      'Energy records every drive in the background. Drive shows speed and battery over the last five minutes, Consumption shows Wh per mile and what used the energy, and Trip shows the current trip.',
      'You can add planned trips with a distance to see the charge you would arrive with at your current rate. Start one and its remaining miles follow the odometer.',
    ],
    keywords: ['consumption', 'wh/mi', 'efficiency', 'prediction', 'trip planner'],
    links: [{ label: 'Open Energy', app: 'energy' }],
  },
  {
    id: 'navigation',
    section: 'Map',
    title: 'Searching the map',
    body: [
      'Type in the Navigate box to search for a place, or press Shift and M to jump to it. Traffic and map styles are on the map controls. The map needs a Google Maps API key to work.',
      'Calendar events with a location have a Navigate button that fills in this search for you.',
    ],
    keywords: ['maps', 'directions', 'route', 'destination', 'traffic', 'gps'],
  },
  {
    id: 'calendar',
    section: 'Apps',
    title: 'Calendar',
    body: [
      'Calendar shows a day at a time, with sample events built around today. Import an .ics file to add your own. They stay in this browser and are never uploaded. Repeating events only show their first occurrence.',
      'When the car starts, the next event appears as an Upcoming card.',
    ],
    keywords: ['ics', 'schedule', 'events', 'appointment'],
    links: [{ label: 'Open Calendar', app: 'calendar' }],
  },
  {
    id: 'phone',
    section: 'Apps',
    title: 'Phone and Messages',
    body: [
      'Phone and Messages are mock apps with invented contacts. They never place a call or send a message. You can dial, browse recents, and try the incoming call banner, and Messages can read a message aloud.',
    ],
    keywords: ['call', 'contacts', 'dial', 'sms', 'text', 'bluetooth', 'read aloud'],
  },
  {
    id: 'dashcam',
    section: 'Apps',
    title: 'Dashcam viewer',
    body: [
      'Browse Recent, Saved and Sentry clips, watch all four camera angles and scrub through them. Save a recent clip to keep it, or delete it. The clips are drawn by the simulator rather than recorded.',
    ],
    keywords: ['sentry', 'recording', 'video', 'clips'],
    links: [{ label: 'Open Dashcam', app: 'dashcam' }],
  },
  {
    id: 'media',
    section: 'Apps',
    title: 'Music, podcasts and radio',
    body: [
      'Music and Podcasts browse invented sample content, and Podcasts remembers where you stopped in each episode. Radio lists internet stations from a free public directory, and needs a connection.',
      'The other streaming icons are placeholders. They explain that no service is connected, and never ask you to sign in.',
    ],
    keywords: ['audio', 'songs', 'album', 'episode', 'station', 'streaming'],
    links: [
      { label: 'Open Music', app: 'apple-music' },
      { label: 'Open Podcasts', app: 'podcasts' },
    ],
  },
  {
    id: 'fun',
    section: 'Apps',
    title: 'Toybox, Theater, Caraoke and Arcade',
    body: [
      'Toybox holds small extras, starting with Sketchpad, where you can draw and save an image. Theater plays video in Park. Caraoke is a sing-along with timed lyrics, and Arcade has the games.',
    ],
    keywords: ['games', 'sketch', 'draw', 'video', 'karaoke', 'light show', 'fun'],
    links: [
      { label: 'Open Toybox', app: 'toybox' },
      { label: 'Open Theater', app: 'theater' },
    ],
  },
  {
    id: 'browser',
    section: 'Apps',
    title: 'Browser',
    body: [
      'Most websites refuse to load inside another page, so this can never be a full browser. Sites that allow it open in place, and everything else opens in a new tab.',
    ],
    keywords: ['web', 'internet', 'bookmarks', 'iframe'],
  },
];

const terms = (query: string): string[] => query.toLowerCase().split(/\s+/).filter(Boolean);

function scoreTopic(topic: ManualTopic, words: string[]): number {
  const title = topic.title.toLowerCase();
  const keywords = (topic.keywords ?? []).join(' ').toLowerCase();
  const body = topic.body.join(' ').toLowerCase();
  let score = 0;
  for (const word of words) {
    const wordScore =
      (title.includes(word) ? 5 : 0) +
      (keywords.includes(word) ? 3 : 0) +
      (topic.section.toLowerCase().includes(word) ? 2 : 0) +
      (body.includes(word) ? 1 : 0);
    // Every word has to appear somewhere, so adding words narrows the results.
    if (wordScore === 0) return 0;
    score += wordScore;
  }
  return score;
}

export function searchManual(query: string, topics = MANUAL_TOPICS): ManualTopic[] {
  const words = terms(query);
  if (words.length === 0) return topics;
  return topics
    .map((topic) => ({ topic, score: scoreTopic(topic, words) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ topic }) => topic);
}

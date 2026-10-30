import { getImagePath } from '../../utils/assetPaths';

const topShelfApps = [
  'wipers',
  'defrost-front',
  'defrost-rear',
  'left-seat',
  // 'right-seat',
  'fan',
];

const shelfApps = [
  'bluetooth',
  'camera',
  'calendar',
  'dashcam',
  'podcasts',
  'amazon-music',
  'apple-music',
  'youtube-music',
  'spotify',
  'browser',
  'theater',
  'radio',
  'energy',
  'audible',
  'nav',
  'phone',
  'messages',
  'caraoke',
  'manual',
  'toybox',
  'arcade',
  'tidal',
];

const formatAppName = (appName: string) =>
  appName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

function ShelfIcon({ app }: { app: string }) {
  return (
    <div className="appShelfIcon">
      <img src={getImagePath(`app-${app}.svg`)} alt={`${app} icon`} />
      <div className="appShelfIconText">{formatAppName(app)}</div>
    </div>
  );
}

export function AppShelf() {
  return (
    <div className="appShelfContainer">
      <div className="customizeBtn">Customize</div>
      <div className="appTopShelf">
        {topShelfApps.map((app) => (
          <ShelfIcon key={app} app={app} />
        ))}
      </div>
      <div className="appShelf">
        {shelfApps.map((app) => (
          <ShelfIcon key={app} app={app} />
        ))}
      </div>
    </div>
  );
}

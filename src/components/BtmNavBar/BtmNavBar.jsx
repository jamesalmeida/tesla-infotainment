import TemperatureControl from '../TemperatureControl/TemperatureControl';
import VolumeControl from '../VolumeControl/VolumeControl';
import { getImagePath } from '../../utils/assetPaths';
import { useCarActions, useCarState } from '../../state/CarStateContext';
import './BtmNavBar.css';

const BtmNavBar = () => {
  const {
    temperature,
    volume,
    activeApp: activeNavIcon,
    isShelfOpen,
    isCameraForced,
  } = useCarState();
  const { toggleApp, toggleShelf, stepTemperature, setVolume } = useCarActions();

  const dockApps = [
    'camera',
    // 'calendar',
    // 'toybox',
    // 'theater',
    'arcade',
    'bluetooth',
    'apple-music',
    'dashcam',
    'open-shelf',
    'podcasts',
  ];

  const handleIconMouseDown = (event) => {
    event.currentTarget.classList.add('active');
  };

  const handleIconMouseUp = (event) => {
    event.currentTarget.classList.remove('active');
  };

  const handleOpenAudioSettings = () => {
    toggleApp('car-settings');
  };

  return (
    <div className="btmNavBar">
      <div className="btmNavItems no-select">
        <div className={`navIconWrapper car-settings`}>
          <img
            className={'navIcons'}
            src={getImagePath(`icon-car-settings.svg`)}
            alt={`car settings icon`}
            onClick={() => toggleApp('car-settings')}
            onMouseDown={handleIconMouseDown}
            onMouseUp={handleIconMouseUp}
            onMouseLeave={handleIconMouseUp}
          />
        </div>
        <TemperatureControl
          temperature={temperature}
          onIncrement={() => stepTemperature(1)}
          onDecrement={() => stepTemperature(-1)}
        />
        <div className="dockApps">
          {dockApps.map((icon, index) => {
            if (icon === 'open-shelf') {
              return (
                <div
                  key="open-shelf"
                  className={`navIconWrapper`}
                  onClick={toggleShelf}
                  onMouseDown={handleIconMouseDown}
                  onMouseUp={handleIconMouseUp}
                  onMouseLeave={handleIconMouseUp}
                >
                  <img
                    className="icon"
                    src={getImagePath(isShelfOpen ? 'icon-close-shelf.svg' : 'icon-open-shelf.svg')}
                    alt={isShelfOpen ? 'Close Menu' : 'Open Menu'}
                  />
                </div>
              );
            } else {
              return (
                <div
                  key={`${icon}-${index}`}
                  className={`navIconWrapper ${activeNavIcon === icon ? 'active' : ''} ${isCameraForced ? 'disabled' : ''}`}
                >
                  <img
                    className={`navIcons ${icon}`}
                    src={getImagePath(`app-${icon}.svg`)}
                    alt={`${icon} icon`}
                    onClick={() => !isCameraForced && toggleApp(icon)}
                    onMouseDown={!isCameraForced ? handleIconMouseDown : undefined}
                    onMouseUp={!isCameraForced ? handleIconMouseUp : undefined}
                    onMouseLeave={!isCameraForced ? handleIconMouseUp : undefined}
                  />
                </div>
              );
            }
          })}
        </div>
        <VolumeControl
          volume={volume}
          onVolumeChange={setVolume}
          onOpenAudioSettings={handleOpenAudioSettings}
        />
      </div>
    </div>
  );
};

export default BtmNavBar;

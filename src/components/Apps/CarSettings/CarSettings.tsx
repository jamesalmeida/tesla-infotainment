import UserProfile from '../../UserProfile/UserProfile';
import { Pressable } from '../../Pressable/Pressable';
import { useCar, useCarActions } from '../../../state/CarStateContext';
import type { SettingsPanel } from '../../../state/carState';
import { Controls } from './components/Controls';
import { Dynamics } from './components/Dynamics';
import { Charging } from './components/Charging';
import { Autopilot } from './components/Autopilot';
import { Locks } from './components/Locks';
import { Lights } from './components/Lights';
import { Display } from './components/Display';
import { Trips } from './components/Trips';
import { Navigation } from './components/Navigation';
import { Safety } from './components/Safety';
import { Service } from './components/Service';
import { Software } from './components/Software';
import { Wifi } from './components/Wifi';
import { getImagePath } from '../../../utils/assetPaths';
import styles from './CarSettings.module.css';

interface TopBarItem {
  icon: string;
  alt: string;
}

const topBarItems: TopBarItem[] = [
  { icon: 'homelink', alt: 'Garage' },
  { icon: 'notifications', alt: 'Notifications' },
  { icon: 'bluetooth', alt: 'Bluetooth' },
  { icon: 'wifi', alt: 'Wifi' },
];

const leftPanelItems: { icon: string; alt: string; label: SettingsPanel }[] = [
  { icon: 'controls', alt: 'Controls', label: 'Controls' },
  { icon: 'dynamics', alt: 'Dynamics', label: 'Dynamics' },
  { icon: 'charging', alt: 'Charging', label: 'Charging' },
  { icon: 'autopilot', alt: 'Autopilot', label: 'Autopilot' },
  { icon: 'locks', alt: 'Locks', label: 'Locks' },
  { icon: 'lights', alt: 'Lights', label: 'Lights' },
  { icon: 'display', alt: 'Display', label: 'Display' },
  { icon: 'trips', alt: 'Trips', label: 'Trips' },
  { icon: 'navigation', alt: 'Navigation', label: 'Navigation' },
  { icon: 'safety', alt: 'Safety', label: 'Safety' },
  { icon: 'service', alt: 'Service', label: 'Service' },
  { icon: 'software', alt: 'Software', label: 'Software' },
  { icon: 'wifi', alt: 'Wifi', label: 'Wifi' },
];

export const CarSettings = () => {
  const activePanel = useCar((state) =>
    state.surface.kind === 'settings' ? state.surface.panel : 'Controls',
  );
  const { openSettings } = useCarActions();

  return (
    <div className={styles['car-settings-wrapper']}>
      <div className={styles['top-bar']}>
        <div className={`${styles['top-bar-item']} ${styles['search-bar']}`}>
          <img src={getImagePath('icon-search.svg')} alt="Search" />
          <input type="text" placeholder="Search settings" />
        </div>
        <div className={styles['top-bar-right-icons']}>
          <UserProfile />
          {topBarItems.map((item) =>
            item.icon === 'wifi' ? (
              <Pressable
                key={item.icon}
                className={styles['top-bar-item']}
                onPress={() => openSettings('Wifi')}
              >
                <img src={getImagePath(`icon-settings-${item.icon}.svg`)} alt={item.alt} />
              </Pressable>
            ) : (
              <div key={item.icon} className={styles['top-bar-item']}>
                <img src={getImagePath(`icon-settings-${item.icon}.svg`)} alt={item.alt} />
              </div>
            ),
          )}
        </div>
      </div>
      <div className={styles['car-settings-panel']}>
        <div className={styles['left-scroll-panel']}>
          {leftPanelItems.map((item) => (
            <Pressable
              key={item.label}
              className={`${styles['left-scroll-panel-item']} ${activePanel === item.label ? styles.active : ''}`}
              pressed={activePanel === item.label}
              onPress={() => openSettings(item.label)}
            >
              <img src={getImagePath(`icon-settings-${item.icon}.svg`)} alt="" />
              {item.label}
            </Pressable>
          ))}
        </div>
        <div className={styles['settings-right-panel']}>
          <div className={`${styles['buttons-grid']} ${activePanel.toLowerCase()}`}>
            {activePanel === 'Controls' && <Controls />}
            {activePanel === 'Dynamics' && <Dynamics />}
            {activePanel === 'Charging' && <Charging />}
            {activePanel === 'Autopilot' && <Autopilot />}
            {activePanel === 'Locks' && <Locks />}
            {activePanel === 'Lights' && <Lights />}
            {activePanel === 'Display' && <Display />}
            {activePanel === 'Trips' && <Trips />}
            {activePanel === 'Navigation' && <Navigation />}
            {activePanel === 'Safety' && <Safety />}
            {activePanel === 'Service' && <Service />}
            {activePanel === 'Software' && <Software />}
            {activePanel === 'Wifi' && <Wifi />}
          </div>
        </div>
      </div>
    </div>
  );
};

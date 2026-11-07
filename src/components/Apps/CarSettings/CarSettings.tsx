import { useEffect, useRef, useState } from 'react';
import UserProfile from '../../UserProfile/UserProfile';
import { Pressable } from '../../Pressable/Pressable';
import { useCar, useCarActions } from '../../../state/CarStateContext';
import { hasUnreadNotifications, type SettingsPanel } from '../../../state/carState';
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
import { Notifications } from './components/Notifications';
import { Audio } from './components/Audio';
import { Profiles } from './components/Profiles';
import { getImagePath } from '../../../utils/assetPaths';
import { SettingsSearch } from './SettingsSearch';
import type { SettingEntry } from './settingsIndex';
import styles from './CarSettings.module.css';

const HIGHLIGHT_MS = 1600;

interface TopBarItem {
  icon: string;
  alt: string;
  panel: SettingsPanel;
}

const topBarItems: TopBarItem[] = [
  { icon: 'homelink', alt: 'Garage', panel: 'Wifi' },
  { icon: 'notifications', alt: 'Notifications', panel: 'Notifications' },
  { icon: 'bluetooth', alt: 'Bluetooth', panel: 'Wifi' },
  { icon: 'wifi', alt: 'Wifi', panel: 'Wifi' },
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
  { icon: 'notifications', alt: 'Notifications', label: 'Notifications' },
  { icon: 'audio', alt: 'Audio', label: 'Audio' },
  { icon: 'profiles', alt: 'Profiles', label: 'Profiles' },
];

function UnreadDot() {
  const hasUnread = useCar(hasUnreadNotifications);
  return hasUnread ? <span className={styles['red-dot']} role="img" aria-label="Unread" /> : null;
}

export const CarSettings = () => {
  const activePanel = useCar((state) =>
    state.surface.kind === 'settings' ? state.surface.panel : 'Controls',
  );
  const { openSettings } = useCarActions();
  const detailRef = useRef<HTMLDivElement>(null);
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);

  // Only narrow panels use this, showing the list or one panel. CSS decides when that applies.
  const [isDetailOpen, setIsDetailOpen] = useState(activePanel !== 'Controls');
  const [shownPanel, setShownPanel] = useState(activePanel);
  // Anything that picks a panel lands on it, including jumps from outside Settings.
  if (shownPanel !== activePanel) {
    setShownPanel(activePanel);
    setIsDetailOpen(true);
  }

  useEffect(() => {
    if (!jumpTarget) return;
    const target = detailRef.current?.querySelector<HTMLElement>(`[data-setting="${jumpTarget}"]`);
    target?.scrollIntoView({ block: 'center' });
    target?.setAttribute('data-highlighted', '');
    const timer = setTimeout(() => {
      target?.removeAttribute('data-highlighted');
      setJumpTarget(null);
    }, HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
      target?.removeAttribute('data-highlighted');
    };
  }, [jumpTarget]);

  const handleSearchPick = (entry: SettingEntry) => {
    openSettings(entry.panel);
    setIsDetailOpen(true);
    setJumpTarget(entry.id);
  };

  return (
    <div className={styles['car-settings-wrapper']}>
      <div className={styles['top-bar']}>
        <SettingsSearch onPick={handleSearchPick} />
        <div className={styles['top-bar-right-icons']}>
          <UserProfile />
          {topBarItems.map((item) => (
            <Pressable
              key={item.icon}
              className={styles['top-bar-item']}
              onPress={() => openSettings(item.panel)}
            >
              <img src={getImagePath(`icon-settings-${item.icon}.svg`)} alt={item.alt} />
              {item.icon === 'notifications' && <UnreadDot />}
            </Pressable>
          ))}
        </div>
      </div>
      <div className={styles['car-settings-panel']} data-view={isDetailOpen ? 'detail' : 'list'}>
        <div className={styles['left-scroll-panel']}>
          {leftPanelItems.map((item) => (
            <Pressable
              key={item.label}
              className={`${styles['left-scroll-panel-item']} ${activePanel === item.label ? styles.active : ''}`}
              pressed={activePanel === item.label}
              onPress={() => {
                openSettings(item.label);
                setIsDetailOpen(true);
              }}
            >
              <img src={getImagePath(`icon-settings-${item.icon}.svg`)} alt="" />
              {item.label}
            </Pressable>
          ))}
        </div>
        <div ref={detailRef} className={styles['settings-right-panel']}>
          <button
            type="button"
            className={styles['back-button']}
            onClick={() => setIsDetailOpen(false)}
          >
            <span aria-hidden="true">‹</span> {activePanel}
          </button>
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
            {activePanel === 'Notifications' && <Notifications />}
            {activePanel === 'Audio' && <Audio />}
            {activePanel === 'Profiles' && <Profiles />}
          </div>
        </div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import UserProfile from '../../UserProfile/UserProfile';
import { useCarActions, useCarState } from '../../../state/CarStateContext';
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
import './CarSettings.css';

interface TopBarItem {
  icon: string;
  alt: string;
  text?: string;
}

const topBarItems: TopBarItem[] = [
  { icon: 'homelink', alt: 'Garage' },
  { icon: 'notifications', alt: 'Notifications' },
  { icon: 'bluetooth', alt: 'Bluetooth' },
  { icon: 'wifi', alt: 'Wifi' },
];

const leftPanelItems = [
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
  const { isWifiMenuOpen } = useCarState();
  const { leaveWifiSettings } = useCarActions();
  const [selectedPanel, setSelectedPanel] = useState('Controls');

  // Opening Settings from the map's wifi icon jumps straight to the Wifi panel.
  const activePanel = isWifiMenuOpen ? 'Wifi' : selectedPanel;

  const selectPanel = (panel: string) => {
    setSelectedPanel(panel);
    if (isWifiMenuOpen) leaveWifiSettings();
  };

  const handleWifiClick = () => {
    selectPanel('Wifi');
  };

  return (
    <div className="car-settings-wrapper">
      <div className="top-bar">
        <div className="top-bar-item search-bar">
          <img src={getImagePath('icon-search.svg')} alt="Search" />
          <input type="text" placeholder="Search settings" />
        </div>
        <div className="top-bar-right-icons">
          <UserProfile />
          {topBarItems.map((item, index) => (
            <div
              key={index}
              className="top-bar-item"
              onClick={item.icon === 'wifi' ? handleWifiClick : undefined}
            >
              <img src={getImagePath(`icon-settings-${item.icon}.svg`)} alt={item.alt} />
              {item.text && item.text}
            </div>
          ))}
        </div>
      </div>
      <div className="car-settings-panel">
        <div className="left-scroll-panel">
          {leftPanelItems.map((item, index) => (
            <div
              key={index}
              className={`left-scroll-panel-item ${activePanel === item.label ? 'active' : ''}`}
              onClick={() => selectPanel(item.label)}
            >
              <img src={getImagePath(`icon-settings-${item.icon}.svg`)} alt={item.alt} />
              {item.label}
            </div>
          ))}
        </div>
        <div className="settings-right-panel">
          <div className={`buttons-grid ${activePanel.toLowerCase()}`}>
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

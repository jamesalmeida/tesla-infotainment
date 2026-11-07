import { useState } from 'react';
import { AppScreen, Tabs } from '../../../apps/ui/AppScreen';
import { TOYBOX_MODULES } from './modules';
import styles from './Toybox.module.css';

export const Toybox = () => {
  const [moduleId, setModuleId] = useState(TOYBOX_MODULES[0].id);
  const active = TOYBOX_MODULES.find((item) => item.id === moduleId) ?? TOYBOX_MODULES[0];
  const Module = active.component;

  return (
    <AppScreen
      title="Toybox"
      fixed
      toolbar={<Tabs tabs={TOYBOX_MODULES} value={moduleId} onChange={setModuleId} label="Toys" />}
    >
      <div className={active.fills ? styles.fill : styles.scroll}>
        <Module />
      </div>
    </AppScreen>
  );
};

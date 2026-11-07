import { DEMO_UPGRADES } from '../../../../state/sampleData';
import { DemoNote, Page, Row, Section, panelStyles } from './SystemPanel';

export const Upgrades = () => (
  <Page title="Upgrades">
    <DemoNote>Demo only: these are examples. Nothing here is for sale or can be bought.</DemoNote>
    <Section title="Example Upgrades">
      <ul className={panelStyles.list}>
        {DEMO_UPGRADES.map((upgrade) => (
          <li key={upgrade.name} className={panelStyles.listItem}>
            <Row label={upgrade.name} hint={upgrade.detail} />
          </li>
        ))}
      </ul>
    </Section>
  </Page>
);

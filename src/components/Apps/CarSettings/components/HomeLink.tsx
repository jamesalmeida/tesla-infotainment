import { useCar, useCarActions } from '../../../../state/CarStateContext';
import { canUseHomeLink, isHomeLinkInRange, type GarageDoor } from '../../../../state/carState';
import { Button, ButtonRow, DemoNote, Page, Row, Section, panelStyles } from './SystemPanel';
import { ValetHidden } from './ValetHidden';
import styles from './HomeLink.module.css';

const DOOR_LABELS: Record<GarageDoor, string> = {
  closed: 'Closed',
  opening: 'Opening…',
  open: 'Open',
  closing: 'Closing…',
};

function Door() {
  const position = useCar((state) => state.homelink.doorPosition);

  return (
    <div className={styles.garage} aria-hidden="true">
      <div className={styles.door} style={{ height: `${(1 - position) * 100}%` }} />
    </div>
  );
}

export const HomeLink = () => {
  const door = useCar((state) => state.homelink.door);
  const inRange = useCar(isHomeLinkInRange);
  const canUse = useCar((state) => canUseHomeLink(state).allowed);
  const { setHomeHere, toggleGarageDoor } = useCarActions();
  const isUp = door === 'open' || door === 'opening';

  return (
    <Page title="HomeLink">
      <DemoNote>Demo only: this door is a drawing, and nothing is transmitted.</DemoNote>
      <ValetHidden what="HomeLink">
        <Section title="Demo Garage">
          <Door />
          <Row
            label={DOOR_LABELS[door]}
            hint={inRange ? 'In range' : 'Out of range. Drive back, or set home here.'}
          />
          <ButtonRow>
            <Button variant="primary" disabled={!canUse} onPress={toggleGarageDoor}>
              {isUp ? 'Close Door' : 'Open Door'}
            </Button>
            <Button onPress={setHomeHere}>Set Home Here</Button>
          </ButtonRow>
          <p className={panelStyles.hint}>The door only answers near home.</p>
        </Section>
      </ValetHidden>
    </Page>
  );
};

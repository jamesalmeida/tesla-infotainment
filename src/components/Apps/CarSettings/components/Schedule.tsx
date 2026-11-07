import { useState, type FormEvent } from 'react';
import { useCar, useCarActions } from '../../../../state/CarStateContext';
import type { ScheduleEntry, ScheduleKind } from '../../../../state/carState';
import { Button, Choice, Page, Row, Section, Toggle, panelStyles } from './SystemPanel';
import { ValetHidden } from './ValetHidden';
import styles from './Schedule.module.css';

const KIND_OPTIONS: { value: ScheduleKind; label: string }[] = [
  { value: 'charge', label: 'Charge' },
  { value: 'departure', label: 'Departure' },
];

const KIND_LABELS: Record<ScheduleKind, string> = {
  charge: 'Start charging',
  departure: 'Be ready to leave',
};

const REPEAT_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'repeat', label: 'Repeat' },
] as const;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS = [1, 2, 3, 4, 5];

const describeDays = (days: number[]) => {
  if (days.length === 0) return 'Once';
  if (days.length === 7) return 'Every day';
  return days.map((day) => DAY_NAMES[day]).join(', ');
};

function NewEntry() {
  const { addSchedule } = useCarActions();
  const [kind, setKind] = useState<ScheduleKind>('departure');
  const [time, setTime] = useState('07:30');
  const [repeat, setRepeat] = useState<'once' | 'repeat'>('once');
  const [days, setDays] = useState<number[]>(WEEKDAYS);

  const toggleDay = (day: number) =>
    setDays(days.includes(day) ? days.filter((other) => other !== day) : [...days, day]);

  const needsDays = repeat === 'repeat' && days.length === 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!needsDays) addSchedule(kind, time, repeat === 'repeat' ? days : []);
  };

  return (
    <Section title="Add to Schedule">
      <form className={panelStyles.stackedRow} onSubmit={handleSubmit}>
        <Choice label="What" value={kind} options={KIND_OPTIONS} onChange={setKind} />
        <label className={panelStyles.stackedRow}>
          <span className={panelStyles.rowLabel}>Time</span>
          <input
            className={panelStyles.input}
            type="time"
            required
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </label>
        <Choice label="Repeat" value={repeat} options={REPEAT_OPTIONS} onChange={setRepeat} />
        {repeat === 'repeat' && (
          <div className={styles.days} role="group" aria-label="Days">
            {DAY_NAMES.map((name, day) => (
              <button
                key={name}
                type="button"
                className={styles.day}
                aria-pressed={days.includes(day)}
                onClick={() => toggleDay(day)}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <div>
          <Button type="submit" variant="primary" disabled={needsDays}>
            Add
          </Button>
        </div>
      </form>
    </Section>
  );
}

function Entry({ entry }: { entry: ScheduleEntry }) {
  const { removeSchedule, setScheduleEnabled } = useCarActions();
  const label = `${KIND_LABELS[entry.kind]} at ${entry.time}`;

  return (
    <li className={panelStyles.listItem}>
      <Toggle
        label={label}
        hint={describeDays(entry.days)}
        checked={entry.enabled}
        onChange={(enabled) => setScheduleEnabled(entry.id, enabled)}
      />
      <div>
        <Button label={`Delete ${label}`} onPress={() => removeSchedule(entry.id)}>
          Delete
        </Button>
      </div>
    </li>
  );
}

function ChargeHold() {
  const isHeld = useCar((state) => state.chargeHeld);
  const { startChargeNow } = useCarActions();
  if (!isHeld) return null;

  return (
    <Section>
      <Row label="Waiting to charge" hint="Plugged in. Charging starts at the scheduled time.">
        <Button variant="primary" onPress={startChargeNow}>
          Start Now
        </Button>
      </Row>
    </Section>
  );
}

export const Schedule = () => {
  const schedule = useCar((state) => state.schedule);

  return (
    <Page title="Schedule">
      <ValetHidden what="The schedule">
        <ChargeHold />
        <div className={panelStyles.twoColumns}>
          <Section title="Scheduled" hint="Goes by this device's clock.">
            {schedule.length === 0 ? (
              <p className={panelStyles.hint}>Nothing scheduled.</p>
            ) : (
              <ul className={panelStyles.list}>
                {schedule.map((entry) => (
                  <Entry key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </Section>
          <NewEntry />
        </div>
      </ValetHidden>
    </Page>
  );
};

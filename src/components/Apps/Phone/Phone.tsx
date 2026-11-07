import { useState } from 'react';
import {
  formatCallTime,
  hangUp,
  simulateIncomingCall,
  simulateOutgoingCall,
  useCallSession,
  type RecentCall,
} from '../../../apps/callSession';
import {
  connectedPhoneName,
  CONTACTS,
  searchContacts,
  type Contact,
} from '../../../apps/phoneData';
import { AppScreen, Callout, Tabs, ui } from '../../../apps/ui/AppScreen';
import { useCallSeconds } from './CallBanner';
import styles from './Phone.module.css';

const TABS = [
  { id: 'recents', label: 'Recents' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'dial', label: 'Dial pad' },
] as const;

type Tab = (typeof TABS)[number]['id'];

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
const MAX_DIGITS = 15;
const KIND_LABEL = { incoming: 'Incoming', outgoing: 'Outgoing', missed: 'Missed' };

const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');

function Avatar({ name }: { name: string }) {
  return (
    <span className={styles.avatar} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

const when = (time: number) =>
  new Date(time).toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

function RecentRow({ call }: { call: RecentCall }) {
  return (
    <li>
      <button
        type="button"
        className={ui.row}
        aria-label={`Call ${call.name}`}
        onClick={() => simulateOutgoingCall(call.number)}
      >
        <Avatar name={call.name} />
        <span className={ui.rowText}>
          <span className={`${ui.strong} ${call.kind === 'missed' ? styles.missed : ''}`}>
            {call.name}
          </span>
          <span className={`${ui.muted} ${styles.block}`}>
            {KIND_LABEL[call.kind]} · {when(call.time)}
          </span>
        </span>
      </button>
    </li>
  );
}

function ContactRow({ contact }: { contact: Contact }) {
  return (
    <li>
      <button
        type="button"
        className={ui.row}
        aria-label={`Call ${contact.name}`}
        onClick={() => simulateOutgoingCall(contact.number)}
      >
        <Avatar name={contact.name} />
        <span className={ui.rowText}>
          <span className={ui.strong}>{contact.name}</span>
          <span className={`${ui.muted} ${styles.block}`}>
            {contact.label} · {contact.number}
          </span>
        </span>
      </button>
    </li>
  );
}

function Contacts() {
  const [query, setQuery] = useState('');
  const contacts = searchContacts(query);

  return (
    <div className={ui.stack}>
      <input
        className={ui.input}
        type="search"
        aria-label="Search contacts"
        placeholder="Search contacts"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {contacts.length === 0 ? (
        <div className={ui.muted}>No contact matches that search.</div>
      ) : (
        <ul className={ui.list}>
          {contacts.map((contact) => (
            <ContactRow key={contact.id} contact={contact} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DialPad() {
  const [digits, setDigits] = useState('');

  return (
    <div className={styles.dialPad}>
      <div className={styles.display} aria-live="polite" aria-label="Number entered">
        {digits || <span className={ui.muted}>Enter a number</span>}
      </div>
      <div className={styles.keys}>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={styles.key}
            onClick={() => setDigits((value) => (value + key).slice(0, MAX_DIGITS))}
          >
            {key}
          </button>
        ))}
      </div>
      <div className={styles.dialActions}>
        <button
          type="button"
          className={ui.button}
          disabled={!digits}
          onClick={() => setDigits((value) => value.slice(0, -1))}
        >
          Delete
        </button>
        <button
          type="button"
          className={`${ui.button} ${ui.primary}`}
          disabled={!digits}
          onClick={() => {
            simulateOutgoingCall(digits);
            setDigits('');
          }}
        >
          Call (simulated)
        </button>
      </div>
    </div>
  );
}

function ActiveCall({ name, number, since }: { name: string; number: string; since: number }) {
  const seconds = useCallSeconds(since);

  return (
    <div className={styles.activeCall}>
      <Avatar name={name} />
      <div className={ui.strong}>{name}</div>
      <div className={ui.muted}>
        {number} · {formatCallTime(seconds)}
      </div>
      <Callout>This call is simulated. Nothing was dialled and nobody can hear you.</Callout>
      <button type="button" className={`${ui.button} ${ui.danger}`} onClick={hangUp}>
        End call
      </button>
    </div>
  );
}

export const Phone = () => {
  const [tab, setTab] = useState<Tab>('recents');
  const { call, recents } = useCallSession();

  return (
    <AppScreen
      title="Phone"
      toolbar={<Tabs tabs={TABS} value={tab} onChange={setTab} label="Phone views" />}
    >
      {call.status === 'active' ? (
        <ActiveCall name={call.caller.name} number={call.caller.number} since={call.since} />
      ) : (
        <div className={ui.stack}>
          <div className={styles.device}>
            <span className={ui.muted}>Connected to {connectedPhoneName()}</span>
            <button
              type="button"
              className={ui.button}
              disabled={call.status !== 'idle'}
              onClick={() => simulateIncomingCall(CONTACTS[0])}
            >
              Simulate incoming call
            </button>
          </div>
          {tab === 'recents' &&
            (recents.length === 0 ? (
              <div className={ui.muted}>No recent calls.</div>
            ) : (
              <ul className={ui.list}>
                {recents.map((recent) => (
                  <RecentRow key={recent.id} call={recent} />
                ))}
              </ul>
            ))}
          {tab === 'contacts' && <Contacts />}
          {tab === 'dial' && <DialPad />}
        </div>
      )}
    </AppScreen>
  );
};

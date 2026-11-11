import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import {
  formatCallTime,
  parseRecents,
  reduceCall,
  resetCallSession,
  RING_MS,
  simulateIncomingCall,
  type CallSession,
} from '../../../apps/callSession';
import { CONTACTS, findContactByNumber, searchContacts } from '../../../apps/phoneData';
import { CarStateProvider } from '../../../state/CarStateContext';
import { initialCarState } from '../../../state/carState';
import { CallBanner } from './CallBanner';
import { Phone } from './Phone';

const caller = { name: 'Ada', number: '555' };
const idle: CallSession = { call: { status: 'idle' }, recents: [] };

const renderPhone = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <Phone />
      <CallBanner />
    </CarStateProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  resetCallSession();
});

describe('call logic', () => {
  test('answering connects the call and logs it once', () => {
    const ringing = reduceCall(idle, { type: 'ring', caller });
    const active = reduceCall(ringing, { type: 'answer', now: 10 });

    expect(active.call).toMatchObject({ status: 'active', since: 10, direction: 'incoming' });
    expect(active.recents.map((call) => call.kind)).toEqual(['incoming']);
    expect(reduceCall(active, { type: 'hang-up', now: 20 }).call.status).toBe('idle');
  });

  test('declining logs a missed call', () => {
    const ringing = reduceCall(idle, { type: 'ring', caller });
    const declined = reduceCall(ringing, { type: 'decline', now: 10 });
    expect(declined.call.status).toBe('idle');
    expect(declined.recents[0].kind).toBe('missed');
  });

  test('a second call cannot interrupt the first', () => {
    const ringing = reduceCall(idle, { type: 'ring', caller });
    expect(reduceCall(ringing, { type: 'ring', caller: { name: 'B', number: '1' } })).toBe(ringing);
    expect(reduceCall(ringing, { type: 'dial', caller, now: 1 })).toBe(ringing);
  });

  test('stored recents are validated', () => {
    expect(parseRecents('{bad')).toEqual([]);
    expect(parseRecents(JSON.stringify([{ id: 1 }]))).toEqual([]);
  });

  test('contacts search by name or digits and match by number', () => {
    expect(searchContacts('ada').map((contact) => contact.id)).toEqual(['ada']);
    expect(searchContacts('555-0134').map((contact) => contact.id)).toEqual(['cass']);
    expect(searchContacts('')).toHaveLength(CONTACTS.length);
    expect(findContactByNumber('4155550111')?.id).toBe('ada');
  });

  test('every sample number is in the range reserved for fiction', () => {
    CONTACTS.forEach((contact) => expect(contact.number).toMatch(/555-01\d\d$/));
  });

  test('call time reads as minutes and seconds', () => {
    expect(formatCallTime(65)).toBe('1:05');
  });
});

describe('screens', () => {
  test('nothing on the screen can reach a real phone', () => {
    const { container } = renderPhone();
    fireEvent.click(screen.getByRole('tab', { name: 'Contacts' }));
    expect(container.querySelector('a[href^="tel:"], a[href^="sms:"]')).toBeNull();
  });

  test('the dial pad places a call that says it is simulated', () => {
    renderPhone();
    fireEvent.click(screen.getByRole('tab', { name: 'Dial pad' }));
    ['5', '5', '5'].forEach((key) => fireEvent.click(screen.getByRole('button', { name: key })));
    expect(screen.getByLabelText('Number entered')).toHaveTextContent('555');

    fireEvent.click(screen.getByRole('button', { name: 'Call (simulated)' }));

    expect(screen.getByText(/Nothing was dialled/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'End call' }));
    expect(screen.queryByText(/Nothing was dialled/)).not.toBeInTheDocument();
  });

  test('the incoming banner answers and ends', () => {
    renderPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Simulate incoming call' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Simulated incoming call');

    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Simulated call');

    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('an unanswered call rings out and is logged as missed', () => {
    vi.useFakeTimers();
    renderPhone();
    act(() => simulateIncomingCall(CONTACTS[3]));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(RING_MS);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Call ${CONTACTS[3].name}` })).toHaveTextContent(
      'Missed',
    );
    vi.useRealTimers();
  });
});

import { useSyncExternalStore } from 'react';
import { safeStorage } from '../utils/safeStorage';
import { CONTACTS, findContactByNumber } from './phoneData';

export type CallDirection = 'incoming' | 'outgoing';
export type RecentKind = CallDirection | 'missed';

export interface Caller {
  name: string;
  number: string;
}

export type CallState =
  | { status: 'idle' }
  | { status: 'ringing'; caller: Caller }
  | { status: 'active'; caller: Caller; direction: CallDirection; since: number };

export interface RecentCall {
  id: string;
  name: string;
  number: string;
  kind: RecentKind;
  // Milliseconds since the epoch.
  time: number;
}

export type CallEvent =
  | { type: 'ring'; caller: Caller }
  | { type: 'dial'; caller: Caller; now: number }
  | { type: 'answer'; now: number }
  | { type: 'decline'; now: number }
  | { type: 'hang-up'; now: number };

export interface CallSession {
  call: CallState;
  recents: RecentCall[];
}

const STORAGE_KEY = 'tesla-phone-recents';
const MAX_RECENTS = 30;
// How long a simulated call rings before it counts as missed.
export const RING_MS = 20000;

const logCall = (recents: RecentCall[], caller: Caller, kind: RecentKind, time: number) =>
  [{ ...caller, kind, time, id: `${time}-${caller.number}` }, ...recents].slice(0, MAX_RECENTS);

// There is no line to connect to, so every state here is pretend, whatever the screen says.
export function reduceCall(session: CallSession, event: CallEvent): CallSession {
  const { call, recents } = session;
  switch (event.type) {
    case 'ring':
      return call.status === 'idle'
        ? { ...session, call: { status: 'ringing', caller: event.caller } }
        : session;
    case 'dial':
      if (call.status !== 'idle') return session;
      return {
        call: { status: 'active', caller: event.caller, direction: 'outgoing', since: event.now },
        recents: logCall(recents, event.caller, 'outgoing', event.now),
      };
    case 'answer':
      if (call.status !== 'ringing') return session;
      return {
        call: { status: 'active', caller: call.caller, direction: 'incoming', since: event.now },
        recents: logCall(recents, call.caller, 'incoming', event.now),
      };
    case 'decline':
      if (call.status !== 'ringing') return session;
      return {
        call: { status: 'idle' },
        recents: logCall(recents, call.caller, 'missed', event.now),
      };
    case 'hang-up':
      return call.status === 'active' ? { ...session, call: { status: 'idle' } } : session;
  }
}

export function parseRecents(raw: string | null): RecentCall[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (call: RecentCall | null) =>
        typeof call?.id === 'string' &&
        typeof call.name === 'string' &&
        typeof call.number === 'string' &&
        ['incoming', 'outgoing', 'missed'].includes(call.kind) &&
        Number.isFinite(call.time),
    );
  } catch {
    return [];
  }
}

// A first visit shouldn't open to an empty list.
export function sampleRecents(now: number): RecentCall[] {
  const hour = 3600 * 1000;
  const entry = (index: number, kind: RecentKind, hoursAgo: number): RecentCall => ({
    id: `sample-${index}`,
    name: CONTACTS[index].name,
    number: CONTACTS[index].number,
    kind,
    time: now - hoursAgo * hour,
  });
  return [entry(0, 'incoming', 2), entry(2, 'missed', 5), entry(1, 'outgoing', 26)];
}

let session: CallSession | null = null;
let ringTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const readSession = (): CallSession => {
  if (!session) {
    const stored = safeStorage.getItem(STORAGE_KEY);
    session = {
      call: { status: 'idle' },
      recents: stored ? parseRecents(stored) : sampleRecents(Date.now()),
    };
  }
  return session;
};

const send = (event: CallEvent) => {
  const current = readSession();
  const next = reduceCall(current, event);
  if (next === current) return;
  session = next;
  if (next.recents !== current.recents) {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(next.recents));
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useCallSession = (): CallSession => useSyncExternalStore(subscribe, readSession);

export function simulateIncomingCall(caller: Caller) {
  send({ type: 'ring', caller });
  clearTimeout(ringTimer);
  ringTimer = setTimeout(() => send({ type: 'decline', now: Date.now() }), RING_MS);
}

export function answerCall() {
  clearTimeout(ringTimer);
  send({ type: 'answer', now: Date.now() });
}

export function declineCall() {
  clearTimeout(ringTimer);
  send({ type: 'decline', now: Date.now() });
}

export const hangUp = () => send({ type: 'hang-up', now: Date.now() });

// Pretend only. It puts the number on screen; nothing is dialled.
export function simulateOutgoingCall(number: string) {
  const contact = findContactByNumber(number);
  send({
    type: 'dial',
    caller: { name: contact?.name ?? number, number },
    now: Date.now(),
  });
}

// Tests start each case from what is in storage.
export function resetCallSession() {
  clearTimeout(ringTimer);
  session = null;
}

export const formatCallTime = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

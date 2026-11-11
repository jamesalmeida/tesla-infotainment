import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import type { RearSnapshot } from '../../apps/rearDisplay';
import { RearDisplay } from './RearDisplay';

class FakeChannel {
  static latest: FakeChannel | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  sent: unknown[] = [];

  constructor() {
    FakeChannel.latest = this;
  }

  postMessage(message: unknown) {
    this.sent.push(message);
  }

  close() {}
}

const snapshot: RearSnapshot = {
  climate: {
    seats: { driver: 0, passenger: 0, 'rear-left': 0, 'rear-center': 0, 'rear-right': 0 },
    temperature: 72,
    temperatureUnit: 'F',
    isSplit: false,
    cabinOn: true,
  },
  media: { title: 'Glass Harbour', subtitle: 'The Paper Lanterns', isPlaying: false },
  updatedAt: 1,
};

beforeEach(() => {
  FakeChannel.latest = null;
  vi.stubGlobal('BroadcastChannel', FakeChannel);
});

afterEach(() => vi.unstubAllGlobals());

test('asks the car for its state, then shows climate and media', () => {
  render(<RearDisplay />);
  expect(FakeChannel.latest?.sent[0]).toEqual({ type: 'command', command: { type: 'request' } });

  act(() => FakeChannel.latest?.onmessage?.({ data: { type: 'snapshot', snapshot } }));

  expect(screen.getByRole('heading', { name: 'Rear Display' })).toBeInTheDocument();
  expect(screen.getByText('72°F')).toBeInTheDocument();
  expect(screen.getByText('Glass Harbour')).toBeInTheDocument();
  expect(screen.getByText('The Paper Lanterns')).toBeInTheDocument();
});

test('rear controls send commands back to the car', () => {
  render(<RearDisplay />);
  act(() => FakeChannel.latest?.onmessage?.({ data: { type: 'snapshot', snapshot } }));

  fireEvent.click(screen.getByRole('button', { name: 'Warmer' }));
  fireEvent.click(screen.getByRole('button', { name: /Left/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));

  expect(FakeChannel.latest?.sent).toEqual(
    expect.arrayContaining([
      { type: 'command', command: { type: 'temperature', delta: 1 } },
      { type: 'command', command: { type: 'seat', seat: 'rear-left', kind: 'heat' } },
      { type: 'command', command: { type: 'media', action: 'toggle' } },
    ]),
  );
});

test('says when there is nothing playing', () => {
  render(<RearDisplay />);
  act(() =>
    FakeChannel.latest?.onmessage?.({
      data: { type: 'snapshot', snapshot: { ...snapshot, media: null } },
    }),
  );
  expect(screen.getByText('Nothing is playing.')).toBeInTheDocument();
});

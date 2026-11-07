import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { RearSync } from './RearSync';

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

function State() {
  return (
    <output aria-label="state">
      {JSON.stringify({
        seat: useCar((state: CarState) => state.climate.seats['rear-left']),
        temperature: useCar((state: CarState) => state.climate.passengerTemp),
      })}
    </output>
  );
}

const renderSync = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <RearSync />
      <State />
    </CarStateProvider>,
  );

const read = () => JSON.parse(screen.getByLabelText('state').textContent ?? '{}');

beforeEach(() => {
  FakeChannel.latest = null;
  vi.stubGlobal('BroadcastChannel', FakeChannel);
});

afterEach(() => vi.unstubAllGlobals());

test('publishes the rear climate and media snapshot', () => {
  renderSync();
  const message = FakeChannel.latest?.sent.at(-1) as {
    type: string;
    snapshot: { climate: { temperature: number; temperatureUnit: string } };
  };
  expect(message.type).toBe('snapshot');
  expect(message.snapshot.climate.temperature).toBe(70);
  expect(message.snapshot.climate.temperatureUnit).toBe('F');
});

test('a rear seat command changes the same store the car screen reads', () => {
  renderSync();
  act(() => {
    FakeChannel.latest?.onmessage?.({
      data: { type: 'command', command: { type: 'seat', seat: 'rear-left', kind: 'heat' } },
    });
  });
  expect(read().seat).toBe(3);
});

test('a rear temperature command moves the passenger zone', () => {
  renderSync();
  act(() => {
    FakeChannel.latest?.onmessage?.({
      data: { type: 'command', command: { type: 'temperature', delta: 1 } },
    });
  });
  expect(read().temperature).toBe(71);
});

test('a request gets a fresh snapshot', () => {
  renderSync();
  const before = FakeChannel.latest?.sent.length ?? 0;
  act(() => {
    FakeChannel.latest?.onmessage?.({
      data: { type: 'command', command: { type: 'request' } },
    });
  });
  expect(FakeChannel.latest?.sent.length).toBeGreaterThan(before);
});

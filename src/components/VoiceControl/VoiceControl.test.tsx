import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCar } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { VoiceControl } from './VoiceControl';

function State() {
  return (
    <output aria-label="state">
      {JSON.stringify({
        temperature: useCar((state: CarState) => state.climate.driverTemp),
        compartment: useCar((state: CarState) => state.openCompartment),
        gear: useCar((state: CarState) => state.gear),
        panel: useCar((state: CarState) => state.surface),
      })}
    </output>
  );
}

const enabled = {
  ...initialCarState,
  settings: { ...initialCarState.settings, assistantEnabled: true },
};

const renderVoice = (state = enabled) =>
  render(
    <CarStateProvider initialState={state}>
      <VoiceControl />
      <State />
    </CarStateProvider>,
  );

const read = () => JSON.parse(screen.getByLabelText('state').textContent ?? '{}');
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Voice control' }));

test('stays out of the way until the assistant is turned on', () => {
  renderVoice(initialCarState);
  expect(screen.queryByRole('button', { name: 'Voice control' })).not.toBeInTheDocument();
});

test('a typed command runs against the store', () => {
  renderVoice();
  open();
  fireEvent.change(screen.getByLabelText('Or type a command'), {
    target: { value: 'set the temperature to 72' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(read().temperature).toBe(72);
  expect(screen.getByLabelText('Voice result')).toHaveTextContent('Temperature set to 72');
});

test('opening the trunk changes the car state', () => {
  renderVoice();
  open();
  fireEvent.change(screen.getByLabelText('Or type a command'), {
    target: { value: 'open the trunk' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(read().compartment).toBe('trunk');
});

test('navigate sends a query to the map', () => {
  const heard: string[] = [];
  const listener = (event: Event) => heard.push((event as CustomEvent).detail.query);
  window.addEventListener('tesla:navigate', listener);

  renderVoice();
  open();
  fireEvent.change(screen.getByLabelText('Or type a command'), {
    target: { value: 'navigate to the nearest charger' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Run' }));

  expect(heard).toEqual(['the nearest charger']);
  window.removeEventListener('tesla:navigate', listener);
});

test('the browser speech engine drives the same commands', () => {
  class FakeRecognition {
    lang = '';
    continuous = false;
    interimResults = false;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    start() {
      this.onresult?.({
        resultIndex: 0,
        results: { length: 1, 0: { isFinal: true, 0: { transcript: 'go to park' } } },
      });
    }
    stop() {}
    abort() {}
  }
  vi.stubGlobal('SpeechRecognition', FakeRecognition);

  renderVoice();
  open();

  expect(read().gear).toBe('P');
  expect(screen.getByLabelText('Voice result')).toHaveTextContent('Shifting to P');
  vi.unstubAllGlobals();
});

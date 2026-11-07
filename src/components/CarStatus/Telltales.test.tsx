import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CarStateProvider, useCarActions } from '../../state/CarStateContext';
import { initialCarState, type CarState, type VehicleSettings } from '../../state/carState';
import { Telltales } from './Telltales';

const renderTelltales = (patch: Partial<CarState>, settings: Partial<VehicleSettings> = {}) =>
  render(
    <CarStateProvider
      initialState={{
        ...initialCarState,
        ...patch,
        settings: { ...initialCarState.settings, ...settings },
      }}
    >
      <Telltales />
    </CarStateProvider>,
  );

test.each<[string, Partial<CarState>, Partial<VehicleSettings>]>([
  ['Sentry Mode on', {}, { sentry: true }],
  ['Autopilot engaged', { gear: 'D', autopilot: 'cruise' }, {}],
  ['Vehicle hold on', { gear: 'D' }, {}],
  ['Track Mode on', {}, { trackMode: true }],
  ['Fog lights on', {}, { fogLights: true }],
  ['Dashcam paused', {}, { dashcam: true }],
  ['Dashcam recording', { gear: 'D' }, { dashcam: true }],
])('%s shows', (label, patch, settings) => {
  renderTelltales(patch, settings);
  expect(screen.getByRole('img', { name: label })).toBeInTheDocument();
});

test.each<[string, Partial<CarState>, Partial<VehicleSettings>]>([
  ['Sentry Mode on', { gear: 'D' }, { sentry: true }],
  ['Autopilot engaged', {}, {}],
  ['Vehicle hold on', {}, {}],
  ['Dashcam recording', {}, {}],
])('%s stays off', (label, patch, settings) => {
  renderTelltales(patch, settings);
  expect(screen.queryByRole('img', { name: label })).toBeNull();
});

function SaveClip() {
  const { saveDashcamClip } = useCarActions();
  return <button onClick={() => saveDashcamClip('manual')}>Save</button>;
}

test('a saved clip shows for a moment, then recording returns', () => {
  vi.useFakeTimers();
  const settings = { ...initialCarState.settings, dashcam: true };
  render(
    <CarStateProvider initialState={{ ...initialCarState, gear: 'D', settings }}>
      <Telltales />
      <SaveClip />
    </CarStateProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('img', { name: 'Dashcam clip saved' })).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(screen.getByRole('img', { name: 'Dashcam recording' })).toBeInTheDocument();
  vi.useRealTimers();
});

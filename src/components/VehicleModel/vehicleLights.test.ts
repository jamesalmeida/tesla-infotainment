import { initialCarState, type CarState } from '../../state/carState';
import { carLightState } from './vehicleLights';

const state = (patch: Partial<CarState>): CarState => ({ ...initialCarState, ...patch });

test('headlights follow the Lights setting, and high beams need them on', () => {
  const lights = carLightState(
    state({ settings: { ...initialCarState.settings, headlights: 'on', highBeams: true } }),
    true,
  );
  expect(lights.headlights).toBe(true);
  expect(lights.highBeams).toBe(true);

  const off = carLightState(
    state({ settings: { ...initialCarState.settings, headlights: 'off', highBeams: true } }),
    true,
  );
  expect(off.headlights).toBe(false);
  expect(off.highBeams).toBe(false);
});

test('signals blink on the shared clock, including hazards', () => {
  expect(carLightState(state({ signal: 'left' }), false).leftSignal).toBe(false);
  expect(carLightState(state({ signal: 'left' }), true).leftSignal).toBe(true);
  expect(carLightState(state({ hazards: true }), true).rightSignal).toBe(true);
});

test('brake lights follow the pedal and reverse lights follow the gear', () => {
  expect(carLightState(state({ pedal: 'brake' }), true).brake).toBe(true);
  expect(carLightState(state({ pedal: 'none' }), true).brake).toBe(false);
  expect(carLightState(state({ gear: 'R' }), true).reverse).toBe(true);
  expect(carLightState(state({ gear: 'D' }), true).reverse).toBe(false);
});

test('fog lights follow their own setting', () => {
  expect(
    carLightState(state({ settings: { ...initialCarState.settings, fogLights: true } }), true).fog,
  ).toBe(true);
});

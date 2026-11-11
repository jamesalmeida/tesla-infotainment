import { leftSignalLit, rightSignalLit, type CarState } from '../../state/carState';

export interface CarLightState {
  headlights: boolean;
  highBeams: boolean;
  fog: boolean;
  leftSignal: boolean;
  rightSignal: boolean;
  brake: boolean;
  reverse: boolean;
}

// The car's lamps follow the same store as the on-screen telltales. Blink timing is
// passed in, so the 3D car and the indicator arrows can share one clock.
export function carLightState(state: CarState, blinkOn: boolean): CarLightState {
  const headlights = state.settings.headlights !== 'off';
  return {
    headlights,
    highBeams: headlights && state.settings.highBeams,
    fog: state.settings.fogLights,
    leftSignal: blinkOn && leftSignalLit(state),
    rightSignal: blinkOn && rightSignalLit(state),
    brake: state.pedal === 'brake',
    reverse: state.gear === 'R',
  };
}

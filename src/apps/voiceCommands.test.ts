import { describeVoiceCommand, parseVoiceCommand } from './voiceCommands';

test.each([
  ['navigate to the nearest charger', { kind: 'navigate', query: 'the nearest charger' }],
  ['Go to 123 Main Street', { kind: 'navigate', query: '123 main street' }],
  ['set the temperature to 72', { kind: 'temperature', value: 72 }],
  ['set temperature to 55 degrees', { kind: 'temperature', value: 60 }],
  ['set temperature to 120', { kind: 'temperature', value: 90 }],
  ['open the trunk', { kind: 'compartment', compartment: 'trunk', open: true }],
  ['close the frunk', { kind: 'compartment', compartment: 'frunk', open: false }],
  ['open the browser', { kind: 'app', app: 'browser' }],
  ['launch arcade', { kind: 'app', app: 'arcade' }],
  ['open wifi', { kind: 'settings', panel: 'Wifi' }],
  ['open settings', { kind: 'settings', panel: 'Controls' }],
  ['put it in park', { kind: 'gear', gear: 'P' }],
  ['drive', { kind: 'gear', gear: 'D' }],
  ['reverse', { kind: 'gear', gear: 'R' }],
  ['play', { kind: 'media', action: 'play' }],
  ['pause', { kind: 'media', action: 'pause' }],
  ['next track', { kind: 'media', action: 'next' }],
  ['go back', { kind: 'media', action: 'previous' }],
  ['lock the car', { kind: 'lock', locked: true }],
  ['unlock', { kind: 'lock', locked: false }],
  ['turn on the headlights', { kind: 'headlights', mode: 'on' }],
  ['headlights off', { kind: 'headlights', mode: 'off' }],
])('%s is understood', (spoken, expected) => {
  expect(parseVoiceCommand(spoken)).toEqual(expected);
});

test('an unknown phrase stays unknown rather than guessing', () => {
  expect(parseVoiceCommand('make me a sandwich')).toEqual({
    kind: 'unknown',
    text: 'make me a sandwich',
  });
});

test('commands read back as confirmations', () => {
  expect(describeVoiceCommand({ kind: 'navigate', query: 'home' })).toBe('Navigating to home');
  expect(describeVoiceCommand({ kind: 'app', app: 'browser' })).toBe('Opening Browser');
  expect(describeVoiceCommand({ kind: 'unknown', text: 'huh' })).toContain('huh');
});

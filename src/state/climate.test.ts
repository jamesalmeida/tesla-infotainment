import {
  canStartClimateMode,
  carReducer,
  initialCarState,
  type CabinSettings,
  type CarAction,
  type CarState,
  type ClimateMode,
  type Gear,
  type SeatHeat,
  type SeatId,
  type SeatKind,
} from './carState';
import {
  climatePreferences,
  cycleSeat,
  initialClimate,
  isFrontDefrostOn,
  isHeatAuto,
  MAX_FAN_SPEED,
  nextFanSpeed,
  seatHeatLabel,
  setCabin,
  setOptions,
  setTemperature,
  stepTemperature,
  toggleDefrost,
  toggleHeatAuto,
  type ClimateState,
} from './climate';

const reduce = (...actions: CarAction[]) => actions.reduce(carReducer, initialCarState);
const reduceFrom = (state: CarState, ...actions: CarAction[]) => actions.reduce(carReducer, state);
const gear = (value: Gear): CarAction => ({ type: 'gear/select', gear: value });
const mode = (value: ClimateMode): CarAction => ({ type: 'climate/mode', mode: value });

const MANUAL: CabinSettings = {
  isOn: true,
  isAuto: false,
  fanSpeed: 3,
  airflow: 'feet',
  recirculate: true,
  ac: false,
};
const manual: ClimateState = { ...initialClimate, cabin: MANUAL };
const split: ClimateState = { ...initialClimate, isSplit: true, passengerTemp: 75 };

describe('temperature', () => {
  test.each([
    ['one temperature moves both', initialClimate, 'driver', 2, 72, 72],
    ['a stray passenger step still moves both', initialClimate, 'passenger', 2, 72, 72],
    ['split moves only the driver', split, 'driver', 2, 72, 75],
    ['split moves only the passenger', split, 'passenger', -2, 70, 73],
    ['the top of the range holds', split, 'passenger', 100, 70, 90],
    ['the bottom of the range holds', split, 'driver', -100, 60, 75],
  ] as const)('%s', (_name, climate, zone, delta, driverTemp, passengerTemp) => {
    expect(stepTemperature(climate, zone, delta)).toMatchObject({ driverTemp, passengerTemp });
  });

  test.each([
    ['one temperature sets both', initialClimate, 'driver', 74, 74, 74],
    ['split sets only the driver', split, 'driver', 74, 74, 75],
    ['split sets only the passenger', split, 'passenger', 66, 70, 66],
    ['the top of the range holds', split, 'driver', 200, 90, 75],
    ['the bottom of the range holds', split, 'passenger', 0, 70, 60],
  ] as const)('%s', (_name, climate, zone, value, driverTemp, passengerTemp) => {
    expect(setTemperature(climate, zone, value)).toMatchObject({ driverTemp, passengerTemp });
  });

  test('turning split on starts from the same temperature, and off drops the passenger one', () => {
    const on = setOptions(initialClimate, { isSplit: true });
    expect(on).toMatchObject({ isSplit: true, driverTemp: 70, passengerTemp: 70 });

    const moved = stepTemperature(on, 'passenger', 5);
    expect(setOptions(moved, { isSplit: false })).toMatchObject({
      isSplit: false,
      driverTemp: 70,
      passengerTemp: 70,
    });
  });
});

describe('cabin', () => {
  test.each<[string, CabinSettings, Partial<CabinSettings>, Partial<CabinSettings>]>([
    ['the fan overrides Auto', initialClimate.cabin, { fanSpeed: 6 }, { isAuto: false }],
    ['the vents override Auto', initialClimate.cabin, { airflow: 'feet' }, { isAuto: false }],
    ['the fan wakes the system', { ...MANUAL, isOn: false }, { fanSpeed: 6 }, { isOn: true }],
    ['Auto wakes the system', { ...MANUAL, isOn: false }, { isAuto: true }, { isOn: true }],
    ['the fan stops at the top', MANUAL, { fanSpeed: 99 }, { fanSpeed: MAX_FAN_SPEED }],
    ['the fan stops at the bottom', MANUAL, { fanSpeed: -1 }, { fanSpeed: 1 }],
    [
      'recirculate leaves Auto alone',
      initialClimate.cabin,
      { recirculate: true },
      { isAuto: true },
    ],
    ['turning off keeps the settings', MANUAL, { isOn: false }, { isOn: false, fanSpeed: 3 }],
  ])('%s', (_name, cabin, patch, expected) => {
    expect(setCabin({ ...initialClimate, cabin }, patch).cabin).toMatchObject(expected);
  });

  test.each<[string, Partial<CabinSettings>, number]>([
    ['steps up', { fanSpeed: 3 }, 4],
    ['wraps from the top', { fanSpeed: MAX_FAN_SPEED }, 1],
    ['wakes at the last speed', { fanSpeed: 3, isOn: false }, 3],
  ])('a fan tap %s', (_name, patch, expected) => {
    expect(nextFanSpeed({ ...MANUAL, ...patch })).toBe(expected);
  });
});

describe('front defrost', () => {
  const defrosting = toggleDefrost(manual, 'front');

  test('takes over the cabin and keeps a snapshot', () => {
    expect(isFrontDefrostOn(defrosting)).toBe(true);
    expect(defrosting.beforeDefrost).toEqual(MANUAL);
    expect(defrosting.cabin).toEqual({
      isOn: true,
      isAuto: false,
      fanSpeed: MAX_FAN_SPEED,
      airflow: 'windshield',
      recirculate: false,
      ac: true,
    });
  });

  test('turning it off restores exactly what was there, even Auto or off', () => {
    const restored = toggleDefrost(defrosting, 'front');
    expect(restored.cabin).toEqual(MANUAL);
    expect(restored.beforeDefrost).toBe(null);

    const fromOff = { ...initialClimate, cabin: { ...MANUAL, isOn: false } };
    expect(toggleDefrost(toggleDefrost(fromOff, 'front'), 'front').cabin).toEqual(fromOff.cabin);

    const fromAuto = toggleDefrost(toggleDefrost(initialClimate, 'front'), 'front');
    expect(fromAuto.cabin).toEqual(initialClimate.cabin);
  });

  test('trimming the fan stays in defrost and is not restored', () => {
    const trimmed = setCabin(defrosting, { fanSpeed: 7 });
    expect(isFrontDefrostOn(trimmed)).toBe(true);
    expect(trimmed.cabin).toMatchObject({ fanSpeed: 7, airflow: 'windshield' });
    expect(toggleDefrost(trimmed, 'front').cabin).toEqual(MANUAL);
  });

  test.each<[string, Partial<CabinSettings>, CabinSettings]>([
    ['the vents', { airflow: 'face' }, { ...MANUAL, airflow: 'face' }],
    ['recirculation', { recirculate: false }, { ...MANUAL, recirculate: false }],
    ['power', { isOn: false }, { ...MANUAL, isOn: false }],
    ['Auto', { isAuto: true }, { ...MANUAL, isAuto: true }],
  ])('changing %s ends defrost, on top of the snapshot', (_name, patch, expected) => {
    const ended = setCabin(defrosting, patch);
    expect(isFrontDefrostOn(ended)).toBe(false);
    expect(ended.cabin).toEqual(expected);
  });

  test('temperature and rear defrost carry on regardless', () => {
    const stepped = toggleDefrost(stepTemperature(defrosting, 'driver', 3), 'rear');
    expect(isFrontDefrostOn(stepped)).toBe(true);
    const restored = toggleDefrost(stepped, 'front');
    expect(restored).toMatchObject({ driverTemp: 73, rearDefrost: true, cabin: MANUAL });
  });

  test('a save during defrost keeps the settings underneath it', () => {
    expect(climatePreferences(defrosting).cabin).toEqual(MANUAL);
    expect(climatePreferences(manual).cabin).toEqual(MANUAL);
  });
});

describe('seats and wheel', () => {
  const taps = (seat: SeatId, kind: SeatKind, start: SeatHeat, count: number) => {
    let climate: ClimateState = {
      ...initialClimate,
      seats: { ...initialClimate.seats, [seat]: start },
    };
    const levels: SeatHeat[] = [];
    for (let tap = 0; tap < count; tap += 1) {
      climate = cycleSeat(climate, seat, kind);
      levels.push(climate.seats[seat]);
    }
    return levels;
  };

  test.each<[string, SeatId, SeatKind, SeatHeat, SeatHeat[]]>([
    ['heat runs strongest first', 'driver', 'heat', 0, [3, 2, 1, 0, 3]],
    ['cooling runs strongest first', 'passenger', 'cool', 0, [-3, -2, -1, 0, -3]],
    ['rear seats heat', 'rear-center', 'heat', 0, [3, 2, 1, 0]],
    ['rear seats have no cooling', 'rear-left', 'cool', 0, [0, 0]],
    ['Auto turns off first', 'driver', 'heat', 'auto', [0, 3]],
    ['heat turns off before cooling', 'driver', 'cool', 2, [0, -3]],
    ['cooling turns off before heat', 'driver', 'heat', -2, [0, 3]],
  ])('%s', (_name, seat, kind, start, expected) => {
    expect(taps(seat, kind, start, expected.length)).toEqual(expected);
  });

  test('a seat with no cooling changes nothing, so the store has nothing to report', () => {
    const state = initialCarState;
    expect(carReducer(state, { type: 'climate/seat', seat: 'rear-left', kind: 'cool' })).toBe(
      state,
    );
  });

  test('Auto covers every seat and the wheel, and turning it off clears them', () => {
    const auto = toggleHeatAuto(initialClimate);
    expect(isHeatAuto(auto)).toBe(true);
    expect(auto.seats['rear-right']).toBe('auto');
    expect(auto.wheel).toBe('auto');

    const off = toggleHeatAuto(auto);
    expect(isHeatAuto(off)).toBe(false);
    expect(off.seats).toEqual(initialClimate.seats);
    expect(off.wheel).toBe('off');
  });

  test('adjusting one seat leaves Auto, and the next tap turns all of it on again', () => {
    const adjusted = cycleSeat(toggleHeatAuto(initialClimate), 'driver', 'heat');
    expect(isHeatAuto(adjusted)).toBe(false);
    expect(isHeatAuto(toggleHeatAuto(adjusted))).toBe(true);
  });

  test.each<[SeatHeat, string]>([
    [0, 'Off'],
    ['auto', 'Auto'],
    [2, 'Heat 2'],
    [-1, 'Cool 1'],
  ])('%s reads as %s', (heat, label) => {
    expect(seatHeatLabel(heat)).toBe(label);
  });
});

describe('climate modes', () => {
  test.each<[string, Gear]>([
    ['Reverse', 'R'],
    ['Neutral', 'N'],
    ['Drive', 'D'],
  ])('only start in Park, not %s', (_name, value) => {
    const moved = reduce(gear(value));
    expect(canStartClimateMode(initialCarState)).toEqual({ allowed: true });
    expect(canStartClimateMode(moved).allowed).toBe(false);

    const refused = reduceFrom(moved, mode('dog'));
    expect(refused.climate.mode).toBe(null);
    expect(refused.notice?.message).toBe('Shift to Park to keep the climate running');
  });

  test('a second tap stops the mode without a notice, and the climate stays on', () => {
    const stopped = reduce(mode('camp'), mode('camp'));
    expect(stopped.climate.mode).toBe(null);
    expect(stopped.climate.cabin.isOn).toBe(true);
    expect(stopped.notice).toBe(null);
  });

  test('another mode replaces the one running', () => {
    expect(reduce(mode('keep'), mode('dog')).climate.mode).toBe('dog');
  });

  test('starting one turns the climate on', () => {
    const off = reduce({ type: 'climate/cabin', patch: { isOn: false } });
    expect(off.climate.cabin.isOn).toBe(false);
    expect(reduceFrom(off, mode('keep')).climate.cabin.isOn).toBe(true);
  });

  test.each<[ClimateMode, string, Gear]>([
    ['dog', 'Dog Mode', 'D'],
    ['camp', 'Camp Mode', 'R'],
    ['keep', 'Keep Climate', 'N'],
  ])('%s ends with a notice on leaving Park', (value, label, next) => {
    const left = reduce(mode(value), gear(next));
    expect(left.climate.mode).toBe(null);
    expect(left.notice?.message).toBe(`${label} is off: the car left Park`);
  });

  test('a refused shift leaves the mode running', () => {
    const charging = reduce(mode('dog'), { type: 'charge/plug' }, gear('D'));
    expect(charging.gear).toBe('P');
    expect(charging.climate.mode).toBe('dog');
  });

  test('leaving Park reports both the mode and an app closing behind it', () => {
    const left = reduce({ type: 'app/toggle', app: 'theater' }, mode('dog'), gear('D'));
    expect(left.climate.mode).toBe(null);
    expect(left.surface).toEqual({ kind: 'closed' });
    expect(left.notifications.map(({ message }) => message)).toEqual([
      'Theater is only available in Park',
      'Dog Mode is off: the car left Park',
    ]);
  });

  test('turning the climate off ends the mode with a notice', () => {
    const off = reduce(mode('keep'), { type: 'climate/cabin', patch: { isOn: false } });
    expect(off.climate.mode).toBe(null);
    expect(off.notice?.message).toBe('Keep Climate is off: the climate was turned off');
  });

  test('ending defrost cannot turn the climate off under a mode', () => {
    const defrost: CarAction = { type: 'climate/defrost', window: 'front' };
    const state = reduce(
      { type: 'climate/cabin', patch: { isOn: false } },
      defrost,
      mode('keep'),
      defrost,
    );
    expect(state.climate.mode).toBe('keep');
    expect(state.climate.cabin.isOn).toBe(true);
  });
});

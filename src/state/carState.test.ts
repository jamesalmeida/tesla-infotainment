import { carReducer, initialCarState, isCameraForced, type CarAction } from './carState';

const reduce = (...actions: CarAction[]) => actions.reduce(carReducer, initialCarState);

test('reverse forces the camera open and other gears close it', () => {
  const reverse = reduce({ type: 'gear/select', gear: 'R' });
  expect(isCameraForced(reverse)).toBe(true);
  expect(reverse).toMatchObject({ isSliderOpen: true, activeApp: 'camera' });

  const park = carReducer(reverse, { type: 'gear/select', gear: 'P' });
  expect(isCameraForced(park)).toBe(false);
  expect(park).toMatchObject({ isSliderOpen: false, activeApp: null });
});

test('an app icon opens its app, and a second click closes it', () => {
  const open = reduce({ type: 'app/toggle', app: 'bluetooth' });
  expect(open).toMatchObject({ isSliderOpen: true, activeApp: 'bluetooth' });

  const closed = carReducer(open, { type: 'app/toggle', app: 'bluetooth' });
  expect(closed).toMatchObject({ isSliderOpen: false, activeApp: null });
});

test('apps and closing are ignored while the camera is forced', () => {
  const reverse = reduce({ type: 'gear/select', gear: 'R' });
  expect(carReducer(reverse, { type: 'app/toggle', app: 'bluetooth' })).toBe(reverse);
  expect(carReducer(reverse, { type: 'app/toggle', app: 'camera' })).toEqual(reverse);
  expect(carReducer(reverse, { type: 'slider/close' })).toBe(reverse);
  expect(carReducer(reverse, { type: 'settings/openWifi' })).toBe(reverse);
});

test('the wifi shortcut opens Settings on Wifi until another panel is chosen', () => {
  const wifi = reduce({ type: 'settings/openWifi' });
  expect(wifi).toMatchObject({
    isSliderOpen: true,
    activeApp: 'car-settings',
    isWifiMenuOpen: true,
  });
  expect(carReducer(wifi, { type: 'settings/leaveWifi' }).isWifiMenuOpen).toBe(false);
  expect(carReducer(wifi, { type: 'slider/close' }).isWifiMenuOpen).toBe(false);
});

test('only one of frunk and trunk is open at a time', () => {
  expect(reduce({ type: 'compartment/toggle', compartment: 'frunk' }).openCompartment).toBe(
    'frunk',
  );
  expect(
    reduce(
      { type: 'compartment/toggle', compartment: 'frunk' },
      { type: 'compartment/toggle', compartment: 'trunk' },
    ).openCompartment,
  ).toBe('trunk');
  expect(
    reduce(
      { type: 'compartment/toggle', compartment: 'trunk' },
      { type: 'compartment/toggle', compartment: 'trunk' },
    ).openCompartment,
  ).toBe(null);
});

test('turn signals cancel each other and hazards light both', () => {
  const left = reduce({ type: 'signal/left' });
  expect(left).toMatchObject({ leftSignal: true, rightSignal: false });
  expect(carReducer(left, { type: 'signal/right' })).toMatchObject({
    leftSignal: false,
    rightSignal: true,
  });

  const hazards = carReducer(left, { type: 'signal/hazards' });
  expect(hazards).toMatchObject({ leftSignal: true, rightSignal: true });
  expect(carReducer(hazards, { type: 'signal/hazards' })).toMatchObject({
    leftSignal: false,
    rightSignal: false,
  });
});

test('temperature stays between 60 and 90', () => {
  expect(reduce({ type: 'temperature/step', delta: 100 }).temperature).toBe(90);
  expect(reduce({ type: 'temperature/step', delta: -100 }).temperature).toBe(60);
  expect(reduce({ type: 'temperature/step', delta: 1 }).temperature).toBe(71);
});

test('the shelf toggles the app shelf modal', () => {
  const open = reduce({ type: 'shelf/toggle' });
  expect(open).toMatchObject({ isShelfOpen: true, activeModal: 'app-shelf' });
  expect(carReducer(open, { type: 'shelf/toggle' })).toMatchObject({
    isShelfOpen: false,
    activeModal: null,
  });
});

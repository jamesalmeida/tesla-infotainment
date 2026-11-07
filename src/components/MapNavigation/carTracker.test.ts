import { vi } from 'vitest';
import { createCarTracker, PUBLISH_INTERVAL_MS } from './carTracker';

const START = { lat: 0, lng: 0 };
const EAST = { lat: 0, lng: 0.01 };
const FAR_EAST = { lat: 0, lng: 0.02 };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('carTracker', () => {
  test('starts where it is told, facing north, with no route', () => {
    expect(createCarTracker(START).getPose()).toEqual({ position: START, heading: 0, along: null });
  });

  test('a burst of movement reaches subscribers at most once per interval', () => {
    const tracker = createCarTracker(START);
    const listener = vi.fn();
    tracker.subscribe(listener);
    tracker.followRoute([START, EAST, FAR_EAST]);
    listener.mockClear();

    for (let i = 0; i < 10; i++) {
      tracker.advance(1);
      vi.advanceTimersByTime(25);
    }
    expect(listener.mock.calls.length).toBeLessThanOrEqual(2);
    vi.advanceTimersByTime(PUBLISH_INTERVAL_MS);
    expect(listener.mock.calls.length).toBeLessThanOrEqual(3);
    expect(tracker.getPose().along).toBeCloseTo(10, 6);
  });

  test('the live pose is current between publishes, and the published one is stable', () => {
    const tracker = createCarTracker(START);
    tracker.followRoute([START, EAST]);
    tracker.advance(1);
    const published = tracker.getPose();
    tracker.advance(1);

    expect(tracker.getPose()).toBe(published);
    expect(tracker.getLivePose().along).toBeCloseTo(2, 6);
  });

  test('stops at the end of the route', () => {
    const tracker = createCarTracker(START);
    tracker.followRoute([START, EAST]);

    tracker.advance(1_000_000);
    vi.advanceTimersByTime(PUBLISH_INTERVAL_MS);

    expect(tracker.getPose().position).toEqual(EAST);
  });

  test('a new route starts from its beginning', () => {
    const tracker = createCarTracker(START);
    tracker.followRoute([START, EAST]);
    tracker.advance(100);

    tracker.followRoute([EAST, FAR_EAST]);

    expect(tracker.getLivePose().along).toBe(0);
  });

  test('losing the route keeps the car where it got to', () => {
    const tracker = createCarTracker(START);
    tracker.followRoute([START, EAST]);
    tracker.advance(100);
    const { position, heading } = tracker.getLivePose();

    tracker.followRoute(null);

    expect(tracker.getLivePose()).toEqual({ position, heading, along: null });
  });

  test('a single-point route does not strand the car', () => {
    const tracker = createCarTracker(START);
    tracker.followRoute([EAST]);

    tracker.advance(100);

    expect(tracker.getLivePose().position.lat).toBeGreaterThan(0);
  });

  test('a fix far from the route shows where the car really is', () => {
    const tracker = createCarTracker(START);
    tracker.followRoute([START, EAST]);
    const away = { lat: 1, lng: 1 };

    tracker.applyFix(away, 30);

    expect(tracker.getLivePose()).toMatchObject({ position: away, heading: 30 });
  });

  test('jitter on a parked car keeps the heading', () => {
    const tracker = createCarTracker(START);
    tracker.applyFix({ lat: 0, lng: 0.01 }, null);
    const { heading } = tracker.getLivePose();

    tracker.applyFix({ lat: 0.000001, lng: 0.01 }, null);

    expect(tracker.getLivePose().heading).toBe(heading);
  });

  test('jumping publishes right away, and to the same place not at all', () => {
    const tracker = createCarTracker(START);
    const listener = vi.fn();
    tracker.subscribe(listener);

    tracker.jumpTo(START);
    expect(listener).not.toHaveBeenCalled();

    tracker.jumpTo(EAST);
    expect(listener).toHaveBeenCalledOnce();
    expect(tracker.getPose().position).toEqual(EAST);
  });

  test('disposing cancels a pending publish', () => {
    const tracker = createCarTracker(START);
    const listener = vi.fn();
    tracker.subscribe(listener);
    tracker.jumpTo(EAST);
    listener.mockClear();
    tracker.advance(1);

    tracker.dispose();
    vi.advanceTimersByTime(PUBLISH_INTERVAL_MS * 2);

    expect(listener).not.toHaveBeenCalled();
  });
});

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { Dashcam } from './Dashcam';
import {
  deleteClip,
  formatClipTime,
  groupByDay,
  loadChanges,
  parseChanges,
  RECENT_RETENTION_MS,
  sampleClips,
  saveClip,
  stampAt,
  visibleClips,
  type Clip,
} from './clips';
import { sceneAt } from './scene';

const NOW = new Date(2026, 10, 6, 12).getTime();
const none = { saved: [], deleted: [] };

const highway: Clip = {
  id: 'h',
  folder: 'recent',
  title: 'H',
  time: NOW,
  durationSeconds: 60,
  scene: 'highway',
};
const parked: Clip = { ...highway, scene: 'parked' };

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('clip library', () => {
  test('every folder starts with something to show', () => {
    const clips = visibleClips(sampleClips(NOW), none, NOW);
    expect(new Set(clips.map((clip) => clip.folder))).toEqual(
      new Set(['recent', 'saved', 'sentry']),
    );
  });

  test('recent clips expire after a day unless saved', () => {
    const old = { ...highway, time: NOW - RECENT_RETENTION_MS - 1000 };
    expect(visibleClips([old], none, NOW)).toEqual([]);
    expect(visibleClips([old], saveClip(none, 'h'), NOW)[0].folder).toBe('saved');
  });

  test('deleting removes a clip and forgets it was saved', () => {
    const changes = deleteClip(saveClip(none, 'h'), 'h');
    expect(changes).toEqual({ saved: [], deleted: ['h'] });
    expect(visibleClips([highway], changes, NOW)).toEqual([]);
  });

  test('bad storage is ignored', () => {
    expect(parseChanges('{nope')).toEqual(none);
    expect(parseChanges('{"saved":[1],"deleted":[]}')).toEqual(none);
  });

  test('times read as a clock and clips group by day', () => {
    expect(formatClipTime(75)).toBe('1:15');
    expect(stampAt(highway, 90)).not.toBe(stampAt(highway, 0));
    const yesterday = { ...highway, id: 'y', time: NOW - 86400000 };
    expect(groupByDay([highway, yesterday])).toHaveLength(2);
  });
});

describe('scene', () => {
  test('a frame depends only on the clip, camera and time', () => {
    expect(sceneAt(highway, 'front', 12.5)).toEqual(sceneAt(highway, 'front', 12.5));
    expect(sceneAt(highway, 'front', 1).laneOffset).not.toBe(
      sceneAt(highway, 'front', 1.3).laneOffset,
    );
  });

  test('the cameras do not all show the same thing', () => {
    expect(sceneAt(highway, 'front', 3).posts).not.toEqual(sceneAt(highway, 'left', 3).posts);
    expect(sceneAt(highway, 'front', 3).laneOffset).not.toBe(
      sceneAt(highway, 'rear', 3).laneOffset,
    );
  });

  test('a parked clip has no moving road, and someone walks past', () => {
    const frame = sceneAt(parked, 'front', 2);
    expect(frame.laneOffset).toBe(0);
    expect(frame.vehicle).toBeNull();
    expect(frame.person).not.toBeNull();
  });
});

describe('screen', () => {
  test('there is no video embed and nothing plays until asked', () => {
    const { container } = render(<Dashcam />);
    expect(container.querySelector('iframe, video')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Morning commute/ }));

    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.getByLabelText('Scrub through the clip')).toHaveValue('0');
  });

  test('a clip shows every camera, and one can be focused', () => {
    render(<Dashcam />);
    fireEvent.click(screen.getByRole('button', { name: /Morning commute/ }));
    expect(screen.getAllByRole('img', { name: /camera, simulated/ })).toHaveLength(4);

    fireEvent.click(screen.getByRole('button', { name: 'Show only the rear camera' }));
    expect(screen.getAllByRole('img', { name: /camera, simulated/ })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Show all cameras' }));
    expect(screen.getAllByRole('img', { name: /camera, simulated/ })).toHaveLength(4);
  });

  test('scrubbing moves every camera', () => {
    render(<Dashcam />);
    fireEvent.click(screen.getByRole('button', { name: /Morning commute/ }));
    fireEvent.change(screen.getByLabelText('Scrub through the clip'), { target: { value: '30' } });
    expect(screen.getByText('0:30 / 0:45')).toBeInTheDocument();
  });

  test('playback advances and stops at the end', () => {
    let step: FrameRequestCallback = () => {};
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      step = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.spyOn(performance, 'now').mockReturnValue(0);
    render(<Dashcam />);
    fireEvent.click(screen.getByRole('button', { name: /Morning commute/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    act(() => step(10000));
    expect(screen.getByText('0:10 / 0:45')).toBeInTheDocument();
    act(() => step(90000));

    expect(screen.getByText('0:45 / 0:45')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  test('saving moves a clip to Saved, and that is remembered', () => {
    const { unmount } = render(<Dashcam />);
    fireEvent.click(screen.getByRole('button', { name: /Morning commute/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: '‹ Clips' }));

    expect(screen.queryByRole('button', { name: /Morning commute/ })).not.toBeInTheDocument();
    unmount();

    render(<Dashcam />);
    fireEvent.click(screen.getByRole('tab', { name: 'Saved' }));
    expect(screen.getByRole('button', { name: /Morning commute/ })).toBeInTheDocument();
  });

  test('deleting needs a second tap', () => {
    render(<Dashcam />);
    fireEvent.click(screen.getByRole('tab', { name: 'Sentry' }));
    const card = screen.getByRole('button', { name: /Motion near the car/ });
    fireEvent.click(within(card).getByText('Motion near the car'));

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(loadChanges().deleted).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    expect(loadChanges().deleted).toEqual(['sentry-motion']);
    expect(screen.queryByRole('button', { name: /Motion near the car/ })).not.toBeInTheDocument();
  });
});

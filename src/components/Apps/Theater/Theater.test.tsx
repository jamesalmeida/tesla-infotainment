import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { canOpenApp, initialCarState } from '../../../state/carState';
import { parseVideoId, playerErrorMessage, PLAYER_TIMEOUT_MS } from './sources';
import { Theater } from './Theater';

const player = vi.hoisted(() => ({
  ready: undefined as (() => void) | undefined,
  error: undefined as ((event: { data: number }) => void) | undefined,
}));

vi.mock('react-youtube', () => ({
  default: ({
    videoId,
    onReady,
    onError,
  }: {
    videoId: string;
    onReady: () => void;
    onError: (event: { data: number }) => void;
  }) => {
    player.ready = onReady;
    player.error = onError;
    return <div data-testid="embed">{videoId}</div>;
  },
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('links and bare ids are understood, and anything else is refused', () => {
  const id = 'aqz-KE-bpKQ';
  expect(parseVideoId(id)).toBe(id);
  expect(parseVideoId(`https://www.youtube.com/watch?v=${id}&t=10`)).toBe(id);
  expect(parseVideoId(`https://youtu.be/${id}`)).toBe(id);
  expect(parseVideoId(`https://www.youtube.com/embed/${id}`)).toBe(id);
  expect(parseVideoId('https://example.com/watch?v=aqz-KE-bpKQ')).toBeNull();
  expect(parseVideoId('not a link')).toBeNull();
});

test('player errors become readable messages', () => {
  expect(playerErrorMessage(150)).toMatch(/owner/);
  expect(playerErrorMessage(100)).toMatch(/removed/);
  expect(playerErrorMessage(5)).toMatch(/can't be played/);
});

test('Theater stays parked only', () => {
  expect(canOpenApp({ ...initialCarState, gear: 'D' }, 'theater').allowed).toBe(false);
});

test('a video opens in the player and can be closed', () => {
  render(<Theater />);
  fireEvent.click(screen.getByRole('button', { name: /Sintel/ }));
  expect(screen.getByTestId('embed')).toHaveTextContent('eRsGyueVLvQ');

  fireEvent.click(screen.getByRole('button', { name: '‹ Theater' }));
  expect(screen.queryByTestId('embed')).not.toBeInTheDocument();
});

test('other sources explain they are placeholders and never ask for a login', () => {
  const { container } = render(<Theater />);
  fireEvent.click(screen.getByRole('button', { name: 'Movies' }));

  expect(screen.getByRole('status')).toHaveTextContent(/placeholder/);
  expect(container.querySelector('input[type="password"]')).toBeNull();
});

test('a player that never loads turns into a visible message', () => {
  vi.useFakeTimers();
  render(<Theater />);
  fireEvent.click(screen.getByRole('button', { name: /Spring/ }));

  act(() => {
    vi.advanceTimersByTime(PLAYER_TIMEOUT_MS);
  });

  expect(screen.getByRole('alert')).toHaveTextContent(/didn't load/);
});

test('a player that loads in time shows no message', () => {
  vi.useFakeTimers();
  render(<Theater />);
  fireEvent.click(screen.getByRole('button', { name: /Spring/ }));

  act(() => player.ready?.());
  act(() => {
    vi.advanceTimersByTime(PLAYER_TIMEOUT_MS * 2);
  });

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('an embed error is shown', () => {
  render(<Theater />);
  fireEvent.click(screen.getByRole('button', { name: /Spring/ }));
  act(() => player.error?.({ data: 150 }));
  expect(screen.getByRole('alert')).toHaveTextContent(/owner/);
});

test('offline is reported straight away', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  render(<Theater />);
  fireEvent.click(screen.getByRole('button', { name: /Spring/ }));

  expect(screen.getByRole('alert')).toHaveTextContent(/offline/);
  expect(screen.queryByTestId('embed')).not.toBeInTheDocument();
});

test('a pasted link plays and a bad one is refused', () => {
  render(<Theater />);
  fireEvent.change(screen.getByLabelText('Video link'), { target: { value: 'nope' } });
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(screen.getByRole('status')).toHaveTextContent(/doesn't look like/);

  fireEvent.change(screen.getByLabelText('Video link'), {
    target: { value: 'https://youtu.be/aqz-KE-bpKQ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(screen.getByTestId('embed')).toHaveTextContent('aqz-KE-bpKQ');
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { lazy } from 'react';
import { vi } from 'vitest';
import { CarStateProvider, useCarActions } from '../../../state/CarStateContext';
import { Arcade } from './Arcade';
import type { ArcadeGame } from './games';
import type { GameProps } from './Games/runtime';

const FakeGame = ({ onClose, suspended }: GameProps) => (
  <div>
    <div>Fake game {suspended ? 'suspended' : 'running'}</div>
    <button onClick={onClose}>Close</button>
  </div>
);

const BrokenGame = lazy<typeof FakeGame>(() => Promise.reject(new Error('offline')));

vi.mock('./games', (): { games: ArcadeGame[] } => ({
  games: [
    {
      id: 'kilowatt-commute',
      name: 'Ready Game',
      description: 'Ready.',
      get component() {
        return FakeGame;
      },
    },
    { id: 'amp-juggler', name: 'Future Game', description: 'Later.' },
    {
      id: 'curb-whisperer',
      name: 'Broken Game',
      description: 'Bad.',
      get component() {
        return BrokenGame;
      },
    },
  ],
}));

const GearButtons = () => {
  const { selectGear } = useCarActions();
  return (
    <>
      <button onClick={() => selectGear('D')}>Drive</button>
      <button onClick={() => selectGear('P')}>Park</button>
    </>
  );
};

const renderArcade = () =>
  render(
    <CarStateProvider>
      <GearButtons />
      <Arcade />
    </CarStateProvider>,
  );

const play = () => fireEvent.click(screen.getByRole('button', { name: 'Play Game' }));

afterEach(() => {
  vi.restoreAllMocks();
});

test('Play opens the selected game and Close comes back to it', () => {
  renderArcade();
  play();
  expect(screen.getByText('Fake game running')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.getByText('Ready.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Play Game' })).toBeEnabled();
});

test('a game with no component cannot be played and says it is coming soon', () => {
  renderArcade();
  fireEvent.click(screen.getByAltText('Future Game'));

  const button = screen.getByRole('button', { name: 'Coming soon' });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(screen.getByText('Later.')).toBeInTheDocument();
});

test('the other tabs load on demand and leaving a running game returns to browsing', async () => {
  renderArcade();
  play();

  fireEvent.click(screen.getByText('Toybox'));
  expect(await screen.findByRole('heading', { name: 'Toybox' })).toBeInTheDocument();
  expect(screen.queryByText(/Fake game/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('Theater'));
  expect(await screen.findByRole('heading', { name: 'Theater' })).toBeInTheDocument();

  fireEvent.click(screen.getByText('Arcade'));
  expect(screen.getByRole('button', { name: 'Play Game' })).toBeInTheDocument();
});

test('games only start in Park', () => {
  renderArcade();
  fireEvent.click(screen.getByRole('button', { name: 'Drive' }));
  expect(screen.getByRole('button', { name: 'Shift to Park' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Park' }));
  expect(screen.getByRole('button', { name: 'Play Game' })).toBeEnabled();
});

test('leaving Park suspends a running game instead of closing it', () => {
  renderArcade();
  play();

  fireEvent.click(screen.getByRole('button', { name: 'Drive' }));
  expect(screen.getByText('Fake game suspended')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Park' }));
  expect(screen.getByText('Fake game running')).toBeInTheDocument();
});

test('a game that fails to download offers a way back', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  renderArcade();
  fireEvent.click(screen.getByAltText('Broken Game'));
  play();

  const back = await screen.findByRole('button', { name: 'Back' });
  await act(async () => {
    fireEvent.click(back);
  });
  expect(screen.getByText('Bad.')).toBeInTheDocument();
});

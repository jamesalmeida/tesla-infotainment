import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { resetMediaLibrary } from '../../apps/mediaLibrary';
import { FullMediaPlayer } from './FullMediaPlayer';

const flush = () => act(async () => {});

beforeEach(() => {
  localStorage.clear();
  resetMediaLibrary();
});

test('has browse, queue, favorites and search sections', async () => {
  render(<FullMediaPlayer onClose={() => {}} />);
  await flush();

  expect(screen.getByRole('tab', { name: 'Browse' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Queue' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Favorites' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Search' })).toBeInTheDocument();
  expect(await screen.findByText('New this week')).toBeInTheDocument();
});

test('search filters the sample library', async () => {
  render(<FullMediaPlayer initialTab="search" onClose={() => {}} />);
  await flush();

  fireEvent.change(screen.getByLabelText('Search media'), { target: { value: 'harbour' } });
  expect(screen.getByText('Glass Harbour')).toBeInTheDocument();
  expect(screen.queryByText('Neon Orchard')).not.toBeInTheDocument();
});

test('a heart keeps an item in favorites', async () => {
  render(<FullMediaPlayer onClose={() => {}} />);
  await flush();

  fireEvent.click(screen.getByText('Glass Harbour'));
  fireEvent.click(screen.getByRole('button', { name: 'Add Harbour Lights to favorites' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Favorites' }));

  expect(screen.getByText('Harbour Lights')).toBeInTheDocument();
});

test('the queue tab explains when it is empty', async () => {
  render(<FullMediaPlayer initialTab="queue" onClose={() => {}} />);
  await flush();
  expect(screen.getByText('The queue is empty.')).toBeInTheDocument();
});

test('Escape closes the player', () => {
  const onClose = vi.fn();
  render(<FullMediaPlayer onClose={onClose} />);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledOnce();
});

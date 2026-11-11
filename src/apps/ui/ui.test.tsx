import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { navigateToPlace } from '../navigation';
import { Tabs } from './AppScreen';
import { GeneratedArt, hashSeed } from './GeneratedArt';
import { LineChart, pathFor } from './LineChart';

test('art is stable for a title and differs between titles', () => {
  expect(hashSeed('Night Shift')).toBe(hashSeed('Night Shift'));
  expect(hashSeed('Night Shift')).not.toBe(hashSeed('Day Shift'));
  render(<GeneratedArt seed="Night Shift" label="Cover" />);
  expect(screen.getByRole('img', { name: 'Cover' })).toBeInTheDocument();
});

test('tabs report the one that was picked', () => {
  const onChange = vi.fn();
  const tabs = [
    { id: 'a', label: 'One' },
    { id: 'b', label: 'Two' },
  ] as const;
  render(<Tabs tabs={tabs} value="a" onChange={onChange} label="Demo" />);

  expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(screen.getByRole('tab', { name: 'Two' }));
  expect(onChange).toHaveBeenCalledWith('b');
});

test('the chart path spans the plot and a chart without data still renders', () => {
  const path = pathFor(
    [
      { x: 0, y: 0 },
      { x: 10, y: 50 },
    ],
    0,
    100,
  );
  expect(path).toBe('M0.0 200.0 L600.0 100.0');

  render(<LineChart points={[]} title="Speed" formatX={String} formatY={String} />);
  expect(screen.getByRole('img', { name: 'Speed. No data yet.' })).toBeInTheDocument();
});

test('navigating fills the map search the way typing would', () => {
  const onChange = vi.fn();
  const closeSurface = vi.fn();
  const showNotice = vi.fn();
  render(<input id="navigateTo" value="" onChange={(e) => onChange(e.target.value)} />);

  navigateToPlace('Ferry Building', { closeSurface, showNotice });

  expect(closeSurface).toHaveBeenCalled();
  expect(onChange).toHaveBeenCalledWith('Ferry Building');
});

test('navigating says so when the map is not there', () => {
  const showNotice = vi.fn();
  navigateToPlace('Ferry Building', { closeSurface: vi.fn(), showNotice });
  expect(showNotice).toHaveBeenCalledWith('Navigation is not available right now');
});

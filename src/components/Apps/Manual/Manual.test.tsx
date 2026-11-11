import { fireEvent, render, screen } from '@testing-library/react';
import { APPS } from '../../../apps/registry';
import { CarStateProvider, useCar } from '../../../state/CarStateContext';
import { initialCarState, SETTINGS_PANELS } from '../../../state/carState';
import { Manual } from './Manual';
import { MANUAL_TOPICS, searchManual } from './manualContent';

function Surface() {
  const surface = useCar((state) => state.surface);
  const modal = useCar((state) => state.activeModal);
  return <output>{JSON.stringify({ surface, modal })}</output>;
}

const renderManual = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <Manual />
      <Surface />
    </CarStateProvider>,
  );

test('every deep link points at something that exists', () => {
  const links = MANUAL_TOPICS.flatMap((topic) => topic.links ?? []);
  expect(links.length).toBeGreaterThan(5);
  links.forEach((link) => {
    if ('app' in link) expect(Object.keys(APPS)).toContain(link.app);
    if ('settings' in link) expect(SETTINGS_PANELS).toContain(link.settings);
  });
});

test('topic ids are unique', () => {
  const ids = MANUAL_TOPICS.map((topic) => topic.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('search ranks title matches first and finds words the text does not use', () => {
  expect(searchManual('charging')[0].id).toBe('charging');
  expect(searchManual('karaoke').map((topic) => topic.id)).toEqual(['fun']);
});

test('search needs every word, and an empty search lists everything', () => {
  expect(searchManual('frunk zebra')).toEqual([]);
  expect(searchManual('   ')).toHaveLength(MANUAL_TOPICS.length);
});

test('a topic deep links into settings', () => {
  renderManual();
  fireEvent.change(screen.getByLabelText('Search the manual'), { target: { value: 'charging' } });
  fireEvent.click(screen.getByRole('button', { name: /^Charging/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Open Charging settings' }));

  expect(screen.getByRole('status')).toHaveTextContent('"panel":"Charging"');
});

test('a topic can open the shortcuts help', () => {
  renderManual();
  fireEvent.click(screen.getByRole('button', { name: /^Keyboard shortcuts/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Show all shortcuts' }));

  expect(screen.getByRole('status')).toHaveTextContent('"modal":"shortcuts"');
});

test('a search with no results says so', () => {
  renderManual();
  fireEvent.change(screen.getByLabelText('Search the manual'), { target: { value: 'xyzzy' } });
  expect(screen.getByText(/Nothing in the manual matches/)).toBeInTheDocument();
});

import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { createFakeMaps, type FakeMaps } from './fakeGoogleMaps';
import type { Place } from './place';
import { PlaceSearch } from './PlaceSearch';

const DEBOUNCE_MS = 200;
const BIAS = { lat: 5, lng: 6 };

let fake: FakeMaps;
let onSelect: ReturnType<typeof vi.fn<(place: Place) => void>>;
let onClear: ReturnType<typeof vi.fn<() => void>>;

function Harness() {
  const [query, setQuery] = useState('');
  return (
    <PlaceSearch
      placesLibrary={fake.libraries.places}
      query={query}
      onQueryChange={setQuery}
      onSelect={(place) => {
        setQuery(place.name);
        onSelect(place);
      }}
      onClear={() => {
        setQuery('');
        onClear();
      }}
      locationBias={BIAS}
    />
  );
}

const input = () => screen.getByRole<HTMLInputElement>('combobox');
const message = () => screen.getByRole('status');
const type = (value: string) => fireEvent.change(input(), { target: { value } });
const pressEnter = () => fireEvent.submit(input());
const clearButton = () => screen.getByAltText('Clear input');

const elapseDebounce = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });

const settle = (fn: () => void) =>
  act(async () => {
    fn();
    await vi.advanceTimersByTimeAsync(0);
  });

async function openList(text: string, names: string[]) {
  type(text);
  await elapseDebounce();
  const call = fake.autocompleteCalls.at(-1);
  if (!call) throw new Error('No suggestion request was made');
  await settle(() => call.resolve({ suggestions: names.map((name) => fake.suggestion(name)) }));
}

beforeEach(() => {
  vi.useFakeTimers();
  fake = createFakeMaps();
  onSelect = vi.fn<(place: Place) => void>();
  onClear = vi.fn<() => void>();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('debounce', () => {
  test('waits for typing to stop, then sends one request', async () => {
    render(<Harness />);
    type('c');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    });
    type('ca');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    });
    expect(fake.autocompleteCalls).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fake.autocompleteCalls).toHaveLength(1);
    expect(fake.autocompleteCalls[0].request).toMatchObject({ input: 'ca', locationBias: BIAS });
  });

  test('the timer does not outlive the component', async () => {
    const { unmount } = render(<Harness />);
    type('ca');
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(fake.autocompleteCalls).toHaveLength(0);
  });
});

describe('Enter during the debounce', () => {
  test('selects the first result once it arrives', async () => {
    render(<Harness />);
    type('ca');
    pressEnter();

    // No need to sit out the rest of the debounce.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fake.autocompleteCalls).toHaveLength(1);
    expect(message()).toHaveTextContent('Searching…');

    await settle(() =>
      fake.autocompleteCalls[0].resolve({
        suggestions: [
          fake.suggestion('First', { location: { lat: 3, lng: 4 } }),
          fake.suggestion('Second'),
        ],
      }),
    );
    expect(fake.detailCalls).toHaveLength(1);
    expect(message()).toHaveTextContent('Finding place…');

    await settle(() => fake.detailCalls[0].resolve(undefined));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith({
      name: 'First',
      location: { lat: 3, lng: 4 },
    });
    expect(input()).toHaveValue('First');
    expect(message()).toBeEmptyDOMElement();
  });

  test('shows the empty state when there is nothing to select', async () => {
    render(<Harness />);
    type('zzz');
    pressEnter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    await settle(() => fake.autocompleteCalls[0].resolve({ suggestions: [] }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(message()).toHaveTextContent('No results for “zzz”');
  });

  test('still selects if the input loses focus before the result arrives', async () => {
    render(<Harness />);
    type('ca');
    pressEnter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fireEvent.blur(input());

    await settle(() =>
      fake.autocompleteCalls[0].resolve({ suggestions: [fake.suggestion('First')] }),
    );
    await settle(() => fake.detailCalls[0].resolve(undefined));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  test('Enter while loading also selects the first result', async () => {
    render(<Harness />);
    type('ca');
    await elapseDebounce();
    pressEnter();
    expect(fake.autocompleteCalls).toHaveLength(1);

    await settle(() =>
      fake.autocompleteCalls[0].resolve({ suggestions: [fake.suggestion('First')] }),
    );
    await settle(() => fake.detailCalls[0].resolve(undefined));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe('races', () => {
  test('keeping typing during the detail fetch beats the selection', async () => {
    render(<Harness />);
    await openList('ca', ['Cafe']);
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Cafe' }));
    expect(fake.detailCalls).toHaveLength(1);

    type('cafeteria');
    await settle(() => fake.detailCalls[0].resolve(undefined));

    expect(onSelect).not.toHaveBeenCalled();
    expect(input()).toHaveValue('cafeteria');
  });

  test('clearing during the detail fetch beats the selection', async () => {
    render(<Harness />);
    await openList('ca', ['Cafe']);
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Cafe' }));

    fireEvent.click(clearButton());
    await settle(() => fake.detailCalls[0].resolve(undefined));

    expect(onSelect).not.toHaveBeenCalled();
    expect(input()).toHaveValue('');
  });

  test('a failing detail fetch abandoned by typing shows no error', async () => {
    render(<Harness />);
    await openList('ca', ['Cafe']);
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Cafe' }));

    type('cafeteria');
    await settle(() => fake.detailCalls[0].reject(new Error('boom')));

    expect(message()).toBeEmptyDOMElement();
  });

  test('suggestions arriving out of order keep the newest', async () => {
    render(<Harness />);
    type('c');
    await elapseDebounce();
    type('ca');
    await elapseDebounce();
    const [older, newer] = fake.autocompleteCalls;

    await settle(() => newer.resolve({ suggestions: [fake.suggestion('Newer')] }));
    await settle(() => older.resolve({ suggestions: [fake.suggestion('Older')] }));

    expect(screen.getByRole('option', { name: 'Newer' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Older' })).not.toBeInTheDocument();
  });

  test('suggestions arriving after blur stay closed', async () => {
    render(<Harness />);
    type('ca');
    await elapseDebounce();
    fireEvent.blur(input());

    await settle(() =>
      fake.autocompleteCalls[0].resolve({ suggestions: [fake.suggestion('Late')] }),
    );
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  test('a response after unmount does nothing', async () => {
    const { unmount } = render(<Harness />);
    await openList('ca', ['Cafe']);
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Cafe' }));
    unmount();

    await settle(() => fake.detailCalls[0].resolve(undefined));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('visible states', () => {
  test('loading shows progress', async () => {
    render(<Harness />);
    type('ca');
    expect(message()).toBeEmptyDOMElement();

    await elapseDebounce();
    expect(message()).toHaveTextContent('Searching…');
  });

  test('no results is a message', async () => {
    render(<Harness />);
    await openList('zzz', []);
    expect(message()).toHaveTextContent('No results for “zzz”');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  test('a failed search is a message, clears old suggestions, and Enter retries', async () => {
    render(<Harness />);
    await openList('ca', ['Cafe']);
    type('caf');
    await elapseDebounce();
    await settle(() => fake.autocompleteCalls[1].reject(new Error('boom')));

    expect(message()).toHaveTextContent("Search isn't working right now");
    expect(screen.queryByRole('option')).not.toBeInTheDocument();

    pressEnter();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fake.autocompleteCalls).toHaveLength(3);
    expect(fake.autocompleteCalls[2].request.input).toBe('caf');
  });

  test('a failed detail fetch is a message', async () => {
    render(<Harness />);
    await openList('ca', ['Cafe']);
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Cafe' }));

    await settle(() => fake.detailCalls[0].reject(new Error('boom')));
    expect(onSelect).not.toHaveBeenCalled();
    expect(message()).toHaveTextContent("Couldn't load that place");
  });

  test('a place with no location is reported rather than dropped', async () => {
    render(<Harness />);
    type('ca');
    await elapseDebounce();
    await settle(() =>
      fake.autocompleteCalls[0].resolve({
        suggestions: [fake.suggestion('Nowhere', { location: null })],
      }),
    );
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Nowhere' }));

    await settle(() => fake.detailCalls[0].resolve(undefined));
    expect(onSelect).not.toHaveBeenCalled();
    expect(message()).toHaveTextContent("Couldn't load that place");
  });
});

describe('session token', () => {
  const tokenOf = (index: number) => fake.autocompleteCalls[index].request.sessionToken;

  async function search(text: string) {
    await openList(text, ['Cafe']);
  }

  test('is shared by every request in one search', async () => {
    render(<Harness />);
    await search('c');
    await search('ca');
    expect(fake.sessionTokens).toHaveLength(1);
    expect(tokenOf(1)).toBe(tokenOf(0));
  });

  test('is dropped on clear', async () => {
    render(<Harness />);
    await search('ca');
    fireEvent.click(clearButton());
    await search('ca');
    expect(tokenOf(1)).not.toBe(tokenOf(0));
  });

  test('is dropped when the text is deleted', async () => {
    render(<Harness />);
    await search('ca');
    type('');
    await search('ca');
    expect(tokenOf(1)).not.toBe(tokenOf(0));
  });

  test('is dropped on blur', async () => {
    render(<Harness />);
    await search('ca');
    fireEvent.blur(input());
    await search('caf');
    expect(tokenOf(1)).not.toBe(tokenOf(0));
  });

  test('is dropped once a selection begins, even if that selection is abandoned', async () => {
    render(<Harness />);
    await search('ca');
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Cafe' }));
    await search('caf');
    expect(tokenOf(1)).not.toBe(tokenOf(0));
  });

  test('survives Escape, which leaves the search going', async () => {
    render(<Harness />);
    await search('ca');
    fireEvent.keyDown(input(), { key: 'Escape' });
    await search('caf');
    expect(tokenOf(1)).toBe(tokenOf(0));
  });
});

describe('accessibility', () => {
  test('aria-controls points at a list that is always in the DOM', async () => {
    render(<Harness />);
    const controlled = () => document.getElementById(input().getAttribute('aria-controls') ?? '');

    expect(controlled()).toBeInTheDocument();
    expect(controlled()).not.toBeVisible();

    await openList('ca', ['Cafe']);
    expect(controlled()).toBeVisible();
  });

  test('aria-activedescendant follows the highlighted option', async () => {
    render(<Harness />);
    expect(input()).not.toHaveAttribute('aria-activedescendant');

    await openList('ca', ['One', 'Two']);
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(input()).not.toHaveAttribute('aria-activedescendant');

    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    const option = screen.getByRole('option', { name: 'Two' });
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(input()).toHaveAttribute('aria-activedescendant', option.id);

    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(input()).not.toHaveAttribute('aria-activedescendant');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Enter selects the highlighted option', async () => {
    render(<Harness />);
    await openList('ca', ['One', 'Two']);
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    pressEnter();

    await settle(() => fake.detailCalls[0].resolve(undefined));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Two' }));
  });
});

test('deleting the text clears the search', async () => {
  render(<Harness />);
  await openList('ca', ['Cafe']);
  type('');
  expect(onClear).toHaveBeenCalledOnce();
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
});

test('a search typed before the library loads runs once it does', async () => {
  const places = fake.libraries.places;
  fake.libraries.places = null;
  const { rerender } = render(<Harness />);
  type('ca');
  await elapseDebounce();
  expect(message()).toHaveTextContent('Searching…');

  fake.libraries.places = places;
  rerender(<Harness />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(fake.autocompleteCalls).toHaveLength(1);
});

test('keeps the id Shift+M focuses', () => {
  render(<Harness />);
  expect(input()).toHaveAttribute('id', 'navigateTo');
});

test('offers a search key on touch keyboards', () => {
  render(<Harness />);
  expect(input()).toHaveAttribute('enterkeyhint', 'search');
});

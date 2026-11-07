import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CONVERSATIONS } from '../../../apps/phoneData';
import { CarStateProvider } from '../../../state/CarStateContext';
import { initialCarState } from '../../../state/carState';
import { Messages } from './Messages';
import { formatAgo, loadRead, readOutText, sortConversations, unreadCount } from './messageState';

const renderMessages = () =>
  render(
    <CarStateProvider initialState={initialCarState}>
      <Messages />
    </CarStateProvider>,
  );

beforeEach(() => localStorage.clear());

afterEach(() => {
  vi.unstubAllGlobals();
});

test('unread counts only what was received and not yet read', () => {
  const [first] = CONVERSATIONS;
  expect(unreadCount(first, [])).toBe(2);
  expect(unreadCount(first, ['a1'])).toBe(1);
});

test('the newest conversation comes first and times read naturally', () => {
  expect(sortConversations([...CONVERSATIONS].reverse())[0].contactId).toBe('ada');
  expect(formatAgo(0)).toBe('Now');
  expect(formatAgo(12)).toBe('12 min ago');
  expect(formatAgo(125)).toBe('2 hr ago');
});

test('the read-out names the sender', () => {
  expect(readOutText('Ada', 'Hello')).toBe('Ada says: Hello');
});

test('opening a conversation marks it read, and that outlives the app', () => {
  const { unmount } = renderMessages();
  fireEvent.click(screen.getByRole('button', { name: /Ada Whitlock/ }));
  expect(screen.getByText('Parking is on the north side.', { exact: false })).toBeInTheDocument();
  expect(loadRead()).toEqual(expect.arrayContaining(['a1', 'a3']));
  unmount();

  renderMessages();
  expect(screen.queryByLabelText('2 unread')).not.toBeInTheDocument();
});

test('reading aloud shows the text and uses speech where it exists', () => {
  const speak = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      volume = 1;
      constructor(public text: string) {}
    },
  );
  renderMessages();

  fireEvent.click(screen.getByRole('button', { name: /Bo Tanaka-Reyes/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Read aloud' }));

  expect(screen.getByRole('status')).toHaveTextContent('Bo Tanaka-Reyes says:');
  expect(speak).toHaveBeenCalledTimes(1);
  expect(speak.mock.calls[0][0].volume).toBe(0.5);
});

test('with no speech engine the read-out still appears, and a new message reads itself', () => {
  renderMessages();
  fireEvent.click(screen.getByRole('button', { name: 'Simulate new message' }));

  expect(screen.getByRole('status')).toHaveTextContent('Eli Vandersloot says:');
  expect(screen.getByRole('button', { name: 'Simulate new message' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

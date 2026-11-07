import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { BOOKMARKS, resolveAddress, searchUrl } from './address';
import { Browser } from './Browser';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('address bar', () => {
  test('allowed sites stay in the frame, and always over https', () => {
    expect(resolveAddress('https://en.wikipedia.org/wiki/Battery')).toEqual({
      kind: 'frame',
      url: 'https://en.wikipedia.org/wiki/Battery',
    });
    expect(resolveAddress('example.com')).toEqual({ kind: 'frame', url: 'https://example.com/' });
    expect(resolveAddress('http://example.com/a')?.kind).toBe('frame');
    expect((resolveAddress('http://example.com/a') as { url: string }).url).toMatch(/^https:/);
  });

  test('other sites go to a new tab', () => {
    expect(resolveAddress('github.com')).toEqual({ kind: 'tab', url: 'https://github.com/' });
    expect(resolveAddress('example.com.evil.net')?.kind).toBe('tab');
    expect(resolveAddress('https://example.com@evil.net/')?.kind).toBe('tab');
    expect(resolveAddress('https://notwikipedia.org/')?.kind).toBe('tab');
  });

  test('only one OpenStreetMap page is frameable', () => {
    expect(resolveAddress('https://www.openstreetmap.org/export/embed.html?bbox=1')?.kind).toBe(
      'frame',
    );
    expect(resolveAddress('https://www.openstreetmap.org/')?.kind).toBe('tab');
  });

  test('plain words become a search', () => {
    expect(resolveAddress('ev charging near me')).toEqual({
      kind: 'tab',
      url: searchUrl('ev charging near me'),
    });
    expect(searchUrl('a b')).toContain('a%20b');
  });

  test('a port is not a scheme', () => {
    expect(resolveAddress('example.com:8080/path')).toMatchObject({ kind: 'frame' });
  });

  test('nothing but web addresses can be opened', () => {
    ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd'].forEach((input) => {
      expect(resolveAddress(input)?.kind).toBe('refused');
    });
    expect(resolveAddress('   ')).toBeNull();
  });
});

describe('screen', () => {
  test('explains why most sites cannot load in a frame', () => {
    render(<Browser />);
    expect(screen.getByRole('heading', { name: 'Browser' })).toBeInTheDocument();
    expect(screen.getByText(/tells browsers not to show them inside another page/)).toBeVisible();
  });

  test('bookmarks say where they will open and all are real destinations', () => {
    render(<Browser />);
    expect(screen.getByRole('button', { name: 'Wikipedia, opens here' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NASA, opens in a new tab' })).toBeInTheDocument();
    BOOKMARKS.forEach((bookmark) =>
      expect(resolveAddress(bookmark.url)?.kind).toMatch(/frame|tab/),
    );
  });

  test('an allowed site loads in a sandboxed frame', () => {
    render(<Browser />);
    fireEvent.click(screen.getByRole('button', { name: /Wikipedia/ }));

    const frame = screen.getByTitle('Web page');
    expect(frame).toHaveAttribute('src', expect.stringContaining('wikipedia.org'));
    expect(frame.getAttribute('sandbox')).not.toContain('allow-top-navigation');

    fireEvent.click(screen.getByRole('button', { name: 'Bookmarks' }));
    expect(screen.queryByTitle('Web page')).not.toBeInTheDocument();
  });

  test('a blocked site opens a tab and keeps a link in case the pop-up was stopped', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<Browser />);
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'github.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    expect(open).toHaveBeenCalledWith('https://github.com/', '_blank', 'noopener,noreferrer');
    const link = screen.getByRole('link', { name: 'Open in a new tab' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('a refused address says why and opens nothing', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<Browser />);
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    expect(open).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Only web addresses');
  });

  test('a frame that never loads gets a visible way out', () => {
    vi.useFakeTimers();
    render(<Browser />);
    fireEvent.click(screen.getByRole('button', { name: /Wikipedia/ }));

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByRole('status')).toHaveTextContent(/taking a while/);
    expect(screen.getByRole('link', { name: 'Open in a new tab' })).toBeInTheDocument();
  });
});

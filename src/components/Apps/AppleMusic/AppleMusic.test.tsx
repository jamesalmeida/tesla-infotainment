import { act, fireEvent, render, screen } from '@testing-library/react';
import { resetMediaLibrary } from '../../../apps/mediaLibrary';
import { AppleMusic } from './AppleMusic';

beforeEach(() => {
  localStorage.clear();
  resetMediaLibrary();
});

afterEach(() => {
  act(() => resetMediaLibrary());
});

test('browses sample albums, and plays one through the shared transport', async () => {
  const { container } = render(<AppleMusic />);

  fireEvent.click(await screen.findByRole('button', { name: /Glass Harbour/ }));
  fireEvent.click(screen.getByRole('button', { name: /Salt on the Dial/ }));

  const nowPlaying = screen.getByRole('region', { name: 'Now playing' });
  expect(nowPlaying).toHaveTextContent('Salt on the Dial');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(nowPlaying).toHaveTextContent('Harbour Lights');
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

  expect(container.querySelector('img')).toBeNull();
});

test('it says the library is a sample and uses no service branding', async () => {
  const { container } = render(<AppleMusic />);
  await screen.findByRole('button', { name: /Glass Harbour/ });

  expect(screen.getByRole('heading', { name: 'Music' })).toBeInTheDocument();
  expect(screen.getByText(/invented and have no audio/)).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/apple/i);
});

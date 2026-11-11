import { fireEvent, render, screen } from '@testing-library/react';
import { CarStateProvider } from '../../state/CarStateContext';
import { initialCarState } from '../../state/carState';
import UserProfile from './UserProfile';

const menus = () => screen.queryAllByText('Driver Profile Settings');

// A real press fires pointerdown before click, which is what closes the other menu.
const press = (element: Element) => {
  fireEvent.pointerDown(element);
  fireEvent.click(element);
};

const renderTwoProfiles = () => {
  render(
    <CarStateProvider initialState={initialCarState}>
      <UserProfile />
      <UserProfile />
    </CarStateProvider>,
  );
  return screen.getAllByRole('button', { name: /James/ });
};

test('only one profile menu can be open at a time', () => {
  const [first, second] = renderTwoProfiles();

  press(first);
  expect(menus()).toHaveLength(1);

  press(second);
  expect(menus()).toHaveLength(1);
});

test('an outside press and Escape both close the menu', () => {
  const [first] = renderTwoProfiles();

  press(first);
  fireEvent.pointerDown(document.body);
  expect(menus()).toHaveLength(0);

  press(first);
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(menus()).toHaveLength(0);
});

test('choosing a profile updates every profile button', () => {
  const [first] = renderTwoProfiles();

  press(first);
  fireEvent.click(screen.getByRole('button', { name: /Lauren/ }));

  expect(screen.getAllByRole('button', { name: /Lauren/ })).toHaveLength(2);
});

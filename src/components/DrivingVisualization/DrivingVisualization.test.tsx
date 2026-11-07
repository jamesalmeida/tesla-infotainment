import { render } from '@testing-library/react';
import { CarStateProvider } from '../../state/CarStateContext';
import { initialCarState, type CarState } from '../../state/carState';
import { DrivingVisualization } from './DrivingVisualization';

const renderScene = (state: CarState) =>
  render(
    <CarStateProvider initialState={state}>
      <DrivingVisualization />
    </CarStateProvider>,
  );

test('there is no road scene while parked', () => {
  const { container } = renderScene(initialCarState);
  expect(container.querySelector('.scene')).toBeNull();
});

test('a moving car shows lanes, traffic and the speed', () => {
  const { container } = renderScene({ ...initialCarState, gear: 'D', speed: 42 });
  const scene = container.querySelector('.scene');
  expect(scene).toBeInTheDocument();
  expect(scene?.querySelectorAll('.dash')).toHaveLength(14);
  expect(scene?.querySelectorAll('.traffic')).toHaveLength(3);
  expect(scene?.textContent).toContain('42 mph');
});

test('autopilot is called out in the scene', () => {
  const { container } = renderScene({
    ...initialCarState,
    gear: 'D',
    speed: 30,
    autopilot: 'cruise',
  });
  expect(container.querySelector('.autopilot')).toHaveTextContent('Autopilot');
});

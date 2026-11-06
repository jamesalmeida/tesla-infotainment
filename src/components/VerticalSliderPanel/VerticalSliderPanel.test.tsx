import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import VerticalSliderPanel from './VerticalSliderPanel';

const getPanel = (container: HTMLElement) => {
  const panel = container.querySelector<HTMLElement>('.vertical-slider-panel');
  if (!panel) throw new Error('Slider panel did not render');
  return panel;
};

const getHandle = (container: HTMLElement) => {
  const handle = container.querySelector('.slider-handle-area');
  if (!handle) throw new Error('Slider handle did not render');
  return handle;
};

const drag = (element: Element, fromY: number, toY: number) => {
  fireEvent.pointerDown(element, { pointerId: 1, clientY: fromY });
  fireEvent.pointerMove(element, { pointerId: 1, clientY: toY });
  fireEvent.pointerUp(element, { pointerId: 1, clientY: toY });
};

test('dragging the handle down closes the panel', () => {
  const onClose = vi.fn();
  const { container } = render(<VerticalSliderPanel isOpen onClose={onClose} />);

  drag(getHandle(container), 100, 200);

  expect(onClose).toHaveBeenCalledTimes(1);
});

test('dragging inside the panel never closes it', () => {
  const onClose = vi.fn();
  const { container } = render(<VerticalSliderPanel isOpen onClose={onClose} />);
  const content = container.querySelector('.slider-content');
  if (!content) throw new Error('Slider content did not render');

  drag(content, 100, 400);
  drag(getPanel(container), 100, 400);

  expect(onClose).not.toHaveBeenCalled();
  expect(getPanel(container).style.transform).toBe('');
});

test('a press without movement does not close the panel', () => {
  const onClose = vi.fn();
  const { container } = render(<VerticalSliderPanel isOpen onClose={onClose} />);

  drag(getHandle(container), 100, 101);

  expect(onClose).not.toHaveBeenCalled();
});

test('an interrupted touch leaves the panel where it was', () => {
  const onClose = vi.fn();
  const { container } = render(<VerticalSliderPanel isOpen onClose={onClose} />);
  const handle = getHandle(container);

  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 300 });
  expect(getPanel(container).style.transform).toBe('translateY(200px)');

  fireEvent.pointerCancel(handle, { pointerId: 1 });

  expect(onClose).not.toHaveBeenCalled();
  expect(getPanel(container).style.transform).toBe('');
});

test('a surface that cannot close has no handle', () => {
  const { container } = render(<VerticalSliderPanel isOpen canDismiss={false} onClose={vi.fn()} />);

  expect(container.querySelector('.slider-handle-area')).not.toBeInTheDocument();
});

import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import VerticalSliderPanel from './VerticalSliderPanel';

const getPanel = (container: HTMLElement) => {
  const panel = container.querySelector('.vertical-slider-panel');
  if (!panel) throw new Error('Slider panel did not render');
  return panel;
};

test('dragging down more than 50px closes the panel', () => {
  const onClose = vi.fn();
  const { container } = render(<VerticalSliderPanel isOpen onClose={onClose} />);
  const panel = getPanel(container);

  fireEvent.mouseDown(panel, { clientY: 100 });
  fireEvent.mouseMove(panel, { clientY: 200 });
  fireEvent.mouseUp(panel);

  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a plain click after a drag-to-close does not close the reopened panel', () => {
  const onClose = vi.fn();
  const { container, rerender } = render(<VerticalSliderPanel isOpen onClose={onClose} />);
  const panel = getPanel(container);

  fireEvent.mouseDown(panel, { clientY: 100 });
  fireEvent.mouseMove(panel, { clientY: 200 });
  fireEvent.mouseUp(panel);

  rerender(<VerticalSliderPanel isOpen={false} onClose={onClose} />);
  rerender(<VerticalSliderPanel isOpen onClose={onClose} />);
  onClose.mockClear();

  fireEvent.mouseDown(panel, { clientY: 300 });
  fireEvent.mouseUp(panel);

  expect(onClose).not.toHaveBeenCalled();
});

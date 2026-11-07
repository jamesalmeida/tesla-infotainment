import type { CarActions } from '../state/CarStateContext';

// The map keeps its search query to itself, so the one way in from outside is its own field.
// If the map ever takes a destination from the store, this function is the only thing to change.
export function navigateToPlace(
  place: string,
  { closeSurface, showNotice }: Pick<CarActions, 'closeSurface' | 'showNotice'>,
) {
  closeSurface();
  const input = document.getElementById('navigateTo');
  if (!(input instanceof HTMLInputElement)) {
    showNotice('Navigation is not available right now');
    return;
  }
  // React tracks the field's value, so it has to be set the way a keystroke would set it.
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, place);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  showNotice(`Searching the map for ${place}`);
}

import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import VolumeModal from './VolumeModal';

function Harness() {
  const [volume, setVolume] = useState(40);
  return (
    <VolumeModal
      volume={volume}
      isFading={false}
      onVolumeChange={setVolume}
      onActivity={() => {}}
      onOpenAudioSettings={() => {}}
    />
  );
}

test('mute takes the volume to zero and unmute restores it', () => {
  render(<Harness />);
  expect(screen.getByLabelText('Volume')).toHaveValue('40');

  fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
  expect(screen.getByLabelText('Volume')).toHaveValue('0');
  expect(screen.getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Unmute' }));
  expect(screen.getByLabelText('Volume')).toHaveValue('40');
});

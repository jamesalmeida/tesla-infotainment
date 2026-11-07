export interface MediaTransport {
  togglePlayPause: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  isPlaying: () => boolean;
}

let transport: MediaTransport | null = null;

// The player registers itself here while mounted, so nothing else has to reach into it.
export const setMediaTransport = (next: MediaTransport | null) => {
  transport = next;
};

export const getMediaTransport = () => transport;

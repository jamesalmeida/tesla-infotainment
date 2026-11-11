import { useState } from 'react';
import { GeneratedArt } from './GeneratedArt';

interface MediaArtProps {
  artworkUrl?: string;
  // What the drawn art is made from when there's no cover, or it fails to load.
  seed: string;
  className?: string;
}

// A cover when there is one, falling back to drawn art so a missing image never shows broken.
export function MediaArt({ artworkUrl, seed, className = '' }: MediaArtProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!artworkUrl || failedUrl === artworkUrl) {
    return <GeneratedArt seed={seed} className={className} />;
  }
  return (
    <img className={className} src={artworkUrl} alt="" onError={() => setFailedUrl(artworkUrl)} />
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppScreen, Tabs, ui } from '../../../apps/ui/AppScreen';
import { ClipCanvas } from './ClipCanvas';
import {
  CAMERA_LABEL,
  CAMERAS,
  deleteClip,
  formatClipDate,
  formatClipTime,
  groupByDay,
  loadChanges,
  sampleClips,
  saveChanges,
  saveClip,
  stampAt,
  visibleClips,
  type Camera,
  type Clip,
  type ClipChanges,
  type ClipFolder,
} from './clips';
import styles from './Dashcam.module.css';

const TABS = [
  { id: 'recent', label: 'Recent' },
  { id: 'saved', label: 'Saved' },
  { id: 'sentry', label: 'Sentry' },
] as const;

const EMPTY_FOLDER: Record<ClipFolder, string> = {
  recent: 'No recent clips. Clips are kept for 24 hours unless you save them.',
  saved: 'No saved clips. Open a recent clip and choose Save.',
  sentry: 'No Sentry clips.',
};

// Plays only when asked. It starts paused and stops at the end rather than looping.
function useClipClock(duration: number) {
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const secondsRef = useRef(0);

  const seek = (value: number) => {
    secondsRef.current = value;
    setSeconds(value);
  };

  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const next = Math.min(duration, secondsRef.current + (now - last) / 1000);
      last = now;
      secondsRef.current = next;
      setSeconds(next);
      if (next >= duration) setIsPlaying(false);
      else frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, duration]);

  const toggle = () => {
    if (!isPlaying && secondsRef.current >= duration) seek(0);
    setIsPlaying(!isPlaying);
  };

  return { seconds, isPlaying, seek, toggle };
}

function Player({
  clip,
  onBack,
  onSave,
  onDelete,
}: {
  clip: Clip;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const { seconds, isPlaying, seek, toggle } = useClipClock(clip.durationSeconds);
  const [focused, setFocused] = useState<Camera | null>(null);
  const [confirming, setConfirming] = useState(false);
  const cameras = focused ? [focused] : CAMERAS;

  return (
    <div className={styles.player}>
      <div className={styles.playerBar}>
        <button type="button" className={ui.button} onClick={onBack}>
          ‹ Clips
        </button>
        <div className={styles.playerTitle}>
          <div className={ui.strong}>{clip.title}</div>
          <div className={ui.muted}>{formatClipDate(clip.time)}</div>
        </div>
        {clip.folder === 'recent' && (
          <button type="button" className={ui.button} onClick={onSave}>
            Save
          </button>
        )}
        <button
          type="button"
          className={`${ui.button} ${confirming ? ui.danger : ''}`}
          onClick={confirming ? onDelete : () => setConfirming(true)}
        >
          {confirming ? 'Confirm delete' : 'Delete'}
        </button>
      </div>

      <div className={`${styles.stage} ${focused ? styles.stageFocused : ''}`}>
        {cameras.map((camera) => (
          <button
            key={camera}
            type="button"
            className={styles.view}
            aria-label={
              focused
                ? 'Show all cameras'
                : `Show only the ${CAMERA_LABEL[camera].toLowerCase()} camera`
            }
            onClick={() => setFocused(focused ? null : camera)}
          >
            <ClipCanvas clip={clip} camera={camera} seconds={seconds} />
            <span className={styles.viewLabel}>
              {CAMERA_LABEL[camera]} · {stampAt(clip, seconds)}
            </span>
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <button type="button" className={`${ui.button} ${ui.primary}`} onClick={toggle}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <input
          className={ui.range}
          type="range"
          aria-label="Scrub through the clip"
          min={0}
          max={clip.durationSeconds}
          step={0.1}
          value={seconds}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <span className={styles.time}>
          {formatClipTime(seconds)} / {formatClipTime(clip.durationSeconds)}
        </span>
      </div>
    </div>
  );
}

function ClipCard({ clip, onOpen }: { clip: Clip; onOpen: () => void }) {
  return (
    <li>
      <button type="button" className={styles.card} onClick={onOpen}>
        <span className={styles.thumb}>
          <ClipCanvas clip={clip} camera="front" seconds={clip.durationSeconds / 2} />
        </span>
        <span className={styles.cardText}>
          <span className={ui.strong}>{clip.title}</span>
          <span className={ui.muted}>
            {formatClipDate(clip.time)} · {formatClipTime(clip.durationSeconds)}
          </span>
        </span>
      </button>
    </li>
  );
}

export function Dashcam() {
  const [now] = useState(() => Date.now());
  const [folder, setFolder] = useState<ClipFolder>('recent');
  const [changes, setChanges] = useState(loadChanges);
  const [openId, setOpenId] = useState<string | null>(null);

  const clips = useMemo(() => visibleClips(sampleClips(now), changes, now), [changes, now]);
  const open = clips.find((clip) => clip.id === openId);
  const inFolder = clips.filter((clip) => clip.folder === folder);

  const update = (next: ClipChanges) => {
    saveChanges(next);
    setChanges(next);
  };

  if (open) {
    return (
      <AppScreen title="Dashcam" fixed>
        <Player
          key={open.id}
          clip={open}
          onBack={() => setOpenId(null)}
          onSave={() => update(saveClip(changes, open.id))}
          onDelete={() => {
            update(deleteClip(changes, open.id));
            setOpenId(null);
          }}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      title="Dashcam"
      toolbar={<Tabs tabs={TABS} value={folder} onChange={setFolder} label="Clip folders" />}
    >
      {inFolder.length === 0 ? (
        <div className={ui.muted}>{EMPTY_FOLDER[folder]}</div>
      ) : (
        groupByDay(inFolder).map(([day, dayClips]) => (
          <section key={day}>
            <h3 className={ui.sectionTitle}>{day}</h3>
            <ul className={styles.grid}>
              {dayClips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} onOpen={() => setOpenId(clip.id)} />
              ))}
            </ul>
          </section>
        ))
      )}
      <p className={ui.muted}>These clips are drawn by the simulator. No camera recorded them.</p>
    </AppScreen>
  );
}

import { AppScreen, Callout, ui } from '../../../apps/ui/AppScreen';
import { GeneratedArt } from '../../../apps/ui/GeneratedArt';
import { useCarActions } from '../../../state/CarStateContext';
import styles from './Radio.module.css';

// The shelf icon says which service this stands in for. The screen deliberately doesn't: it has
// no connection to one, so it shouldn't wear its name, its logo or a sign-in form.
function Placeholder({ title, kind }: { title: string; kind: string }) {
  const { toggleApp } = useCarActions();

  return (
    <AppScreen title={title}>
      <div className={styles.placeholder}>
        <GeneratedArt seed={title} className={styles.placeholderArt} />
        <Callout>
          This {kind} service isn&apos;t connected. It is a placeholder in a simulator, so there is
          no account, no catalogue and nothing to sign in to.
        </Callout>
        <div className={ui.inline}>
          <button
            type="button"
            className={`${ui.button} ${ui.primary}`}
            onClick={() => toggleApp('radio')}
          >
            Open Radio
          </button>
          <button type="button" className={ui.button} onClick={() => toggleApp('podcasts')}>
            Open Podcasts
          </button>
        </div>
      </div>
    </AppScreen>
  );
}

export const MusicStreamingPlaceholder = () => <Placeholder title="Music streaming" kind="music" />;

export const AudiobooksPlaceholder = () => <Placeholder title="Audiobooks" kind="audiobook" />;

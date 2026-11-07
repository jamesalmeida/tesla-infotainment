import { useEffect, useState, type FormEvent } from 'react';
import { AppScreen, Callout, ui } from '../../../apps/ui/AppScreen';
import { BOOKMARKS, resolveAddress, type Bookmark } from './address';
import styles from './Browser.module.css';

const WHY_FRAMES_FAIL =
  "Most websites send a header that tells browsers not to show them inside another page. It protects people from clickjacking, and a web page like this one can't get around it. So this can't be a full browser: sites that allow framing open here, and everything else opens in a new tab.";

const SLOW_FRAME_MS = 8000;

function TabLink({ url }: { url: string }) {
  return (
    <a className={ui.button} href={url} target="_blank" rel="noopener noreferrer">
      Open in a new tab
    </a>
  );
}

function Page({ url }: { url: string }) {
  const [isSlow, setIsSlow] = useState(false);
  const [isOffline, setIsOffline] = useState(() => navigator.onLine === false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_FRAME_MS);
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <div className={styles.page}>
      {isOffline && (
        <Callout tone="error">You appear to be offline, so this can&apos;t load.</Callout>
      )}
      {isSlow && (
        <Callout tone="warning" action={<TabLink url={url} />}>
          This page is taking a while. It may be offline, or it may have stopped allowing frames.
        </Callout>
      )}
      <iframe
        className={styles.frame}
        src={url}
        title="Web page"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        onLoad={() => setIsSlow(false)}
      />
    </div>
  );
}

export const Browser = () => {
  const [address, setAddress] = useState('');
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; url?: string } | null>(null);

  const go = (input: string) => {
    const destination = resolveAddress(input);
    if (!destination) return;
    if (destination.kind === 'refused') {
      setNotice({ text: destination.reason });
      return;
    }
    if (destination.kind === 'frame') {
      setNotice(null);
      setAddress(destination.url);
      setPageUrl(destination.url);
      return;
    }
    window.open(destination.url, '_blank', 'noopener,noreferrer');
    setNotice({
      text: "That site can't load inside this screen, so it was sent to a new tab.",
      url: destination.url,
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    go(address);
  };

  const openBookmark = (bookmark: Bookmark) => {
    setAddress(bookmark.url);
    go(bookmark.url);
  };

  return (
    <AppScreen
      title="Browser"
      fixed
      toolbar={
        <form className={styles.bar} onSubmit={handleSubmit}>
          {pageUrl && (
            <button type="button" className={ui.button} onClick={() => setPageUrl(null)}>
              Bookmarks
            </button>
          )}
          <input
            className={ui.input}
            aria-label="Address"
            placeholder="Search or enter address"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <button type="submit" className={`${ui.button} ${ui.primary}`}>
            Go
          </button>
        </form>
      }
    >
      {notice && (
        <Callout action={notice.url ? <TabLink url={notice.url} /> : undefined}>
          {notice.text}
        </Callout>
      )}
      {pageUrl ? (
        <Page key={pageUrl} url={pageUrl} />
      ) : (
        <div className={styles.home}>
          <h3 className={ui.sectionTitle}>Bookmarks</h3>
          <div className={styles.bookmarks}>
            {BOOKMARKS.map((bookmark) => {
              const where =
                resolveAddress(bookmark.url)?.kind === 'frame'
                  ? 'Opens here'
                  : 'Opens in a new tab';
              return (
                <button
                  key={bookmark.url}
                  type="button"
                  className={styles.bookmark}
                  aria-label={`${bookmark.label}, ${where.toLowerCase()}`}
                  onClick={() => openBookmark(bookmark)}
                >
                  <span className={styles.letter} aria-hidden="true">
                    {bookmark.label[0]}
                  </span>
                  <span className={ui.strong}>{bookmark.label}</span>
                  <span className={ui.muted}>{where}</span>
                </button>
              );
            })}
          </div>
          <h3 className={ui.sectionTitle}>Why most sites open in a new tab</h3>
          <p className={styles.why}>{WHY_FRAMES_FAIL}</p>
        </div>
      )}
    </AppScreen>
  );
};

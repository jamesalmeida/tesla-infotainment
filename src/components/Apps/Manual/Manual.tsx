import { useMemo, useState } from 'react';
import { AppScreen, Callout, ui } from '../../../apps/ui/AppScreen';
import { useCarActions } from '../../../state/CarStateContext';
import { MANUAL_TOPICS, searchManual, type ManualLink, type ManualTopic } from './manualContent';
import styles from './Manual.module.css';

function TopicLink({ link }: { link: ManualLink }) {
  const { toggleApp, openSettings, toggleModal } = useCarActions();

  const follow = () => {
    if ('app' in link) toggleApp(link.app);
    else if ('settings' in link) openSettings(link.settings);
    else toggleModal('shortcuts');
  };

  return (
    <button type="button" className={`${ui.button} ${ui.primary}`} onClick={follow}>
      {link.label}
    </button>
  );
}

function TopicPage({ topic, onBack }: { topic: ManualTopic; onBack: () => void }) {
  return (
    <article className={styles.page}>
      <button type="button" className={ui.button} onClick={onBack}>
        ‹ All topics
      </button>
      <div className={ui.muted}>{topic.section}</div>
      <h3 className={styles.pageTitle}>{topic.title}</h3>
      {topic.body.map((paragraph) => (
        <p key={paragraph} className={styles.paragraph}>
          {paragraph}
        </p>
      ))}
      {topic.links && (
        <div className={ui.inline}>
          {topic.links.map((link) => (
            <TopicLink key={link.label} link={link} />
          ))}
        </div>
      )}
    </article>
  );
}

const groupBySection = (topics: ManualTopic[]) => {
  const sections = new Map<string, ManualTopic[]>();
  topics.forEach((topic) => {
    sections.set(topic.section, [...(sections.get(topic.section) ?? []), topic]);
  });
  return [...sections];
};

export const Manual = () => {
  const [query, setQuery] = useState('');
  const [topicId, setTopicId] = useState<string | null>(null);

  const results = useMemo(() => searchManual(query), [query]);
  const topic = MANUAL_TOPICS.find((item) => item.id === topicId);

  const topicButton = (item: ManualTopic) => (
    <li key={item.id}>
      <button type="button" className={ui.row} onClick={() => setTopicId(item.id)}>
        <span className={ui.rowText}>
          <span className={ui.strong}>{item.title}</span>
          {query && <span className={`${ui.muted} ${styles.hit}`}>{item.section}</span>}
        </span>
        <span aria-hidden="true">›</span>
      </button>
    </li>
  );

  return (
    <AppScreen
      title="Owner's Manual"
      toolbar={
        <input
          className={ui.input}
          type="search"
          aria-label="Search the manual"
          placeholder="Search the manual"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setTopicId(null);
          }}
        />
      }
    >
      {topic ? (
        <TopicPage topic={topic} onBack={() => setTopicId(null)} />
      ) : results.length === 0 ? (
        <Callout>Nothing in the manual matches &ldquo;{query}&rdquo;.</Callout>
      ) : query ? (
        <ul className={ui.list}>{results.map(topicButton)}</ul>
      ) : (
        <div className={styles.sections}>
          {groupBySection(results).map(([section, topics]) => (
            <section key={section} className={styles.section}>
              <h3 className={ui.sectionTitle}>{section}</h3>
              <ul className={ui.list}>{topics.map(topicButton)}</ul>
            </section>
          ))}
        </div>
      )}
    </AppScreen>
  );
};

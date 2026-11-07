import { useEffect, useState } from 'react';
import {
  CONVERSATIONS,
  findContact,
  SIMULATED_ARRIVAL,
  type Conversation,
} from '../../../apps/phoneData';
import { AppScreen, Callout, ui } from '../../../apps/ui/AppScreen';
import { useCar } from '../../../state/CarStateContext';
import {
  formatAgo,
  loadRead,
  readOutText,
  saveRead,
  sortConversations,
  unreadCount,
} from './messageState';
import styles from './Messages.module.css';

const senderName = (conversation: Conversation) =>
  findContact(conversation.contactId)?.name ?? 'Unknown';

// Not every browser can speak, so the read-out is always on screen as well.
function useReadOut() {
  const volume = useCar((state) => state.volume);
  const [reading, setReading] = useState<string | null>(null);

  const stop = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setReading(null);
  };

  const start = (text: string) => {
    stop();
    setReading(text);
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume / 100;
    utterance.onend = () => setReading(null);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(
    () => () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return { reading, start, stop };
}

function Thread({
  conversation,
  onBack,
  onRead,
}: {
  conversation: Conversation;
  onBack: () => void;
  onRead: (text: string) => void;
}) {
  const sender = senderName(conversation);
  const received = conversation.messages.filter((message) => !message.fromMe);
  const latest = received[received.length - 1];

  return (
    <div className={ui.stack}>
      <div className={ui.inline}>
        <button type="button" className={ui.button} onClick={onBack}>
          ‹ All messages
        </button>
        <span className={ui.strong}>{sender}</span>
        {latest && (
          <button
            type="button"
            className={`${ui.button} ${ui.primary}`}
            onClick={() => onRead(readOutText(sender, latest.text))}
          >
            Read aloud
          </button>
        )}
      </div>
      <ol className={styles.thread}>
        {conversation.messages.map((message) => (
          <li key={message.id} className={message.fromMe ? styles.sent : styles.received}>
            <div className={styles.bubble}>{message.text}</div>
            <div className={ui.muted}>{formatAgo(message.minutesAgo)}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export const Messages = () => {
  const [conversations, setConversations] = useState(CONVERSATIONS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [read, setRead] = useState(loadRead);
  const { reading, start, stop } = useReadOut();

  const open = conversations.find((conversation) => conversation.contactId === openId);
  const hasArrived = conversations.some(
    (conversation) => conversation.contactId === SIMULATED_ARRIVAL.contactId,
  );

  const openConversation = (conversation: Conversation) => {
    const next = [
      ...new Set([
        ...read,
        ...conversation.messages.filter((item) => !item.fromMe).map((item) => item.id),
      ]),
    ];
    saveRead(next);
    setRead(next);
    setOpenId(conversation.contactId);
  };

  const simulateArrival = () => {
    const { contactId, text } = SIMULATED_ARRIVAL;
    setConversations((current) => [
      {
        contactId,
        messages: [{ id: `arrival-${Date.now()}`, fromMe: false, text, minutesAgo: 0 }],
      },
      ...current,
    ]);
    start(readOutText(findContact(contactId)?.name ?? 'Unknown', text));
  };

  return (
    <AppScreen
      title="Messages"
      toolbar={
        <button type="button" className={ui.button} disabled={hasArrived} onClick={simulateArrival}>
          Simulate new message
        </button>
      }
    >
      <div className={ui.stack}>
        {reading && (
          <Callout
            action={
              <button type="button" className={ui.button} onClick={stop}>
                Stop
              </button>
            }
          >
            <strong>Reading aloud:</strong> {reading}
          </Callout>
        )}
        {open ? (
          <Thread conversation={open} onBack={() => setOpenId(null)} onRead={start} />
        ) : (
          <>
            <ul className={ui.list}>
              {sortConversations(conversations).map((conversation) => {
                const last = conversation.messages[conversation.messages.length - 1];
                const unread = unreadCount(conversation, read);
                return (
                  <li key={conversation.contactId}>
                    <button
                      type="button"
                      className={ui.row}
                      onClick={() => openConversation(conversation)}
                    >
                      <span className={ui.rowText}>
                        <span className={ui.strong}>{senderName(conversation)}</span>
                        <span className={`${ui.muted} ${styles.preview}`}>{last.text}</span>
                      </span>
                      {unread > 0 && (
                        <span className={styles.badge} aria-label={`${unread} unread`}>
                          {unread}
                        </span>
                      )}
                      <span className={ui.muted}>{formatAgo(last.minutesAgo)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className={ui.muted}>
              Sample messages only. This app can&apos;t send anything, and nothing leaves this page.
            </p>
          </>
        )}
      </div>
    </AppScreen>
  );
};

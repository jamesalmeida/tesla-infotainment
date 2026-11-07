import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  describeVoiceCommand,
  parseVoiceCommand,
  type VoiceCommand,
} from '../../apps/voiceCommands';
import { getMediaTransport } from '../../state/mediaTransport';
import { useCar, useCarActions } from '../../state/CarStateContext';
import { activeApp, type CarState } from '../../state/carState';
import styles from './VoiceControl.module.css';

interface RecognitionAlternative {
  transcript: string;
}

interface RecognitionResult {
  isFinal: boolean;
  0: RecognitionAlternative;
}

interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult };
}

interface RecognitionErrorEvent {
  error: string;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => Recognition;

const recognitionConstructor = (): RecognitionConstructor | null => {
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
};

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': 'Microphone access is off. Allow it in your browser settings.',
  'service-not-allowed': 'Speech recognition is blocked by the browser.',
  'no-speech': "I didn't hear anything. Try again.",
  network: 'Speech recognition needs a connection.',
  aborted: 'Stopped listening.',
};

type VoiceStatus = 'idle' | 'listening' | 'done' | 'error' | 'unsupported';

function execute(
  command: VoiceCommand,
  state: CarState,
  actions: ReturnType<typeof useCarActions>,
) {
  switch (command.kind) {
    case 'navigate':
      window.dispatchEvent(new CustomEvent('tesla:navigate', { detail: { query: command.query } }));
      document.getElementById('navigateTo')?.focus();
      return;
    case 'temperature':
      actions.setTemperature('driver', command.value);
      return;
    case 'compartment':
      if ((state.openCompartment === command.compartment) !== command.open) {
        actions.toggleCompartment(command.compartment);
      }
      return;
    case 'app':
      if (activeApp(state) !== command.app) actions.toggleApp(command.app);
      return;
    case 'settings':
      actions.openSettings(command.panel);
      return;
    case 'gear':
      actions.selectGear(command.gear);
      return;
    case 'media': {
      const transport = getMediaTransport();
      if (!transport) return;
      if (command.action === 'play') transport.play();
      else if (command.action === 'pause') transport.pause();
      else if (command.action === 'next') transport.next();
      else transport.previous();
      return;
    }
    case 'lock':
      if (state.isLocked !== command.locked) actions.toggleLock();
      return;
    case 'headlights':
      actions.setSettings({ headlights: command.mode });
      return;
    case 'unknown':
      actions.showNotice(describeVoiceCommand(command));
  }
}

export function VoiceControl() {
  const enabled = useCar((state) => state.settings.assistantEnabled);
  const state = useCar((current) => current);
  const actions = useCarActions();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [message, setMessage] = useState('');
  const [typed, setTyped] = useState('');
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  if (!enabled) return null;

  const run = (transcript: string) => {
    const command = parseVoiceCommand(transcript);
    execute(command, state, actions);
    setMessage(describeVoiceCommand(command));
    setStatus(command.kind === 'unknown' ? 'error' : 'done');
  };

  const startListening = () => {
    const Constructor = recognitionConstructor();
    setIsOpen(true);
    setMessage('');
    if (!Constructor) {
      setStatus('unsupported');
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new Constructor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) run(result[0].transcript);
      }
    };
    recognition.onerror = (event) => {
      setMessage(ERROR_TEXT[event.error] ?? 'Voice control hit a problem.');
      setStatus('error');
    };
    recognition.onend = () => {
      setStatus((current) => (current === 'listening' ? 'idle' : current));
    };
    recognitionRef.current = recognition;
    setStatus('listening');
    recognition.start();
  };

  const submitTyped = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!typed.trim()) return;
    run(typed);
    setTyped('');
  };

  const close = () => {
    recognitionRef.current?.abort();
    setIsOpen(false);
    setStatus('idle');
    setMessage('');
  };

  return (
    <>
      <button
        type="button"
        className={styles.mic}
        aria-label="Voice control"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={startListening}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.backdrop} role="presentation" onClick={close}>
          <div
            className={styles.panel}
            role="dialog"
            aria-label="Voice control"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.heading}>
              <div>
                <p className={styles.kicker}>Voice control</p>
                <strong>
                  {status === 'listening'
                    ? 'Listening…'
                    : status === 'unsupported'
                      ? 'Type a command'
                      : 'Command'}
                </strong>
              </div>
              <button type="button" className={styles.close} onClick={close}>
                Close
              </button>
            </div>

            <p className={styles.note}>
              Demo only: commands run in this simulator. Speech recognition uses your browser.
            </p>

            <p className={styles.message} role="status" aria-label="Voice result">
              {message ||
                (status === 'listening'
                  ? 'Say “navigate to…”, “set temperature to 70”, or “open the trunk”.'
                  : status === 'unsupported'
                    ? 'This browser has no speech recognition, so type below.'
                    : 'Say or type a command.')}
            </p>

            <form className={styles.form} onSubmit={submitTyped}>
              <label className={styles.label} htmlFor="voiceCommand">
                Or type a command
              </label>
              <div className={styles.inputRow}>
                <input
                  id="voiceCommand"
                  value={typed}
                  placeholder="navigate to the nearest charger"
                  onChange={(event) => setTyped(event.target.value)}
                />
                <button type="submit" className={styles.send}>
                  Run
                </button>
              </div>
            </form>

            <p className={styles.examples}>
              Try: “open the browser”, “set the temperature to 72”, “lock the car”, “play”.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

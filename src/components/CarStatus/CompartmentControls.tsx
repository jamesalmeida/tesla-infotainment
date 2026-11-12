import { useLayoutEffect, useRef } from 'react';
import { useCar, useCarActions } from '../../state/CarStateContext';
import { isDriving } from '../../state/carState';
import CarLock from '../CarLock/CarLock';
import {
  getCompartmentAnchors,
  subscribeCompartmentAnchors,
  type PortPoint,
  type ScreenPoint,
} from '../VehicleModel/compartmentAnchors';

interface Leader {
  label: HTMLButtonElement;
  line: SVGLineElement;
  anchor: ScreenPoint | null;
  hang: ScreenPoint | null;
}

// Below this the car's view is too short to hang labels over it, as on a phone, so they
// keep to their row.
const MIN_STAGE_HEIGHT = 220;

// The space between a line and its label's text.
const GAP = 8;
// The indicator column runs down the left, so a label never goes further left than this.
const LEFT_GUTTER = 48;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

// Until the car says where its parts are (or with no 3D car at all), a label stays where it
// sits in the row, still a button, without its line.
const hide = ({ label, line }: Leader) => {
  label.style.transform = '';
  line.style.visibility = 'hidden';
};

// Moves an element from where it sits in the row to a point in the row's own space.
const moveTo = (element: HTMLElement, left: number, top: number) => {
  element.style.transform = `translate(${left - element.offsetLeft}px, ${top - element.offsetTop}px)`;
};

// Hangs a label beside a vertical line that drops from above its part of the car down to it,
// as the car's own screen does: the text reads to the right of the line, unless that would
// run off the edge, when it moves to the left.
// The text never comes lower than the roofline, so it stays clear of the car wherever the
// camera is.
function placeLeader(
  { label, line, anchor, hang }: Leader & { anchor: ScreenPoint; hang: ScreenPoint },
  origin: DOMRect,
  roofline: number | null,
) {
  const width = label.offsetWidth;
  const x = hang.x - origin.left;
  const highest = roofline === null ? Infinity : roofline - origin.top - label.offsetHeight;
  const top = Math.max(Math.min(hang.y - origin.top, highest), -origin.top);
  const fitsRight = x + GAP + width <= origin.width;
  const side = fitsRight || x - GAP - width < LEFT_GUTTER ? 'right' : 'left';
  label.dataset.side = side;
  const left =
    side === 'right'
      ? clamp(x + GAP, LEFT_GUTTER, origin.width - width)
      : clamp(x - GAP - width, LEFT_GUTTER, origin.width - width);
  moveTo(label, left, top);

  line.setAttribute('x1', `${x}`);
  line.setAttribute('y1', `${top}`);
  line.setAttribute('x2', `${anchor.x - origin.left}`);
  line.setAttribute('y2', `${anchor.y - origin.top}`);
  line.style.visibility = 'visible';
}

// How far out from the charge port its button sits, as on the car: a short line, then the bolt.
const PORT_REACH = 34;

function placePort(
  button: HTMLButtonElement,
  line: SVGLineElement,
  port: PortPoint | null,
  origin: DOMRect,
) {
  if (!port) {
    button.style.visibility = 'hidden';
    line.style.visibility = 'hidden';
    return;
  }
  const x = port.x - origin.left;
  const y = port.y - origin.top;
  const half = button.offsetWidth / 2;
  const centre = clamp(x + port.side * (PORT_REACH + half), half, origin.width - half);
  button.style.transform = `translate(${centre - half}px, ${y - button.offsetHeight / 2}px)`;
  button.style.visibility = 'visible';
  line.setAttribute('x1', `${x}`);
  line.setAttribute('y1', `${y}`);
  line.setAttribute('x2', `${centre - port.side * (half - 10)}`);
  line.setAttribute('y2', `${y}`);
  line.style.visibility = 'visible';
}

export function CompartmentControls() {
  const driving = useCar(isDriving);
  const openCompartment = useCar((state) => state.openCompartment);
  const portOpen = useCar((state) => state.chargePortOpen);
  const { toggleCompartment, toggleChargePort } = useCarActions();

  const rootRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const frunkLabel = useRef<HTMLButtonElement>(null);
  const trunkLabel = useRef<HTMLButtonElement>(null);
  const frunkLine = useRef<SVGLineElement>(null);
  const trunkLine = useRef<SVGLineElement>(null);
  const portButton = useRef<HTMLButtonElement>(null);
  const portLine = useRef<SVGLineElement>(null);
  const lockLine = useRef<SVGLineElement>(null);

  // Drawn straight onto the elements rather than through state: the car can move every frame.
  useLayoutEffect(() => {
    const draw = () => {
      const root = rootRef.current;
      const lock = lockRef.current;
      if (!root || !lock || !frunkLabel.current || !trunkLabel.current) return;
      if (!frunkLine.current || !trunkLine.current) return;
      const stage = document.querySelector('.vehicleStage canvas');
      const roomy = !stage || stage.getBoundingClientRect().height >= MIN_STAGE_HEIGHT;
      const anchors = getCompartmentAnchors();
      const origin = root.getBoundingClientRect();
      if (portButton.current && portLine.current) {
        placePort(portButton.current, portLine.current, anchors.chargePort, origin);
      }
      const leaders: Leader[] = [
        {
          label: frunkLabel.current,
          line: frunkLine.current,
          anchor: anchors.frunk,
          hang: anchors.frunkLabel ?? null,
        },
        {
          label: trunkLabel.current,
          line: trunkLine.current,
          anchor: anchors.trunk,
          hang: anchors.trunkLabel ?? null,
        },
      ];
      for (const leader of leaders) {
        if (roomy && leader.anchor && leader.hang) {
          placeLeader(
            { ...leader, anchor: leader.anchor, hang: leader.hang },
            origin,
            anchors.roof?.y ?? null,
          );
        } else {
          hide(leader);
        }
      }

      // The lock hangs above the roof, and its line stops short of it.
      const { lockIcon, roofLine } = anchors;
      const lockShown = getComputedStyle(lock).display !== 'none';
      if (roomy && lockIcon && lockShown) {
        const centre = clamp(
          lockIcon.x - origin.left,
          LEFT_GUTTER + lock.offsetWidth / 2,
          origin.width - lock.offsetWidth / 2,
        );
        const top = Math.max(lockIcon.y - origin.top - lock.offsetHeight, -origin.top);
        moveTo(lock, centre - lock.offsetWidth / 2, top);
        const lineTop = top + lock.offsetHeight + GAP;
        const lineEnd = roofLine ? roofLine.y - origin.top : lineTop;
        if (lockLine.current && lineEnd > lineTop) {
          lockLine.current.setAttribute('x1', `${centre}`);
          lockLine.current.setAttribute('y1', `${lineTop}`);
          lockLine.current.setAttribute('x2', `${centre}`);
          lockLine.current.setAttribute('y2', `${lineEnd}`);
          lockLine.current.style.visibility = 'visible';
        } else if (lockLine.current) {
          lockLine.current.style.visibility = 'hidden';
        }
      } else {
        lock.style.transform = '';
        if (lockLine.current) lockLine.current.style.visibility = 'hidden';
      }
    };
    draw();
    const unsubscribe = subscribeCompartmentAnchors(draw);
    window.addEventListener('resize', draw);
    return () => {
      unsubscribe();
      window.removeEventListener('resize', draw);
    };
  }, []);

  return (
    <div ref={rootRef} className={`carModelStatus ${driving ? 'fade-out' : 'fade-in'}`}>
      <svg className="compartmentLeaders" aria-hidden="true">
        <line ref={frunkLine} />
        <line ref={trunkLine} />
        <line ref={portLine} />
        <line ref={lockLine} />
      </svg>
      <button
        ref={portButton}
        type="button"
        className={`chargePortBtn ${portOpen ? 'open' : ''}`}
        aria-label={portOpen ? 'Close charge port' : 'Open charge port'}
        aria-pressed={portOpen}
        onClick={toggleChargePort}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2 5 13.5h6L10 22l8-11.5h-6Z" />
        </svg>
      </button>
      <button
        ref={frunkLabel}
        type="button"
        className="toggleFrunk no-select"
        data-side="right"
        onClick={() => toggleCompartment('frunk')}
      >
        {openCompartment === 'frunk' ? 'Close' : 'Open'}
        <br />
        <span className="frunk">Frunk</span>
      </button>
      <div ref={lockRef} className="toggleLocks">
        <CarLock />
      </div>
      <button
        ref={trunkLabel}
        type="button"
        className="toggleTrunk no-select"
        data-side="right"
        onClick={() => toggleCompartment('trunk')}
      >
        {openCompartment === 'trunk' ? 'Close' : 'Open'}
        <br />
        <span className="trunk">Trunk</span>
      </button>
    </div>
  );
}

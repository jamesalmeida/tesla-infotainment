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
  dot: SVGCircleElement;
  anchor: ScreenPoint | null;
}

const GAP = 6;
// The indicator column runs down the left beside the labels, so they stop short of it.
const LEFT_GUTTER = 48;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const hide = ({ label, line, dot }: Leader) => {
  label.style.transform = '';
  line.style.visibility = 'hidden';
  dot.style.visibility = 'hidden';
};

// Slides a label so its bar sits over its part of the car and runs a line down to it. The
// label on the left keeps its bar on its right edge and the other the opposite, so the two
// never cover each other or the lock; near the middle the line leans instead.
function placeLeader(
  { label, line, dot, anchor }: Leader & { anchor: ScreenPoint },
  side: 'left' | 'right',
  origin: DOMRect,
  bounds: { min: number; max: number },
) {
  label.dataset.side = side;
  const width = label.offsetWidth;
  const anchorX = anchor.x - origin.left;
  const edge =
    side === 'left'
      ? clamp(anchorX, width + LEFT_GUTTER, bounds.max)
      : clamp(anchorX, bounds.min, origin.width - width - GAP);
  const flowEdge = side === 'left' ? label.offsetLeft + width : label.offsetLeft;
  label.style.transform = `translateX(${edge - flowEdge}px)`;

  const top = label.offsetTop + label.offsetHeight;
  const x2 = anchorX;
  const y2 = anchor.y - origin.top;
  line.setAttribute('x1', `${edge}`);
  line.setAttribute('y1', `${top}`);
  line.setAttribute('x2', `${x2}`);
  line.setAttribute('y2', `${y2}`);
  dot.setAttribute('cx', `${x2}`);
  dot.setAttribute('cy', `${y2}`);
  line.style.visibility = 'visible';
  dot.style.visibility = 'visible';
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
  const frunkDot = useRef<SVGCircleElement>(null);
  const trunkDot = useRef<SVGCircleElement>(null);
  const portButton = useRef<HTMLButtonElement>(null);
  const portLine = useRef<SVGLineElement>(null);
  const lockLine = useRef<SVGLineElement>(null);

  // Drawn straight onto the elements rather than through state: the car can move every frame.
  useLayoutEffect(() => {
    const draw = () => {
      const root = rootRef.current;
      const lock = lockRef.current;
      if (
        !root ||
        !lock ||
        !frunkLabel.current ||
        !trunkLabel.current ||
        !frunkLine.current ||
        !trunkLine.current ||
        !frunkDot.current ||
        !trunkDot.current
      ) {
        return;
      }
      const { frunk, trunk, chargePort, roof } = getCompartmentAnchors();
      if (portButton.current && portLine.current) {
        placePort(portButton.current, portLine.current, chargePort, root.getBoundingClientRect());
      }
      const frunkLeader: Leader = {
        label: frunkLabel.current,
        line: frunkLine.current,
        dot: frunkDot.current,
        anchor: frunk,
      };
      const trunkLeader: Leader = {
        label: trunkLabel.current,
        line: trunkLine.current,
        dot: trunkDot.current,
        anchor: trunk,
      };
      if (!frunk || !trunk) {
        hide(frunkLeader);
        hide(trunkLeader);
        return;
      }

      const origin = root.getBoundingClientRect();
      // The lock slides over the roof, as the labels do over their lids, keeping room for a
      // label either side, and runs its own line down to the roof.
      let lockShift = 0;
      const lockShown = getComputedStyle(lock).display !== 'none';
      if (roof && lockShown) {
        const margin = Math.max(frunkLabel.current.offsetWidth, trunkLabel.current.offsetWidth);
        const centre = clamp(
          roof.x - origin.left,
          LEFT_GUTTER + margin + GAP * 2 + lock.offsetWidth / 2,
          origin.width - margin - GAP * 2 - lock.offsetWidth / 2,
        );
        lockShift = centre - (lock.offsetLeft + lock.offsetWidth / 2);
        lock.style.transform = `translateX(${lockShift}px)`;
        if (lockLine.current) {
          lockLine.current.setAttribute('x1', `${centre}`);
          lockLine.current.setAttribute('y1', `${lock.offsetTop + lock.offsetHeight}`);
          lockLine.current.setAttribute('x2', `${roof.x - origin.left}`);
          lockLine.current.setAttribute('y2', `${roof.y - origin.top}`);
          lockLine.current.style.visibility = 'visible';
        }
      } else {
        lock.style.transform = '';
        if (lockLine.current) lockLine.current.style.visibility = 'hidden';
      }
      // A hidden lock (phones on their side) leaves the middle of the row free.
      const lockLeft = lock.offsetWidth ? lock.offsetLeft + lockShift : origin.width / 2;
      const lockRight = lock.offsetWidth
        ? lock.offsetLeft + lock.offsetWidth + lockShift
        : origin.width / 2;
      const frunkFirst = frunk.x <= trunk.x;
      const [left, right] = frunkFirst ? [frunkLeader, trunkLeader] : [trunkLeader, frunkLeader];
      const bounds = { min: lockRight + GAP, max: lockLeft - GAP };
      placeLeader({ ...left, anchor: left.anchor! }, 'left', origin, bounds);
      placeLeader({ ...right, anchor: right.anchor! }, 'right', origin, bounds);
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
        <circle ref={frunkDot} r="2.5" />
        <line ref={trunkLine} />
        <circle ref={trunkDot} r="2.5" />
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
        data-side="left"
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

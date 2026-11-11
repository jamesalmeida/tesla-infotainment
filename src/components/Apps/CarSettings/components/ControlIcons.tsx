import type { ReactNode } from 'react';

// Small line icons for the quick controls, drawn in the text colour so they follow the tile's
// state. Each is decoration beside a visible or hidden label, so none is announced.
function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export const SunIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" />
  </Icon>
);

export const WiperIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M3.5 8.5c5.5-3.5 11.5-3.5 17 0l-3 8.5c-3.6-1.6-7.4-1.6-11 0z" />
    <path d="M12 15.5 8.5 7.5" />
  </Icon>
);

export const HighBeamIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M13 6.5c4.5 0 6.5 2.5 6.5 5.5s-2 5.5-6.5 5.5z" />
    <path d="M3.5 8h6M3.5 12h6M3.5 16h6" />
  </Icon>
);

export const FoldMirrorIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4.5 16.5 6 10c.4-1.6 1.6-2.5 3.2-2.5h5.3c2.8 0 5 1.8 5 4.5v4.5z" />
  </Icon>
);

export const ChildLockIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M8.5 10V8a3.5 3.5 0 0 1 7 0v2" />
    <rect x="6" y="10" width="12" height="10" rx="2" />
    <circle cx="12" cy="13.2" r="1.3" />
    <path d="M10.2 18c.3-1.4 1-2.1 1.8-2.1s1.5.7 1.8 2.1" />
  </Icon>
);

export const WindowLockIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 18V10l5-5h11v13z" />
    <path d="M11 11.5V10.5a2 2 0 0 1 4 0v1" />
    <rect x="10" y="11.5" width="6" height="4" rx="1" />
  </Icon>
);

export const VentWindowIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 18V10l5-5h11v13z" />
    <path d="M6.5 10.5h11" />
    <path d="M9 3.5c.6.6.6 1.4 0 2M13 3.5c.6.6.6 1.4 0 2M17 3.5c.6.6.6 1.4 0 2" />
  </Icon>
);

export const GloveboxIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="4" y="5" width="16" height="10" rx="2" />
    <path d="M10 18.5 12 20l2-1.5M10 11h4" />
  </Icon>
);

export const MirrorAdjustIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M2.5 16.5 3.6 11.5c.3-1.3 1.3-2 2.6-2h4.2c2.2 0 3.6 1.4 3.6 3.5v3.5z" />
    <path d="M19 4.5v15M16.8 6.7 19 4.5l2.2 2.2M16.8 17.3l2.2 2.2 2.2-2.2" />
  </Icon>
);

export const SteeringAdjustIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="8.5" cy="12" r="6.5" />
    <path d="M2.3 10.5c4-1.4 8.4-1.4 12.4 0M8.5 13.5v5" />
    <circle cx="8.5" cy="12" r="1.5" />
    <path d="M19.5 4.5v15M17.3 6.7l2.2-2.2 2.2 2.2M17.3 17.3l2.2 2.2 2.2-2.2" />
  </Icon>
);

export const CameraIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <rect x="3.5" y="6" width="17" height="12" rx="2" />
    <circle cx="10" cy="12" r="3" />
    <path d="M16.5 9h.5" />
  </Icon>
);

export const SentryIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" />
  </Icon>
);

export const CarWashIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M5 17v-3.5l1.8-4c.3-.6.8-1 1.5-1h7.4c.7 0 1.2.4 1.5 1l1.8 4V17z" />
    <path d="M5 17v2M19 17v2M8 14h.5M15.5 14h.5" />
    <path d="M9 3.5 8.3 5a.8.8 0 0 0 1.4 0zM15 3.5 14.3 5a.8.8 0 0 0 1.4 0z" />
  </Icon>
);

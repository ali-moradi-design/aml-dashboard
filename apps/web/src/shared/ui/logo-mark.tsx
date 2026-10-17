import { useId } from "react";

/** The "signal path" mark: transaction dots rising to the alert. Same mark in both themes. */
export const LogoMark = ({ size = 36 }: { size?: number }) => {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#003F88" />
          <stop offset="1" stopColor="#00296B" />
        </linearGradient>
        <linearGradient id={`${id}-path`} x1="8" y1="25" x2="26" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8DB8EC" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="10" fill={`url(#${id}-tile)`} />
      <rect x="0.5" y="0.5" width="35" height="35" rx="9.5" stroke="#8DB8EC" strokeOpacity="0.25" />
      <path d="M8.5 24.5 14 19l4.5 3.5 6-8.5" stroke={`url(#${id}-path)`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="24.5" r="1.9" fill="#8DB8EC" />
      <circle cx="14" cy="19" r="1.9" fill="#A9C9F0" />
      <circle cx="18.5" cy="22.5" r="1.9" fill="#C6DCF5" />
      <circle cx="25.5" cy="12.5" r="6" stroke="#5B9BE0" strokeWidth="1.5" />
      <circle cx="25.5" cy="12.5" r="3" fill="#FFFFFF" />
    </svg>
  );
};

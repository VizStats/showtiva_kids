import type { SVGProps } from "react";

/**
 * The app's icon set.
 *
 * Drawn for small hands and early readers: chunky 2.25px rounded strokes, a
 * soft duotone fill (currentColor at low opacity) so each icon reads as an
 * object rather than an outline, and familiar things (a house, a heart, a
 * padlock) rather than abstract glyphs. Sized by the caller through
 * className; decorative unless given a title.
 */
export type IconName =
  | "home"
  | "friends"
  | "search"
  | "heart"
  | "heart-filled"
  | "lock"
  | "play"
  | "pause"
  | "back"
  | "close"
  | "chevron-left"
  | "chevron-right"
  | "rewind"
  | "forward"
  | "volume"
  | "mute"
  | "expand"
  | "shrink"
  | "timer"
  | "shield"
  | "profiles"
  | "no-ads"
  | "sparkle"
  | "plus"
  | "check"
  | "trash"
  | "moon"
  | "backspace"
  | "next"
  | "replay"
  | "tv"
  | "trail"
  | "star"
  | "film";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  title?: string;
}

const FILL = { fill: "currentColor", fillOpacity: 0.16 } as const;

function paths(name: IconName) {
  switch (name) {
    case "home":
      return (
        <>
          <path d="M4 10.6 12 4l8 6.6V19a1.5 1.5 0 0 1-1.5 1.5h-4v-5.5h-5v5.5h-4A1.5 1.5 0 0 1 4 19z" {...FILL} />
          <path d="M4 10.6 12 4l8 6.6V19a1.5 1.5 0 0 1-1.5 1.5h-4v-5.5h-5v5.5h-4A1.5 1.5 0 0 1 4 19z" />
        </>
      );
    case "friends":
      return (
        <>
          <circle cx="8.5" cy="9" r="3.2" {...FILL} />
          <circle cx="8.5" cy="9" r="3.2" />
          <path d="M3 19.5c.6-3.1 2.8-5 5.5-5s4.9 1.9 5.5 5" />
          <circle cx="16.5" cy="8" r="2.6" {...FILL} />
          <circle cx="16.5" cy="8" r="2.6" />
          <path d="M15.4 13.4c.4-.1.7-.1 1.1-.1 2.3 0 4.1 1.6 4.6 4.3" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="10.5" cy="10.5" r="6" {...FILL} />
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="m15 15 5 5" />
        </>
      );
    case "heart":
      return (
        <>
          <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" {...FILL} />
          <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" />
        </>
      );
    case "heart-filled":
      return <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" fill="currentColor" />;
    case "lock":
      return (
        <>
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" {...FILL} />
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
          <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
          <path d="M12 14.5v2" />
        </>
      );
    case "play":
      return <path d="M8 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.8l-10-6.4A1 1 0 0 0 8 5.6z" fill="currentColor" stroke="none" />;
    case "pause":
      return (
        <>
          <rect x="6.5" y="5" width="4" height="14" rx="1.6" fill="currentColor" stroke="none" />
          <rect x="13.5" y="5" width="4" height="14" rx="1.6" fill="currentColor" stroke="none" />
        </>
      );
    case "back":
      return <path d="M14.5 5.5 8 12l6.5 6.5" />;
    case "chevron-left":
      return <path d="M14.5 6 8.5 12l6 6" />;
    case "chevron-right":
      return <path d="m9.5 6 6 6-6 6" />;
    case "close":
      return <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />;
    case "rewind":
      return (
        <>
          <path d="M5 12a7 7 0 1 0 2.2-5.1" />
          <path d="M4.5 3.8v3.9h3.9" />
          <text x="12" y="15.2" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="currentColor" stroke="none" fontFamily="inherit">10</text>
        </>
      );
    case "forward":
      return (
        <>
          <path d="M19 12a7 7 0 1 1-2.2-5.1" />
          <path d="M19.5 3.8v3.9h-3.9" />
          <text x="12" y="15.2" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="currentColor" stroke="none" fontFamily="inherit">10</text>
        </>
      );
    case "volume":
      return (
        <>
          <path d="M4 9.5h3l4.5-4v13l-4.5-4H4z" {...FILL} />
          <path d="M4 9.5h3l4.5-4v13l-4.5-4H4z" />
          <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      );
    case "mute":
      return (
        <>
          <path d="M4 9.5h3l4.5-4v13l-4.5-4H4z" {...FILL} />
          <path d="M4 9.5h3l4.5-4v13l-4.5-4H4z" />
          <path d="m16 9.5 5 5M21 9.5l-5 5" />
        </>
      );
    case "expand":
      return <path d="M4.5 9V5.5a1 1 0 0 1 1-1H9M15 4.5h3.5a1 1 0 0 1 1 1V9M19.5 15v3.5a1 1 0 0 1-1 1H15M9 19.5H5.5a1 1 0 0 1-1-1V15" />;
    case "shrink":
      return <path d="M9 4.5V8a1 1 0 0 1-1 1H4.5M19.5 9H16a1 1 0 0 1-1-1V4.5M15 19.5V16a1 1 0 0 1 1-1h3.5M4.5 15H8a1 1 0 0 1 1 1v3.5" />;
    case "timer":
      return (
        <>
          <circle cx="12" cy="13.5" r="7" {...FILL} />
          <circle cx="12" cy="13.5" r="7" />
          <path d="M12 9.5v4l2.5 1.8M10 3h4M18.5 6.5l1.2-1.2" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M12 3.5 5 6v5.5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6z" {...FILL} />
          <path d="M12 3.5 5 6v5.5c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6z" />
          <path d="m8.8 12.2 2.2 2.2 4.2-4.4" />
        </>
      );
    case "profiles":
      return (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="4" {...FILL} />
          <rect x="3.5" y="4.5" width="17" height="15" rx="4" />
          <circle cx="12" cy="10.5" r="2.6" />
          <path d="M7.8 17c.8-1.9 2.4-3 4.2-3s3.4 1.1 4.2 3" />
        </>
      );
    case "no-ads":
      return (
        <>
          <rect x="3.5" y="6" width="17" height="12" rx="3" {...FILL} />
          <rect x="3.5" y="6" width="17" height="12" rx="3" />
          <path d="M5 19.5 19 4.5" />
        </>
      );
    case "sparkle":
      return (
        <>
          <path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z" {...FILL} />
          <path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z" />
          <path d="M18.5 16.5v4M16.5 18.5h4" />
        </>
      );
    case "plus":
      return <path d="M12 5v14M5 12h14" />;
    case "check":
      return <path d="m5.5 12.5 4.2 4.2 8.8-9.2" />;
    case "trash":
      return (
        <>
          <path d="M6 7.5h12l-1 11.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19z" {...FILL} />
          <path d="M6 7.5h12l-1 11.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19zM4.5 7.5h15M9.5 7.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2.5" />
        </>
      );
    case "moon":
      return (
        <>
          <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" {...FILL} />
          <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />
        </>
      );
    case "backspace":
      return (
        <>
          <path d="M9 5.5h10a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3.5 12z" {...FILL} />
          <path d="M9 5.5h10a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3.5 12z" />
          <path d="m11.5 9.5 5 5M16.5 9.5l-5 5" />
        </>
      );
    case "next":
      return (
        <>
          <path d="M5.5 6.2v11.6a.9.9 0 0 0 1.4.8l8.4-5.8a1 1 0 0 0 0-1.6L6.9 5.4a.9.9 0 0 0-1.4.8z" fill="currentColor" stroke="none" />
          <path d="M18.5 5.5v13" />
        </>
      );
    case "replay":
      return (
        <>
          <path d="M5 12a7 7 0 1 0 2.2-5.1" />
          <path d="M4.5 3.8v3.9h3.9" />
          <path d="M10.5 9.5v5l4-2.5z" fill="currentColor" />
        </>
      );
    case "trail":
      return (
        <>
          <path d="M6.5 21V3.5" />
          <path d="M6.5 4h11l-2.4 4 2.4 4h-11z" {...FILL} />
          <path d="M6.5 4h11l-2.4 4 2.4 4h-11" />
          <path d="M3.5 21h6" />
        </>
      );
    case "star":
      return <path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z" fill="currentColor" stroke="none" />;
    case "film":
      return (
        <>
          <rect x="3.5" y="5" width="17" height="14" rx="3" {...FILL} />
          <rect x="3.5" y="5" width="17" height="14" rx="3" />
          <path d="M8 5v14M16 5v14M3.5 9.5H8M3.5 14.5H8M16 9.5h4.5M16 14.5h4.5" />
        </>
      );
    case "tv":
      return (
        <>
          <rect x="3.5" y="7" width="17" height="12" rx="3" {...FILL} />
          <rect x="3.5" y="7" width="17" height="12" rx="3" />
          <path d="m8.5 3.5 3.5 3.5 3.5-3.5" />
        </>
      );
  }
}

export default function Icon({ name, title, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "size-6"}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {paths(name)}
    </svg>
  );
}

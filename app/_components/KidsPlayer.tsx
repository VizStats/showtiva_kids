"use client";

// The theatre. Built for small hands rather than for film buffs: one big
// play button, a jump back and a jump forward, a thick scrubber whose handle
// is the host's own face, and nothing else to find. No speed menu, no
// quality menu, no subtitle tracks to open by accident.
//
// When an episode ends there is no autoplay into a stranger's video: the next
// episode of the same show is offered with a short countdown, and the last
// one ends on the host waving goodbye.

import { useCallback, useEffect, useRef, useState } from "react";

import { cx, tint } from "@/lib/cx";
import type { Character } from "@/lib/catalog-types";

import { seeded } from "./ShowArt";
import Face from "./Face";
import Icon from "./Icon";

export interface PlayerItem {
  /** "feature" or "s1e3", the progress key. */
  key: string;
  /** "S1 · E3", or the format for a movie. */
  label: string;
  title: string;
  videoUrl: string | null;
}

interface KidsPlayerProps {
  showId: string;
  showTitle: string;
  host: Character;
  items: PlayerItem[];
  startKey: string;
  /** Seconds into the start item to open at. */
  resumeAt?: number;
  onClose: () => void;
  /** Where playback is, every few seconds and on pause, end and close. */
  onProgress: (key: string, seconds: number, duration: number) => void;
  /** Tells the page which item is playing, so its list can follow. */
  onItemChange?: (key: string) => void;
  /** Called when the last item ends. When given, it replaces the end screen:
   *  the trail closes the theatre itself and celebrates on its own page. */
  onFinished?: () => void;
  /**
   * Play in place, as a 16:9 box in the page, rather than taking over the
   * screen. The page shows the title and what's next around it; the box
   * keeps only the controls, sized to the box, until it goes full screen.
   */
  inline?: boolean;
}

/* Stand-in footage until real files exist: Big Buck Bunny, an open-licence
   (CC BY 3.0, Blender Foundation) all-ages cartoon, from Wikimedia Commons,
   with a short H.264 cut for browsers without WebM. Each item opens the
   long file at its own point, so episodes do not all look like the same
   video restarting. */
const STAND_IN = [
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.720p.vp9.webm",
    type: "video/webm",
  },
  { src: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4", type: "video/mp4" },
];

const HIDE_AFTER_MS = 3000;
const SKIP = 10;
const NEXT_COUNTDOWN = 8;

function offsetFor(showId: string, key: string): number {
  return Math.floor(seeded(`${showId}:${key}`)() * 480);
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function KidsPlayer({
  showId,
  showTitle,
  host,
  items,
  startKey,
  resumeAt,
  onClose,
  onProgress,
  onItemChange,
  onFinished,
  inline = false,
}: KidsPlayerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [key, setKey] = useState(startKey);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [muted, setMuted] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [ended, setEnded] = useState(false);
  const [countdown, setCountdown] = useState(NEXT_COUNTDOWN);
  const [fullscreen, setFullscreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [flash, setFlash] = useState<{ dir: "back" | "forward"; n: number } | null>(null);

  const index = Math.max(0, items.findIndex((item) => item.key === key));
  const item = items[index];
  const next = items[index + 1];
  const custom = item.videoUrl;

  // The stand-in opens part way in; everything the viewer sees (time, the
  // scrubber, saved progress) is measured from that point, so it behaves
  // like a file of its own.
  const offset = custom ? 0 : offsetFor(showId, key);
  const pendingResume = useRef<number>(key === startKey ? (resumeAt ?? 0) : 0);
  // The offset actually applied once the file's length is known: a short
  // fallback file cannot open minutes in, so it plays from its top instead.
  const base = useRef(0);
  const latestKey = useRef(key);
  useEffect(() => {
    latestKey.current = key;
  }, [key]);

  const report = useCallback(
    (video: HTMLVideoElement | null, atEnd = false) => {
      if (!video || !Number.isFinite(video.duration)) return;
      const d = video.duration - base.current;
      onProgress(latestKey.current, atEnd ? d : video.currentTime - base.current, d);
    },
    [onProgress],
  );

  /* ---------------------------------------------------- page lifecycle -- */

  useEffect(() => {
    const previous = document.body.style.overflow;
    if (!inline) document.body.style.overflow = "hidden";
    const videoEl = videoRef;
    return () => {
      if (!inline) document.body.style.overflow = previous;
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      // Whatever is playing as the theatre closes, not what it opened on.
      report(videoEl.current);
    };
  }, [report, inline]);

  useEffect(() => {
    onItemChange?.(key);
  }, [key, onItemChange]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* ---------------------------------------------------- chrome hiding -- */

  const hideTimer = useRef<number | null>(null);
  const wake = useCallback(() => {
    setChrome(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) setChrome(false);
    }, HIDE_AFTER_MS);
  }, []);


  /* -------------------------------------------------------- controls -- */

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }, []);

  const skip = useCallback(
    (dir: "back" | "forward") => {
      const video = videoRef.current;
      if (!video) return;
      const target = video.currentTime + (dir === "back" ? -SKIP : SKIP);
      video.currentTime = Math.max(base.current, Math.min(target, video.duration || target));
      setFlash((f) => ({ dir, n: (f?.n ?? 0) + 1 }));
      wake();
    },
    [wake],
  );

  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else if (root?.requestFullscreen) void root.requestFullscreen().catch(() => undefined);
    else video?.webkitEnterFullscreen?.();
  }, []);

  const goTo = useCallback(
    (nextKey: string) => {
      report(videoRef.current);
      pendingResume.current = 0;
      setEnded(false);
      setTime(0);
      setLength(0);
      setWaiting(true);
      setKey(nextKey);
    },
    [report],
  );

  const seekTo = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      const video = videoRef.current;
      if (!track || !video || !length) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      video.currentTime = base.current + ratio * length;
      setTime(ratio * length);
    },
    [length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const map: Record<string, () => void> = {
        " ": toggle,
        k: toggle,
        ArrowLeft: () => skip("back"),
        j: () => skip("back"),
        ArrowRight: () => skip("forward"),
        l: () => skip("forward"),
        m: () => setMuted((v) => !v),
        f: toggleFullscreen,
        Escape: () => (document.fullscreenElement || inline ? undefined : onClose()),
      };
      const action = map[event.key];
      if (action) {
        event.preventDefault();
        action();
        wake();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, skip, toggleFullscreen, onClose, wake, inline]);

  /* ------------------------------------------------ saving & end state -- */

  const lastSaved = useRef(0);
  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || dragging) return;
    setTime(Math.max(0, video.currentTime - base.current));
    if (Date.now() - lastSaved.current > 4000) {
      lastSaved.current = Date.now();
      report(video);
    }
  };

  useEffect(() => {
    if (!ended || !next) return;
    const id = window.setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          window.clearInterval(id);
          goTo(next.key);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [ended, next, goTo]);

  const progress = length ? Math.min(1, time / length) : 0;
  // An inline box uses controls sized to the box; full screen gets the full set.
  const compact = inline && !fullscreen;

  return (
    <div
      ref={rootRef}
      role={inline ? "region" : "dialog"}
      aria-modal={inline ? undefined : true}
      aria-label={`${showTitle}, ${item.title}`}
      style={tint(host)}
      className={cx(
        inline
          ? "relative aspect-video w-full overflow-hidden rounded-[1.75rem] bg-[#0e0b20] text-white shadow-lift select-none [container-type:inline-size] [&:fullscreen]:rounded-none"
          : "fixed inset-0 z-[70] animate-fade bg-[#0e0b20] text-white select-none",
        !chrome && playing && "cursor-none",
      )}
      onPointerMove={wake}
      onPointerDown={wake}
    >
      <video
        key={key}
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        autoPlay
        playsInline
        muted={muted}
        preload="auto"
        onClick={toggle}
        onPlay={() => {
          setPlaying(true);
          wake();
        }}
        onPause={() => {
          setPlaying(false);
          report(videoRef.current);
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onLoadedMetadata={() => {
          const video = videoRef.current;
          if (!video) return;
          base.current = video.duration > offset + 30 ? offset : 0;
          const start = base.current + (base.current ? pendingResume.current : 0);
          if (start > 0) video.currentTime = start;
          setLength(Math.max(0, video.duration - base.current));
        }}
        onTimeUpdate={onTimeUpdate}
        onEnded={() => {
          report(videoRef.current, true);
          if (onFinished && !next) {
            onFinished();
            return;
          }
          setCountdown(NEXT_COUNTDOWN);
          setEnded(true);
          setPlaying(false);
        }}
      >
        {custom ? (
          <source src={custom} />
        ) : (
          STAND_IN.map((source) => <source key={source.src} src={source.src} type={source.type} />)
        )}
      </video>

      {/* ---- top: close, what's playing ---- */}
      {!compact && (
      <div
        className={cx(
          "absolute inset-x-0 top-0 flex items-center gap-4 bg-[linear-gradient(to_bottom,rgba(14,11,32,0.85),transparent)] px-[clamp(1rem,3vw,2rem)] pt-[max(1rem,env(safe-area-inset-top))] pb-14 transition-opacity duration-300",
          chrome || !playing || ended ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-14 flex-none cursor-pointer place-items-center rounded-full bg-white/14 backdrop-blur-md transition-[background-color,transform] hover:bg-white/24 active:scale-95"
        >
          <Icon name="close" className="size-7" />
        </button>
        <Face character={host} plain className="size-12 flex-none face-ring max-[560px]:hidden" />
        <div className="min-w-0">
          <p className="truncate text-[0.85rem] font-bold tracking-wide text-white/65 uppercase">
            {showTitle} · {item.label}
          </p>
          <p className="truncate font-display text-[clamp(1.2rem,2.4vw,1.6rem)] leading-tight font-medium">{item.title}</p>
        </div>
      </div>
      )}

      {/* ---- centre: play, back, forward ---- */}
      {!ended && (
        <div
          className={cx(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            compact ? "gap-[7cqw]" : "gap-[clamp(1.5rem,6vw,4.5rem)]",
            chrome || !playing ? "opacity-100" : "opacity-0",
          )}
        >
          <CentreButton label={`Back ${SKIP} seconds`} onClick={() => skip("back")} small compact={compact}>
            <Icon name="rewind" className="size-[46%]" />
          </CentreButton>
          <CentreButton label={playing ? "Pause" : "Play"} onClick={toggle} compact={compact}>
            {waiting && playing ? (
              <span className="size-[42%] animate-spin rounded-full border-4 border-white/25 border-t-white" />
            ) : (
              <Icon name={playing ? "pause" : "play"} className={cx("size-[44%]", !playing && "translate-x-[6%]")} />
            )}
          </CentreButton>
          <CentreButton label={`Forward ${SKIP} seconds`} onClick={() => skip("forward")} small compact={compact}>
            <Icon name="forward" className="size-[46%]" />
          </CentreButton>
        </div>
      )}

      {flash && (
        <span
          key={flash.n}
          aria-hidden
          className={cx(
            "pointer-events-none absolute top-1/2 grid animate-flash place-items-center rounded-full bg-white/15 font-display font-medium backdrop-blur",
            compact ? "size-16 text-[1.1rem]" : "size-24 text-[1.5rem]",
            flash.dir === "back" ? "left-[12%]" : "right-[12%]",
          )}
        >
          {flash.dir === "back" ? `-${SKIP}` : `+${SKIP}`}
        </span>
      )}

      {/* ---- bottom: scrubber and the few extras ---- */}
      {!ended && (
        <div
          className={cx(
            "absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(14,11,32,0.9),transparent)] transition-opacity duration-300",
            compact ? "px-4 pt-10 pb-2.5" : "px-[clamp(1rem,3vw,2rem)] pt-16 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            chrome || !playing ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(length)}
            aria-valuenow={Math.round(time)}
            aria-valuetext={`${clock(time)} of ${clock(length)}`}
            className="group relative flex h-11 cursor-pointer touch-none items-center"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
              seekTo(event.clientX);
            }}
            onPointerMove={(event) => dragging && seekTo(event.clientX)}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
              setDragging(false);
            }}
          >
            <span className="relative block h-3 w-full overflow-hidden rounded-full bg-white/22">
              <span className="absolute inset-y-0 left-0 rounded-full bg-(--c)" style={{ width: `${progress * 100}%` }} />
            </span>
            {/* The handle is the host, riding along the track. */}
            <span
              className={cx(
                "pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 ease-spring",
                dragging ? "scale-125" : "group-hover:scale-110",
              )}
              style={{ left: `${progress * 100}%` }}
            >
              <Face character={host} plain className={cx("block face-ring", compact ? "size-9" : "size-11")} />
            </span>
          </div>

          <div className={cx("flex items-center justify-between gap-3", compact ? "mt-0.5" : "mt-2")}>
            <span className={cx("font-bold tabular-nums text-white/80", compact ? "text-[0.82rem]" : "text-[0.95rem]")}>
              {clock(time)} <span className="text-white/45">/ {clock(length)}</span>
            </span>
            <div className="flex items-center gap-2">
              {next && (
                <button
                  type="button"
                  onClick={() => goTo(next.key)}
                  className={cx(
                    "inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/14 font-bold backdrop-blur-md transition-colors hover:bg-white/24",
                    compact ? "h-10 px-4 text-[0.85rem]" : "h-12 px-5 text-[0.95rem]",
                  )}
                >
                  <Icon name="next" className="size-5" />
                  Next
                </button>
              )}
              <RoundButton label={muted ? "Sound on" : "Sound off"} onClick={() => setMuted((v) => !v)} compact={compact}>
                <Icon name={muted ? "mute" : "volume"} className="size-[50%]" />
              </RoundButton>
              <RoundButton label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen} compact={compact}>
                <Icon name={fullscreen ? "shrink" : "expand"} className="size-[50%]" />
              </RoundButton>
            </div>
          </div>
        </div>
      )}

      {/* ---- the end ---- */}
      {ended && (
        <div className="absolute inset-0 grid animate-fade place-items-center bg-[#0e0b20]/80 px-6 backdrop-blur-md">
          {next ? (
            <div className="flex w-full max-w-[520px] flex-col items-center text-center">
              <p className="text-[0.85rem] font-bold tracking-[0.14em] text-white/60 uppercase">Up next</p>
              <p className={cx("mt-2 font-display leading-tight font-medium", compact ? "text-[clamp(1.1rem,4.5cqw,1.8rem)]" : "text-[clamp(1.6rem,4vw,2.4rem)]")}>
                {next.title}
              </p>
              <p className="mt-1 text-[1rem] text-white/60">{next.label}</p>
              <div className={cx("flex items-center gap-3", compact ? "mt-4" : "mt-8")}>
                <button
                  type="button"
                  onClick={() => goTo(next.key)}
                  className="relative inline-flex h-16 cursor-pointer items-center gap-3 overflow-hidden rounded-full bg-white pr-8 pl-2.5 text-[1.05rem] font-bold text-ink"
                >
                  <span
                    className="grid size-11 place-items-center rounded-full text-(--c-on)"
                    style={{ background: `conic-gradient(var(--c) ${((NEXT_COUNTDOWN - countdown) / NEXT_COUNTDOWN) * 360}deg, var(--c-deep) 0)` }}
                  >
                    <Icon name="play" className="size-5 translate-x-px" />
                  </span>
                  Play in {countdown}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-16 cursor-pointer rounded-full px-6 text-[1rem] font-bold text-white/80 ring-1 ring-white/25 transition-colors hover:bg-white/10"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={host.image}
                alt=""
                className={cx("w-auto animate-bob", compact ? "h-[22cqw] max-h-[160px]" : "h-[34vh] max-h-[300px]")}
                style={{ aspectRatio: host.aspect }}
              />
              <p className={cx("font-display font-medium", compact ? "mt-2 text-[clamp(1.1rem,4.5cqw,1.8rem)]" : "mt-5 text-[clamp(1.8rem,4vw,2.6rem)]")}>
                That&apos;s the end!
              </p>
              {!compact && <p className="mt-1 text-[1.05rem] text-white/65">{host.name} had fun watching with you.</p>}
              <div className={cx("flex gap-3", compact ? "mt-3" : "mt-7")}>
                <button
                  type="button"
                  onClick={() => goTo(items[0].key)}
                  className="inline-flex h-14 cursor-pointer items-center gap-2 rounded-full bg-white px-6 text-[1rem] font-bold text-ink"
                >
                  <Icon name="replay" className="size-5" />
                  Watch again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-14 cursor-pointer rounded-full px-6 text-[1rem] font-bold text-white/80 ring-1 ring-white/25 hover:bg-white/10"
                >
                  All done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CentreButton({
  children,
  label,
  onClick,
  small,
  compact,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  small?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cx(
        "pointer-events-auto grid cursor-pointer place-items-center rounded-full bg-white/14 backdrop-blur-md transition-[background-color,transform] duration-200 hover:bg-white/24 active:scale-90",
        compact
          ? small
            ? "size-[clamp(40px,9cqw,64px)]"
            : "size-[clamp(56px,13cqw,92px)]"
          : small
            ? "size-[clamp(64px,8vw,80px)]"
            : "size-[clamp(92px,11vw,120px)]",
      )}
    >
      {children}
    </button>
  );
}

function RoundButton({
  children,
  label,
  onClick,
  compact,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "grid cursor-pointer place-items-center rounded-full bg-white/14 backdrop-blur-md transition-[background-color,transform] hover:bg-white/24 active:scale-95",
        compact ? "size-10" : "size-12",
      )}
    >
      {children}
    </button>
  );
}

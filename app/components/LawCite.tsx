"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
} from "react";
import { lawsById } from "@/lib/data";
import { loadEvidence, type Evidence } from "@/lib/evidence";

// ---------------------------------------------------------------------------
// A legal citation that shows the law text behind it.
//
// The citation is a button. Hovering it (mouse), focusing it (keyboard) or
// tapping it (touch) opens a popover with the provision's wording, and the
// quoted passage marked inside it, so the finding can be checked against the
// law without leaving the page. Clicking pins the popover open.
//
// Only phrasing elements are used, so this sits inside sentences and table
// cells. The popover is rendered in place (not in a portal) so tab order stays
// natural, and positioned with position: fixed so table overflow cannot clip it.
// ---------------------------------------------------------------------------

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const OPEN_DELAY = 120;
const CLOSE_DELAY = 200;
const PHONE = "(max-width: 720px)";
const GUTTER = 16;
const MAX_WIDTH = 460;
const CJK = /[一-鿿]/;

/** Only one popover is open on the page: opening one closes whichever is open. */
let current: { id: string; close: () => void } | null = null;

const NOTE: Record<Evidence["scope"], (item: Evidence) => string> = {
  provision: (item) => `Verbatim from the text of ${item.provision} held in this site's corpus.`,
  file: () =>
    "Verbatim from the law's text; the cited provision could not be isolated, so the passage was found by searching the whole text.",
  "quote-only": () => "The quoted words, as recorded. The surrounding text could not be shown.",
};

interface Pos {
  top: number;
  left: number;
  width: number;
}

export interface LawCiteProps {
  lawId: string;
  /** The citation as written, e.g. "Sch.1 Principle 4.1.3". */
  citation: string;
  /** The evidence key: "f:<facetId>", "t:<termId>" or "m:<requirementId>". */
  ev: string;
  /** The plain-English finding this citation supports, if any. */
  finding?: string;
}

export function LawCite({ lawId, citation, ev, finding }: LawCiteProps) {
  const uid = useId();
  const popId = `law-pop${uid}`;
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const pointerInside = useRef(false);
  const skipFocusOpen = useRef(false);

  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [phone, setPhone] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [items, setItems] = useState<Record<string, Evidence> | null>(null);

  const close = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    if (current?.id === popId) current = null;
    setOpen(false);
    setPinned(false);
  };

  const show = (pin: boolean) => {
    window.clearTimeout(closeTimer.current);
    if (current && current.id !== popId) current.close();
    current = { id: popId, close };
    setOpen(true);
    if (pin) setPinned(true);
  };

  /** Move focus back to the trigger without that focus reopening the popover. */
  const returnFocus = () => {
    skipFocusOpen.current = true;
    btnRef.current?.focus();
    skipFocusOpen.current = false;
  };

  // Phone width: a bottom sheet, opened by tap only.
  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const sync = () => setPhone(mq.matches);
    sync();
    if (mq.addEventListener) mq.addEventListener("change", sync);
    else mq.addListener(sync);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", sync);
      else mq.removeListener(sync);
    };
  }, []);

  // Load the law text the first time the popover opens. Cached per law.
  useEffect(() => {
    if (!open || items) return;
    let alive = true;
    void loadEvidence(lawId).then((loaded) => {
      if (alive) setItems(loaded);
    });
    return () => {
      alive = false;
    };
  }, [open, lawId, items]);

  // Tidy up on unmount.
  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
      if (current?.id === popId) current = null;
    },
    [popId],
  );

  // Escape closes it from anywhere (hovered or focused) and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      returnFocus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // A pointerdown anywhere outside closes the popover, pinned or not.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  // Place the popover under the trigger, or above it when there is no room
  // below. Re-run on scroll and resize while it is open.
  useIsoLayoutEffect(() => {
    if (!open || phone) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const outOfView = r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw;
      if (outOfView && !pinned) {
        close();
        return;
      }
      const h = popRef.current?.offsetHeight ?? 0;
      const width = Math.min(MAX_WIDTH, vw - 2 * GUTTER);
      const spaceBelow = vh - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const below = spaceBelow >= Math.min(h, 300) || spaceBelow >= spaceAbove;
      const wanted = below ? r.bottom + 8 : r.top - 8 - h;
      const top = Math.max(GUTTER, Math.min(wanted, vh - h - GUTTER));
      const left = Math.min(Math.max(GUTTER, r.left), vw - width - GUTTER);
      setPos((prev) =>
        prev && prev.top === top && prev.left === left && prev.width === width
          ? prev
          : { top, left, width },
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
    // place() reads pinned and the popover height, so re-run when either
    // changes: the excerpt loads after the popover opens and makes it taller.
  }, [open, phone, pinned, items]);

  const onPointerEnter = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType !== "mouse") return;
    pointerInside.current = true;
    window.clearTimeout(closeTimer.current);
    if (phone || open) return;
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => show(false), OPEN_DELAY);
  };

  const onPointerLeave = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType !== "mouse") return;
    pointerInside.current = false;
    window.clearTimeout(openTimer.current);
    if (pinned) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(close, CLOSE_DELAY);
  };

  // Keyboard focus opens. A mouse click also focuses the trigger, and the
  // click that follows pins it.
  const onFocus = () => {
    if (skipFocusOpen.current || open) return;
    show(false);
  };

  // Focus leaving the whole component (trigger and popover) closes it, unless
  // the pointer is still over it (a reader selecting text in the popover).
  const onBlur = (e: FocusEvent<HTMLSpanElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && wrapRef.current?.contains(next)) return;
    if (pointerInside.current || pinned) return;
    close();
  };

  const onClick = () => {
    if (pinned) {
      close();
      returnFocus();
    } else {
      show(true);
    }
  };

  const law = lawsById[lawId];
  const item = items?.[ev];
  const excerpt = item ? `${item.before}${item.match}${item.after}` : "";
  const provisionLabel = item?.provision ?? citation;

  const popStyle =
    phone || !pos
      ? undefined
      : { top: pos.top, left: pos.left, width: pos.width, visibility: "visible" as const };

  return (
    <span
      ref={wrapRef}
      className="law-cite-wrap"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={onBlur}
    >
      <button
        ref={btnRef}
        type="button"
        className="law-cite citation"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? popId : undefined}
        onFocus={onFocus}
        onClick={onClick}
      >
        <span className="law-cite-mark" aria-hidden="true">
          §
        </span>
        <span>{citation}</span>
      </button>

      {open && (
        <span
          id={popId}
          ref={popRef}
          role="dialog"
          aria-label={`Law text: ${law?.shortName ?? lawId}, ${citation}`}
          className={phone ? "law-pop law-pop-sheet" : "law-pop"}
          style={popStyle ?? (phone ? undefined : { visibility: "hidden" })}
        >
          {phone && (
            <span className="law-pop-bar">
              <span className="law-pop-bar-title">{law?.shortName ?? lawId}</span>
              <button
                type="button"
                className="law-pop-close"
                onClick={() => {
                  close();
                  returnFocus();
                }}
              >
                Close
              </button>
            </span>
          )}

          <span className="law-pop-sec">
            <strong className="law-pop-head">{law?.shortName ?? lawId}</strong>
            <span className="law-pop-prov">{provisionLabel}</span>
          </span>

          {finding && (
            <span className="law-pop-sec">
              <span className="law-pop-label">Finding</span>
              <span className="law-pop-finding">{finding}</span>
            </span>
          )}

          <span className="law-pop-sec">
            <span className="law-pop-label">Law text</span>
            {items === null ? (
              <span className="law-pop-note">Loading the law text…</span>
            ) : item ? (
              <>
                <span
                  className="law-pop-excerpt"
                  lang={CJK.test(excerpt) ? "zh" : undefined}
                >
                  {item.cutStart && "…"}
                  {item.before}
                  <mark>{item.match}</mark>
                  {item.after}
                  {item.cutEnd && "…"}
                </span>
                <span className="law-pop-note">{NOTE[item.scope](item)}</span>
              </>
            ) : (
              <span className="law-pop-note">
                There is no passage to show: this finding is that the law contains no such rule.
                {citation && <> Citation: {citation}.</>}
              </span>
            )}
          </span>

          {law?.officialUrl && (
            <span className="law-pop-sec">
              <a
                className="law-pop-link"
                href={law.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Official text ↗
              </a>
            </span>
          )}
        </span>
      )}
    </span>
  );
}

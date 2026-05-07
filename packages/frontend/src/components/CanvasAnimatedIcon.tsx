import React, { useEffect, useRef } from "react";

type SquareColor = "light" | "dark";

const SQUARE_COLORS: SquareColor[] = [
  "light",
  "light",
  "dark",
  "light",
  "dark",
  "light",
  "dark",
  "light",
  "light",
];

const RIPPLE_ORDER = [4, 1, 3, 5, 7, 0, 2, 6, 8];
const CASCADE_ORDER = [0, 3, 1, 6, 4, 2, 7, 5, 8];
const ALL_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function shuffled(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type AnimationPattern = "ripple" | "cascade" | "random" | "mixed";

// mixed cycles through the other three in a random sequence each loop
const MIXED_POOL: Exclude<AnimationPattern, "mixed">[] = [
  "ripple",
  "cascade",
  "random",
];
let mixedIndex = 0;
function nextMixedPattern(): Exclude<AnimationPattern, "mixed"> {
  const pattern = MIXED_POOL[mixedIndex % MIXED_POOL.length];
  mixedIndex++;
  return pattern;
}

function getInOrder(pattern: AnimationPattern): number[] {
  const resolved = pattern === "mixed" ? nextMixedPattern() : pattern;
  if (resolved === "cascade") return CASCADE_ORDER;
  if (resolved === "random") return shuffled(ALL_INDICES);
  return RIPPLE_ORDER;
}

export interface CanvasAnimatedIconProps {
  /** Size of the whole loader in px. Default: 80 */
  size?: number;
  /** Gap between squares as a fraction of size. Default: 0.06 */
  gapRatio?: number;
  /** Corner radius of each square in px. Default: auto (size-proportional) */
  borderRadius?: number;
  /** Delay between each square animating in/out, in ms. Default: 80 */
  stepDelay?: number;
  /** Duration of each square's pop-in animation, in ms. Default: 400 */
  duration?: number;
  /** Animation order pattern. Default: "ripple" */
  pattern?: AnimationPattern;
  /**
   * Color for "light" squares. Accepts any valid CSS color string including
   * oklch with relative color syntax, e.g. `oklch(from var(--discord-white) l c h / 20%)`.
   * Default: #ffffff
   */
  lightColor?: string;
  /**
   * Color for "dark" squares. Accepts any valid CSS color string including
   * oklch with relative color syntax, e.g. `oklch(from var(--discord-blurple) l c h / 60%)`.
   * Default: #454FBF
   */
  darkColor?: string;
  /** Whether to loop the animation. Default: false */
  loop?: boolean;
  /** Pause (ms) between ripple-in finishing and ripple-out starting. Default: 600 */
  holdPause?: number;
  /** Pause (ms) after ripple-out finishes before next loop. Default: 400 */
  restPause?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function CanvasAnimatedIcon({
  size = 80,
  gapRatio = 0.05,
  borderRadius,
  stepDelay = 80,
  duration = 400,
  pattern = "ripple",
  lightColor = "#ffffff",
  darkColor = "#454FBF",
  loop = false,
  holdPause = 600,
  restPause = 400,
  className,
  style,
}: CanvasAnimatedIconProps) {
  const squaresRef = useRef<(HTMLDivElement | null)[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const gap = Math.round(size * gapRatio);
  const squareSize = Math.round((size - gap * 4) / 3);
  const radius = borderRadius ?? Math.round(squareSize * 0.18);
  const outDuration = Math.round(duration * 1);

  function schedule(fn: () => void, ms: number) {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
  }

  function setSquare(
    index: number,
    visible: boolean,
    dur: number,
    easing: string,
  ) {
    const sq = squaresRef.current[index];
    if (!sq) return;
    sq.style.transition = `transform ${dur}ms ${easing}, opacity ${Math.round(dur * 0.4)}ms ease`;
    sq.style.transform = visible ? "scale(1)" : "scale(0)";
  }

  function resetAll() {
    squaresRef.current.forEach((sq) => {
      if (!sq) return;
      sq.style.transition = "none";
      sq.style.transform = "scale(0)";
    });
  }

  function runCycle(onComplete?: () => void) {
    const inOrder = getInOrder(pattern);
    const outOrder = [...inOrder].reverse();
    const inEnd = inOrder.length * stepDelay + duration;

    // Ripple in
    inOrder.forEach((idx, step) => {
      schedule(() => {
        setSquare(idx, true, duration, "cubic-bezier(0.34, 1.56, 0.64, 1)");
      }, step * stepDelay);
    });

    if (!loop) return;

    // Ripple out
    const outStart = inEnd + holdPause;
    outOrder.forEach((idx, step) => {
      schedule(
        () => {
          setSquare(
            idx,
            false,
            outDuration,
            "cubic-bezier(0.36, 0, 0.66, -0.56)",
          );
        },
        outStart + step * stepDelay,
      );
    });

    // Schedule next cycle
    const outEnd = outStart + outOrder.length * stepDelay + outDuration;
    schedule(() => {
      resetAll();
      onComplete?.();
    }, outEnd + restPause);
  }

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    mixedIndex = 0;

    resetAll();

    if (loop) {
      const cycle = () => runCycle(cycle);
      schedule(cycle, 50);
    } else {
      schedule(() => runCycle(), 50);
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, stepDelay, duration, loop, holdPause, restPause]);

  return (
    <div
      aria-label="Loading"
      role="status"
      className={className}
      style={{
        width: size,
        height: size,
        display: "grid",
        gridTemplateColumns: `repeat(3, ${squareSize}px)`,
        gridTemplateRows: `repeat(3, ${squareSize}px)`,
        gap,
        padding: gap,
        boxSizing: "border-box",
        flexShrink: 0,
        ...style,
      }}
    >
      {SQUARE_COLORS.map((color, i) => (
        <div
          key={i}
          ref={(el) => {
            squaresRef.current[i] = el;
          }}
          style={{
            width: squareSize,
            height: squareSize,
            borderRadius: radius,
            backgroundColor: color === "light" ? lightColor : darkColor,
            transform: "scale(0)",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

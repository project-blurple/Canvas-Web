"use client";

import {
  createContext,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSnapshots } from "@/hooks/queries/useSnapshots";
import { useCanvasTimelineVideo } from "@/hooks/useCanvasImage";
import { clamp } from "@/util";
import { useCanvasContext } from "./CanvasContext";

const TIMELINE_FPS = 30;
const TIMELINE_SEEK_COMMIT_INTERVAL_MS = 1000 / 15;

interface TimelineContextType {
  currentTimelineFrame: number;
  handleLoadVideo: () => void;
  handleTimelineSeek: (frame: number) => void;
  handleTimelineSlider: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleTimelineTimeUpdate: () => void;
  isLaunchingTimeline: boolean;
  isLoadingTimeline: boolean;
  setCurrentTimelineFrame: Dispatch<SetStateAction<number>>;
  setTimelineIsActive: Dispatch<SetStateAction<boolean>>;
  sourceVideo: HTMLVideoElement | null;
  timelineFps: number;
  timelineIsActive: boolean;
  timelineIsAvailable: boolean;
  timelineSliderThumbPosition: number;
  totalTimelineFrames: number;
  videoRef: RefObject<HTMLVideoElement | null>;
}

const TimelineContext = createContext<TimelineContextType>({
  currentTimelineFrame: 0,
  handleLoadVideo: () => {},
  handleTimelineSeek: () => {},
  handleTimelineSlider: () => {},
  handleTimelineTimeUpdate: () => {},
  isLaunchingTimeline: false,
  isLoadingTimeline: false,
  setCurrentTimelineFrame: () => {},
  setTimelineIsActive: () => {},
  sourceVideo: null,
  timelineFps: TIMELINE_FPS,
  timelineIsActive: false,
  timelineIsAvailable: false,
  timelineSliderThumbPosition: 0,
  totalTimelineFrames: 0,
  videoRef: { current: null },
});

export const TimelineProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { canvas } = useCanvasContext();
  const { data: snapshots } = useSnapshots(canvas.id);

  const [timelineIsActive, setTimelineIsActive] = useState(false);
  const timelineIsAvailable = canvas.timelineEnabled && canvas.isLocked;

  const sourceVideo = useCanvasTimelineVideo(canvas.id, timelineIsActive);

  const timelineFps = TIMELINE_FPS;
  const [currentTimelineFrame, setCurrentTimelineFrame] = useState(0);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(true);
  const [isLaunchingTimeline, setIsLaunchingTimeline] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineSeekTimeoutRef = useRef<number | null>(null);
  const timelineLastSeekCommitRef = useRef(0);

  const totalTimelineFrames = snapshots?.length ?? 0;
  const timelineSliderThumbPosition =
    totalTimelineFrames > 0 ?
      clamp((currentTimelineFrame / totalTimelineFrames) * 100, 0, 100)
    : 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset timeline state when the active canvas changes.
  useEffect(() => {
    setCurrentTimelineFrame(0);
    setIsLoadingTimeline(true);
    setIsLaunchingTimeline(true);
    timelineLastSeekCommitRef.current = 0;

    if (timelineSeekTimeoutRef.current !== null) {
      window.clearTimeout(timelineSeekTimeoutRef.current);
      timelineSeekTimeoutRef.current = null;
    }
  }, [canvas.id]);

  useEffect(() => {
    return () => {
      if (timelineSeekTimeoutRef.current !== null) {
        window.clearTimeout(timelineSeekTimeoutRef.current);
      }
    };
  }, []);

  const handleTimelineTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTimelineFrame(Math.floor(video.currentTime * TIMELINE_FPS));
  }, []);

  const handleTimelineSeek = useCallback((frame: number) => {
    const video = videoRef.current;
    if (!video) return;

    const commitSeek = () => {
      timelineLastSeekCommitRef.current = performance.now();
      video.currentTime = frame / TIMELINE_FPS;
    };

    const elapsedSinceLastCommit =
      performance.now() - timelineLastSeekCommitRef.current;

    if (timelineSeekTimeoutRef.current !== null) {
      window.clearTimeout(timelineSeekTimeoutRef.current);
    }

    if (elapsedSinceLastCommit >= TIMELINE_SEEK_COMMIT_INTERVAL_MS) {
      commitSeek();
      return;
    }

    timelineSeekTimeoutRef.current = window.setTimeout(() => {
      timelineSeekTimeoutRef.current = null;
      commitSeek();
    }, TIMELINE_SEEK_COMMIT_INTERVAL_MS - elapsedSinceLastCommit);
  }, []);

  const handleTimelineSlider = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const frame = Number.parseInt(event.target.value, 10);
      setCurrentTimelineFrame(frame);
      handleTimelineSeek(frame);
    },
    [handleTimelineSeek],
  );

  const handleLoadVideo = useCallback((): void => {
    setIsLoadingTimeline(false);
    setIsLaunchingTimeline(false);
    handleTimelineSeek(totalTimelineFrames - 1);
  }, [handleTimelineSeek, totalTimelineFrames]);

  const setTimelineIsActiveWithCheck = useCallback(
    (value: SetStateAction<boolean>) => {
      setTimelineIsActive((currentIsActive) => {
        if (!timelineIsAvailable) return false;
        return typeof value === "function" ? value(currentIsActive) : value;
      });
    },
    [timelineIsAvailable],
  );

  const value = useMemo(
    () => ({
      currentTimelineFrame,
      handleLoadVideo,
      handleTimelineSeek,
      handleTimelineSlider,
      handleTimelineTimeUpdate,
      isLaunchingTimeline,
      isLoadingTimeline,
      setCurrentTimelineFrame,
      setTimelineIsActive: setTimelineIsActiveWithCheck,
      sourceVideo,
      timelineFps,
      timelineIsActive,
      timelineIsAvailable,
      timelineSliderThumbPosition,
      totalTimelineFrames,
      videoRef,
    }),
    [
      currentTimelineFrame,
      handleLoadVideo,
      handleTimelineSeek,
      handleTimelineSlider,
      handleTimelineTimeUpdate,
      isLaunchingTimeline,
      isLoadingTimeline,
      setTimelineIsActiveWithCheck,
      sourceVideo,
      timelineIsActive,
      timelineIsAvailable,
      timelineSliderThumbPosition,
      totalTimelineFrames,
    ],
  );

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
};

export const useTimelineContext = () => useContext(TimelineContext);

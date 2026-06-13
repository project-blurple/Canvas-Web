/**
 * Timelapse video format utilities and types.
 * Defines the mapping between timelapse types and their output video formats.
 */

export type TimelapseType = "default" | "raw";
export type VideoFormat = "webm" | "mp4";

export const VIDEO_FORMAT_MAP: Record<TimelapseType, VideoFormat> = {
  default: "mp4",
  raw: "webm",
} as const;

/**
 * Gets the video format for a given timelapse type.
 * @param type The timelapse type ("default" or "raw")
 * @returns The corresponding video format ("mp4" or "webm")
 */
export function getTimelapseVideoFormat(type: TimelapseType): VideoFormat {
  return VIDEO_FORMAT_MAP[type];
}

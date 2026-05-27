import type { Metadata } from "next";
import config from "@/config/clientConfig";
import { fetchCanvasInfo, fetchFrameById } from "@/hooks/queries/serverFetch";
import { calculateScale, clamp } from "@/util";
import {
  extractAllSearchParamsFromRecord,
  type NextSearchParams,
} from "@/util/searchParams";
import Main from "../../../app/Main";
import LayoutWithHeader from "../../../components/LayoutWithHeader";

function toMetadata({
  title,
  description,
  imageUrl,
}: {
  title: string;
  description: string;
  imageUrl: string;
}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "canvas.projectblurple.com",
      images: [{ url: imageUrl }],
      locale: "en-US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ canvasId?: string }>;
  searchParams: Promise<NextSearchParams>;
}): Promise<Metadata> {
  const resolvedParams = await params;

  const canvasId =
    resolvedParams?.canvasId && /^\d+$/.test(resolvedParams.canvasId) ?
      Number(resolvedParams.canvasId)
    : undefined;

  if (canvasId === undefined) {
    return {};
  }

  const resolvedSearchParams = await searchParams;
  const { x, y, frameId, pixelHeight, pixelWidth } =
    extractAllSearchParamsFromRecord(resolvedSearchParams);

  let canvasInfo: Awaited<ReturnType<typeof fetchCanvasInfo>>;
  let frame = null as Awaited<ReturnType<typeof fetchFrameById>> | null;

  try {
    [canvasInfo, frame] = await Promise.all([
      fetchCanvasInfo(canvasId),
      frameId ? fetchFrameById(frameId) : Promise.resolve(null),
    ]);
  } catch {
    return {};
  }

  const currentUnixTimestamp = Math.floor(Date.now() / 1000);
  const imageSearchParams = new URLSearchParams({
    t: currentUnixTimestamp.toString(), // Cache buster to ensure the latest image is fetched
  });

  if (frame) {
    const scale = calculateScale((frame.x1 - frame.x0) * (frame.y1 - frame.y0));
    const imageUrl = `${config.apiUrl}/api/v1/frame/${encodeURIComponent(frame.id)}@${scale}.png?${imageSearchParams.toString()}`;

    return toMetadata({
      title: `Blurple Canvas | ${frame.name}`,
      description: `"${frame.name}"${
        frame.owner.type === "user" ? ` by ${frame.owner.user.username}`
        : frame.owner.type === "guild" ? ` by ${frame.owner.guild.name}`
        : ""
      } in ${canvasInfo.name}`,
      imageUrl,
    });
  }

  const canvasImageUrlBase = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasInfo.id)}`;

  if (x && y) {
    // Zoom is a value specific to the CanvasView so we're not going to try do
    // the annoying maths to figure out the perfect value...
    const height = clamp(
      pixelHeight ?
        Number.parseInt(pixelHeight, 10)
      : Math.round(Math.min(50, canvasInfo.height / 2)), // smaller of 50px or half the canvas height
      5,
      canvasInfo.height,
    );
    const width = clamp(
      pixelWidth ?
        Number.parseInt(pixelWidth, 10)
      : Math.round(Math.min(50, canvasInfo.width / 2)), // smaller of 50px or half the canvas width
      5,
      canvasInfo.width,
    );

    const x0 = Math.max(Number.parseInt(x, 10) - Math.floor(width / 2), 0);
    const y0 = Math.max(Number.parseInt(y, 10) - Math.floor(height / 2), 0);
    const x1 = Math.min(x0 + width, canvasInfo.width);
    const y1 = Math.min(y0 + height, canvasInfo.height);
    imageSearchParams.set("x0", x0.toString());
    imageSearchParams.set("y0", y0.toString());
    imageSearchParams.set("x1", x1.toString());
    imageSearchParams.set("y1", y1.toString());

    const scale = calculateScale(width * height);
    const imageUrl = `${canvasImageUrlBase}@${scale}.png?${imageSearchParams.toString()}`;

    return toMetadata({
      title: `Blurple Canvas | ${canvasInfo.name} (${x}, ${y})`,
      description: `(${x}, ${y}) in ${canvasInfo.name}`,
      imageUrl,
    });
  }

  const scale = calculateScale(canvasInfo.width * canvasInfo.height);
  const imageUrl = `${canvasImageUrlBase}@${scale}.png?${imageSearchParams.toString()}`;

  return toMetadata({
    title: `Blurple Canvas | ${canvasInfo.name}`,
    description: `${canvasInfo.name} in Blurple Canvas`,
    imageUrl,
  });
}

export default function CanvasPage() {
  return (
    <LayoutWithHeader isCanvasPage>
      <Main />
    </LayoutWithHeader>
  );
}

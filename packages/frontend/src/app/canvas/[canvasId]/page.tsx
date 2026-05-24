import type { Metadata } from "next";
import config from "@/config/clientConfig";
import { fetchCanvasInfo, fetchFrameById } from "@/hooks/queries/serverFetch";
import { extractAllSearchParamsFromRecord } from "@/util/searchParams";
import Main from "../../../app/Main";
import LayoutWithHeader from "../../../components/LayoutWithHeader";

function calculateScale(pixelCount: number): number {
  if (pixelCount <= 90_000) return 4; // 300x300
  if (pixelCount <= 360_000) return 2; // 600x600
  return 1;
}

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
      images: [{ url: imageUrl }],
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
  params: { canvasId?: string };
  searchParams: Record<string, string | string[] | undefined> | null;
}): Promise<Metadata> {
  const canvasId = params?.canvasId ? Number(params.canvasId) : undefined;
  const { x, y, frameId, pixelHeight, pixelWidth } =
    extractAllSearchParamsFromRecord(searchParams);

  const [canvasInfo, frame] = await Promise.all([
    fetchCanvasInfo(canvasId),
    frameId ? fetchFrameById(frameId) : Promise.resolve(null),
  ]);

  if (frame) {
    const scale = calculateScale((frame.x1 - frame.x0) * (frame.y1 - frame.y0));
    const imageUrl = `${config.apiUrl}/api/v1/frame/${encodeURIComponent(frame.id)}@${scale}x.png`;

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

  if (x && y) {
    // Zoom is a value specific to the CanvasView so we're not going to try do
    // the annoying maths to figure out the perfect value... 50x50 is fine
    const height = pixelHeight ? Number.parseInt(pixelHeight, 10) : 50;
    const width = pixelWidth ? Number.parseInt(pixelWidth, 10) : 50;
    const scale = calculateScale(width * height);
    const imageUrl = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasInfo.id)}@${scale}x.png`;
    // todo: specific region endpoint

    return toMetadata({
      title: `Blurple Canvas | ${canvasInfo.name} (${x}, ${y})`,
      description: `(${x}, ${y}) in ${canvasInfo.name}`,
      imageUrl,
    });
  }

  const scale = calculateScale(canvasInfo.width * canvasInfo.height);
  const imageUrl = `${config.apiUrl}/api/v1/canvas/${encodeURIComponent(canvasInfo.id)}@${scale}x.png`;

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

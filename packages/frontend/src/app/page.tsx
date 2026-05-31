import { redirect } from "next/navigation";
import { fetchCanvasInfo } from "@/hooks/queries/serverFetch";

export default async function Page() {
  const canvasInfo = await fetchCanvasInfo();
  redirect(`/canvas/${encodeURIComponent(canvasInfo.id)}`);
}

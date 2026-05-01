"use client";

import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { redirect } from "next/navigation";
import LayoutWithHeader from "@/components/LayoutWithNavbar";
import { useAuthContext } from "@/contexts";
import ModerationDashboard from "./ModerationDashboard";

function verifyModerator(
  user: DiscordUserProfile | null,
  isAuthResolved: boolean,
) {
  if (!isAuthResolved) return;
  if (!user?.isCanvasModerator) redirect("/");
}

export default function ModerationPage() {
  const { user, isAuthResolved } = useAuthContext();
  verifyModerator(user, isAuthResolved);

  return <LayoutWithHeader content={<ModerationDashboard />} />;
}

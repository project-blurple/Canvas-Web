"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LayoutWithHeader from "@/components/LayoutWithNavbar";
import { useAuthContext } from "@/contexts";
import ModerationDashboard from "./ModerationDashboard";

export default function ModerationPage() {
  const { user, isAuthResolved } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthResolved) return;
    if (!user?.isCanvasModerator) router.replace("/");
  }, [isAuthResolved, router, user?.isCanvasModerator]);

  if (isAuthResolved && !user?.isCanvasModerator) {
    return null;
  }

  return <LayoutWithHeader content={<ModerationDashboard />} />;
}

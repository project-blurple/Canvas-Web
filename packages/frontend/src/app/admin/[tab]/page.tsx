"use client";

import { notFound, useRouter } from "next/navigation";
import { useEffect } from "react";
import LayoutWithHeader from "@/components/LayoutWithNavbar";
import { useAuthContext } from "@/contexts";
import AdminDashboard from "../AdminDashboard";

const validTabs = new Set(["event", "canvas", "color"]);

export default function AdminTabPage({ params }: { params: { tab: string } }) {
  const { user, isAuthResolved } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthResolved) return;
    if (!user?.isCanvasAdmin) router.replace("/");
  }, [isAuthResolved, router, user?.isCanvasAdmin]);

  if (!validTabs.has(params.tab)) {
    notFound();
  }

  if (isAuthResolved && !user?.isCanvasAdmin) {
    return null;
  }

  return (
    <LayoutWithHeader>
      <AdminDashboard />
    </LayoutWithHeader>
  );
}

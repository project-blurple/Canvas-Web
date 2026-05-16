"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LayoutWithHeader from "@/components/LayoutWithHeader";
import { useAuthContext } from "@/contexts";
import AdminDashboard from "./AdminDashboard";

export default function AdminPage() {
  const { user, isAuthResolved } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthResolved) return;
    if (!user?.isCanvasAdmin) router.replace("/");
  }, [isAuthResolved, router, user?.isCanvasAdmin]);

  if (isAuthResolved && !user?.isCanvasAdmin) {
    return null;
  }

  return (
    <LayoutWithHeader>
      <AdminDashboard />
    </LayoutWithHeader>
  );
}

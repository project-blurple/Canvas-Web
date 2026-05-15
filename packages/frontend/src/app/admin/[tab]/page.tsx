"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useEffect } from "react";
import LayoutWithHeader from "@/components/LayoutWithNavbar";
import { useAuthContext } from "@/contexts";
import AdminDashboard from "../AdminDashboard";
import { isValidTab } from "../tabs";

export default function AdminTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { user, isAuthResolved } = useAuthContext();
  const router = useRouter();
  const resolvedParams = use(params);

  useEffect(() => {
    if (!isAuthResolved) return;
    if (!user?.isCanvasAdmin) router.replace("/");
  }, [isAuthResolved, router, user?.isCanvasAdmin]);

  if (!isValidTab(resolvedParams.tab)) {
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

"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminDashboard from "./AdminDashboard";

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { canvasId } = useParams<{ canvasId: string }>();

  useEffect(() => {
    if (pathname === `/canvas/${canvasId}/admin`) {
      router.replace(`/canvas/${canvasId}/admin/event`);
    }
  }, [canvasId, pathname, router]);

  return <AdminDashboard />;
}

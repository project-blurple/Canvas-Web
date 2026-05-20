"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminDashboard from "./AdminDashboard";

export default function AdminPage() {
  // Immediately redirect to the first tab (event) when visiting /admin
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/admin") {
      router.replace("/admin/event");
    }
  }, [pathname, router]);

  return <AdminDashboard />;
}

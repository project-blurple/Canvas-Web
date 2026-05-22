"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/header";

export default function LayoutWithHeader({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

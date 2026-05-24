"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/header";

interface LayoutWithHeaderProps {
  children?: ReactNode;
  isCanvasPage?: boolean;
}

export default function LayoutWithHeader({
  children,
  isCanvasPage = false,
}: LayoutWithHeaderProps) {
  return (
    <>
      <Header isCanvasPage={isCanvasPage} />
      {children}
    </>
  );
}

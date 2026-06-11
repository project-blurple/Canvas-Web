"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/header";

interface LayoutWithHeaderProps {
  children?: ReactNode;
}

export default function LayoutWithHeader({ children }: LayoutWithHeaderProps) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

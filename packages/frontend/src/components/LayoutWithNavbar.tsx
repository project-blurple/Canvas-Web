"use client";

import { ReactNode } from "react";
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

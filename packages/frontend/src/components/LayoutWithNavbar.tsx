"use client";

import { ReactNode } from "react";
import { Header } from "@/components/header";

export default function LayoutWithHeader({
  content,
  children,
}: {
  content?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <Header />
      {content}
      {children}
    </>
  );
}

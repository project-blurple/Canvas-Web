"use client";

import { Header } from "@/components/header";

export default function LayoutWithHeader({
  content,
}: {
  content: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {content}
    </>
  );
}

"use client";

import { styled } from "@mui/material";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import LayoutWithHeader from "@/components/LayoutWithHeader";
import { useAuthContext } from "@/contexts";

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--layout-padding-y));
  padding-block: 4rem;
  padding-inline: var(--layout-padding-x);
  place-items: center;
`;

const NavWrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
  place-items: center;
  width: 100%;
`;

const NavBar = styled("nav")`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(5, 1fr);
  max-width: 600px; // need mobile responsiveness
  width: 100%;
`;

const NavLink = styled(Link)`
  border-radius: 0.5rem;
  color: inherit;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  text-align: center;
  text-decoration: none;
  transition: background-color 0.2s;

  &:hover {
    background-color: oklch(from var(--discord-legacy-greyple) l c h / 20%);
  }

  &[aria-current="page"] {
    background-color: oklch(from var(--discord-legacy-greyple) l c h / 30%);
    font-weight: 500;
  }
`;

const TAB_ROUTES = [
  { key: "event", label: "Event", path: "event" },
  { key: "notice", label: "Notice", path: "notice" },
  { key: "canvas", label: "Canvas", path: "canvas" },
  { key: "color", label: "Color", path: "color" },
  { key: "paste", label: "Paste", path: "paste" },
] as const;

function AdminDashboardHeader() {
  const pathname = usePathname();
  const activeTab = (TAB_ROUTES.find((tab) => pathname === `/admin/${tab.path}`)
    ?.key ?? "event") as (typeof TAB_ROUTES)[number]["key"];

  return (
    <NavWrapper>
      <h1>Admin</h1>
      <NavBar>
        {TAB_ROUTES.map((tab) => (
          <NavLink
            key={tab.key}
            href={`/admin/${tab.path}`}
            aria-current={activeTab === tab.key ? "page" : undefined}
          >
            {tab.label}
          </NavLink>
        ))}
      </NavBar>
    </NavWrapper>
  );
}

export default function AdminDashboard({
  children,
}: {
  children?: React.ReactNode;
}) {
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
      <Wrapper>
        <AdminDashboardHeader />
        {children}
      </Wrapper>
    </LayoutWithHeader>
  );
}

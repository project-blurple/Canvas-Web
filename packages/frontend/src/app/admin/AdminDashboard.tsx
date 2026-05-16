"use client";

import { styled } from "@mui/material";
import { usePathname } from "next/navigation";
import AdminCanvasTab from "./AdminCanvasTab";
import AdminColorTab from "./AdminColorTab";
import AdminEventTab from "./AdminEventTab";
import AdminNoticeTab from "./AdminNoticeTab";
import AdminPasteTab from "./AdminPasteTab";
import { pathToTabKey, type TabKey } from "./tabs";

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--layout-padding-y));
  padding-block: 4rem;
  padding-inline: var(--layout-padding-x);
  place-items: center;
`;

const NavBar = styled("nav")`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  width: 100%;
  max-width: 600px;
`;

const NavLink = styled("a")`
  padding: 0.75rem 1rem;
  text-align: center;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s;
  cursor: pointer;
  color: inherit;

  &:hover {
    background-color: oklch(from var(--discord-legacy-greyple) l c h / 20%);
  }

  &[aria-current="page"] {
    background-color: oklch(from var(--discord-legacy-greyple) l c h / 30%);
    font-weight: 500;
  }
`;

const TAB_ROUTES: { key: TabKey; label: string; path: string }[] = [
  { key: "event", label: "Event", path: "event" },
  { key: "notice", label: "Notice", path: "notice" },
  { key: "canvas", label: "Canvas", path: "canvas" },
  { key: "color", label: "Color", path: "color" },
  { key: "paste", label: "Paste", path: "paste" },
];

export default function AdminDashboard() {
  const pathname = usePathname();
  const activeTab = pathToTabKey[pathname ?? ""] ?? "event";

  return (
    <Wrapper>
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

      <AdminEventTab active={activeTab === "event"} />
      <AdminCanvasTab active={activeTab === "canvas"} />
      <AdminColorTab active={activeTab === "color"} />
      <AdminNoticeTab active={activeTab === "notice"} />
      <AdminPasteTab active={activeTab === "paste"} />
    </Wrapper>
  );
}

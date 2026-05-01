"use client";

import { styled } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { MenuIcon } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { useAuthContext } from "@/contexts";

const Links = styled("ul")`
  display: none;

  ${({ theme }) => theme.breakpoints.up("md")} {
    display: flex;
  }

  li {
    display: inline-flex;
  }

  /*
   * Workaround for accessibility issue with VoiceOver.
   * See https://gerardkcohen.me/writing/2017/voiceover-list-style-type.html
   */
  li::before {
    content: "\\200B"; /* zero-width space */
  }
`;

export const NavLink = styled(Link)`
  border-radius: 0.5rem;
  color: var(--discord-white);
  padding: 0.5rem 1rem;
  text-decoration: none;
  transition:
    background-color var(--transition-duration-fast) ease,
    opacity var(--transition-duration-fast) ease,
    outline-width var(--transition-duration-fast) ease;

  :hover {
    opacity: 55%;
  }

  :focus-visible {
    background-color: oklch(100% 0 0 / 6%);
    outline: var(--focus-outline);
  }
`;

const MenuButton = styled(IconButton)`
  display: block;

  ${({ theme }) => theme.breakpoints.up("md")} {
    display: none;
  }

  & > svg {
    width: 1.75rem;
    height: 1.75rem;
  }
`;

const StyledMenuItem = styled(MenuItem)`
  padding-inline: 0.25rem;
  padding-block: 0;

  & > a {
    width: 100%;
  }
`;

interface LinkInfo {
  href: string;
  label: React.ReactNode;
}

export default function Nav() {
  const { user } = useAuthContext();
  const [anchorElement, setAnchorElement] = useState<null | HTMLElement>(null);
  const isOpen = anchorElement !== null;

  const isModerator = user?.isCanvasModerator;

  const links: LinkInfo[] = [
    { href: "/leaderboard", label: "Leaderboard" },
    ...(isModerator ? [{ href: "/moderation", label: "Moderation" }] : []),
    { href: "/settings", label: "Settings" },
    user ?
      { href: "/me", label: user.username }
    : { href: "/signin", label: "Sign in" },
  ];

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorElement(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorElement(null);
  };

  return (
    <nav>
      <MenuButton
        id="navigation-menu-button"
        aria-controls={isOpen ? "navigation-menu" : undefined}
        aria-expanded={isOpen ? "true" : undefined}
        aria-haspopup="true"
        aria-label="Open menu"
        onClick={handleOpen}
      >
        <MenuIcon />
      </MenuButton>
      <Menu
        id="navigation-menu"
        anchorEl={anchorElement}
        open={isOpen}
        onClose={handleClose}
        slotProps={{
          list: { "aria-labelledby": "navigation-menu-button" },
        }}
      >
        {links.map(({ href, label }) => (
          <StyledMenuItem key={href}>
            <NavLink href={href}>{label}</NavLink>
          </StyledMenuItem>
        ))}
      </Menu>
      <Links>
        {links.map(({ href, label }) => (
          <li key={href}>
            <NavLink href={href}>{label}</NavLink>
          </li>
        ))}
      </Links>
    </nav>
  );
}

"use client";

import { DiscordUserProfile } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { redirect, usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import LayoutWithHeader from "@/components/LayoutWithNavbar";
import { useAuthContext } from "@/contexts";

const TabBar = styled("div")`
  border-radius: 0.5rem;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(3, 1fr);
  background-color: var(--discord-legacy-not-quite-black);
  padding: 0.5rem;
`;

const StyledTab = styled("button")`
  appearance: none;
  border: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-style: inherit;
  line-height: inherit;

  background-color: var(--discord-legacy-not-quite-black);
  border-radius: inherit;
  cursor: pointer;
  font-weight: 500;
  letter-spacing: 0.005rem;
  padding: 0.5rem 1rem;
  place-items: center;
  text-align: center;
  touch-action: manipulation;
  transition-duration: var(--transition-duration-fast);
  transition-property: background, color, outline;
  transition-timing-function: ease;
  user-select: none;

  /*
  * Workaround for accessibility issue with VoiceOver.
  * See https://gerardkcohen.me/writing/2017/voiceover-list-style-type.html
  */
  &::before {
    content: "\\200B"; /* zero-width space */
  }

  &[aria-selected="true"] {
    background-color: var(--discord-legacy-dark-but-not-black);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background-color: var(--discord-legacy-dark-but-not-black);
    }
  }

  &:focus-visible {
    background-color: var(--discord-legacy-dark-but-not-black);
    outline: var(--focus-outline);
  }

  &:active {
    background-color: var(--discord-legacy-greyple);
  }
`;

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--layout-padding-y));
  padding-block: 4rem;
  padding-inline: var(--layout-padding-x);
  place-items: center;
`;

function verifyAdmin(user: DiscordUserProfile | null, isAuthResolved: boolean) {
  if (!isAuthResolved) return;
  if (!user?.isCanvasAdmin) redirect("/");
}

export default function Admin({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, isAuthResolved } = useAuthContext();
  verifyAdmin(user, isAuthResolved);

  return (
    <LayoutWithHeader>
      {/* TODO: actual styling here */}
      <Wrapper>
        <h1>Admin</h1>
        <TabBar>
          {/* stolen from the action panel temporarily */}
          <StyledTab
            type="button"
            aria-selected={pathname === "/admin/event"}
            onClick={() => router.push("/admin/event")}
          >
            Event
          </StyledTab>
          <StyledTab
            type="button"
            aria-selected={pathname === "/admin/canvas"}
            onClick={() => router.push("/admin/canvas")}
          >
            Canvas
          </StyledTab>
          <StyledTab
            type="button"
            aria-selected={pathname === "/admin/color"}
            onClick={() => router.push("/admin/color")}
          >
            Color
          </StyledTab>
        </TabBar>
        {children}
      </Wrapper>
    </LayoutWithHeader>
  );
}

"use client";

import { css, styled } from "@mui/material";
import Image from "next/image";
import { CanvasPicker } from "../canvas";
import Nav, { NavLink } from "./Nav";

const Wrapper = styled("header")`
  body:has(&) {
    --layout-padding-x: 2rem;
    --layout-padding-y: 1rem;

    ${({ theme }) => theme.breakpoints.up("lg")} {
      --layout-padding-x: 4rem;
      --layout-padding-y: 2rem;
    }
  }

  background-color: var(--discord-legacy-dark-but-not-black);
  border-block-end: var(--card-border);
  display: grid;
  font-size: 1.35rem;
  gap: 0.5rem;
  grid-template-columns: auto 1fr auto;
  justify-content: flex-end;
  padding-block: 0.5rem;
  place-items: center;

  ${({ theme }) => theme.breakpoints.up("md")} {
    gap: 1rem;
    padding-inline: var(--layout-padding-x);
  }
`;

const CompositeLogo = styled(NavLink)`
  align-items: center;
  display: block flex;
  gap: 1.5rem;
  user-select: none;
`;

const Wordmark = styled("div")`
  display: none;
  font-weight: 900;
  font-stretch: 125%;
  font-width: 125%;
  text-decoration: none;

  ${({ theme }) => theme.breakpoints.up("md")} {
    display: block;
  }
`;

const Logo = styled(Image)(
  (props) => css`
    min-width: ${props.width}px;
    min-height: ${props.height}px;
  `,
);

export default function Header() {
  return (
    <Wrapper>
      <CompositeLogo href="/">
        <Logo
          alt="Blurple Canvas logo"
          src="/images/blurple-canvas-logo~dark.svg"
          width={28}
          height={28}
        />
        <Wordmark>Blurple Canvas</Wordmark>
      </CompositeLogo>
      <CanvasPicker />
      <Nav />
    </Wrapper>
  );
}

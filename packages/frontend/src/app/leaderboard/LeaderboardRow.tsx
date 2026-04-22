"use client";

import { LeaderboardEntry } from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";
import Avatar, { AvatarSkeleton } from "@/components/Avatar";

const TableRow = styled("li")`
  align-items: baseline;
  border-end-end-radius: calc(infinity * 1px);
  border-end-start-radius: var(--card-border-radius);
  border-start-end-radius: calc(infinity * 1px);
  border-start-start-radius: var(--card-border-radius);
  column-gap: 1.25rem;
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  grid-template-rows: auto auto;
  padding: 1rem;

  @media (hover: hover) and (pointer: fine) {
    &:not([aria-busy="true"]):hover {
      background-color: oklch(from currentColor l c h / 3%);
    }
  }
`;

const Rank = styled("div")`
  color: oklch(from currentColor l c h / 45%);
  display: grid;
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  grid-row: 1 / -1;
  grid-template-columns: subgrid;
  text-align: center;
  [aria-hidden="true"] {
    visibility: hidden;
  }
`;

const UsernameWrapper = styled("div")`
  text-align: start;
  display: grid;
  grid-template-columns: subgrid;
  grid-row: 1 / -1;
`;

const Username = styled("div")`
  font-stretch: 125%;
  font-width: 125%;
  font-weight: 600;
  word-break: break-all;
  letter-spacing: 0.01em;
`;

const PixelCount = styled("div")`
  color: oklch(from var(--discord-white) l c h / 55%);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
`;

const StyledAvatar = styled(Avatar)`
  align-self: center;
  grid-row: 1 / -1;
`;

interface LoadingEntry extends Pick<LeaderboardEntry, "userId" | "rank"> {
  isLoading: true;
}

interface LoadedEntry extends LeaderboardEntry {
  isLoading: false;
}

export type LeaderboardRowEntry = LoadingEntry | LoadedEntry;

export interface LeaderboardRowProps {
  entry: LeaderboardEntry;
}

export function LeaderboardRowSkeleton() {
  return (
    <TableRow aria-busy>
      <Rank>
        <Skeleton width="2ch" />
      </Rank>
      <UsernameWrapper>
        <Skeleton width="min(24ch, 100%)" />
        <Skeleton width="min(10ch, 100%)" />
      </UsernameWrapper>
      <AvatarSkeleton
        size={60}
        sx={{ alignSelf: "center", gridRow: "1 / -1" }}
      />
    </TableRow>
  );
}

export default function LeaderboardRow({ entry }: LeaderboardRowProps) {
  return (
    <TableRow>
      <Rank>{entry.rank.toLocaleString()}</Rank>
      <UsernameWrapper>
        <Username>{entry.username ?? entry.userId}</Username>
        <PixelCount>
          {entry.totalPixels.toLocaleString()}&nbsp;
          {entry.totalPixels === 1 ? "pixel" : "pixels"}
        </PixelCount>
      </UsernameWrapper>
      <StyledAvatar
        profilePictureUrl={entry.profilePictureUrl}
        size={60}
        username={entry.username ?? entry.userId}
      />
    </TableRow>
  );
}

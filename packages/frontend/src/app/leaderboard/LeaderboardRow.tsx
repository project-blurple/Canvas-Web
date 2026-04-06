"use client";

import { LeaderboardEntry } from "@blurple-canvas-web/types";
import { css, Skeleton, styled } from "@mui/material";
import Avatar, { AvatarSkeleton } from "@/components/Avatar";

const RankCell = styled("td", {
  shouldForwardProp: (prop) => prop !== "$isLoading",
})<{
  $isLoading?: boolean;
}>`
  color: oklch(from var(--discord-white) l c h / 45%);

  ${(props) =>
    props.$isLoading &&
    css`
      visibility: hidden;
    `};
`;

const AvatarCell = styled("td")`
  --avatar-size: min(8svw, 3.75rem);
  --width: calc(var(--avatar-size) + 2 * var(--cell-padding));

  // We need to define the width here so that the cell doesn't get wider than the avatar.
  width: var(--width);
  min-width: var(--width);
  max-width: var(--width);

  > * {
    max-height: var(--avatar-size);
  }
`;

const UsernameCell = styled("td")`
  font-stretch: 125%;
  font-weight: 900;
  font-width: 125%;
  text-align: start;
`;

const Username = styled("p")`
  word-break: break-all;
`;

const PixelCountCell = styled("td")`
  text-align: center;
`;

const PixelCountCellContents = styled("div")`
  display: grid;
  place-items: center;
`;

const PixelCount = styled("span")`
  font-stretch: 125%;
  font-weight: 900;
`;

const PixelCountLabel = styled("span")`
  color: oklch(from var(--discord-white) l c h / 55%);
  font-size: min(2svw, 0.75rem);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const PixelCountSkeleton = styled(Skeleton)`
  width: min(12svw, 5.5rem);
`;

interface LoadingEntry extends Pick<LeaderboardEntry, "userId" | "rank"> {
  isLoading: true;
}

interface LoadedEntry extends LeaderboardEntry {
  isLoading: false;
}

export type LeaderboardRowEntry = LoadingEntry | LoadedEntry;

export interface LeaderboardRowProps {
  entry: LeaderboardRowEntry;
}

export default function LeaderboardRow({ entry }: LeaderboardRowProps) {
  return (
    <tr>
      <RankCell $isLoading={entry.isLoading}>
        {entry.rank.toLocaleString()}
      </RankCell>
      <AvatarCell>
        {entry.isLoading ?
          <AvatarSkeleton />
        : <Avatar
            username={entry.username ?? entry.userId}
            profilePictureUrl={entry.profilePictureUrl}
          />
        }
      </AvatarCell>
      <UsernameCell>
        <Username>
          {entry.isLoading ?
            <Skeleton variant="rounded" width="min(35svw, 16rem)" />
          : (entry.username ?? entry.userId)}
        </Username>
      </UsernameCell>
      <PixelCountCell>
        <PixelCountCellContents>
          <PixelCount>
            {entry.isLoading ?
              <PixelCountSkeleton />
            : entry.totalPixels.toLocaleString()}
          </PixelCount>
          <PixelCountLabel>
            {entry.isLoading ?
              <PixelCountSkeleton />
            : "pixels placed"}
          </PixelCountLabel>
        </PixelCountCellContents>
      </PixelCountCell>
    </tr>
  );
}

"use client";

import Avatar, { AvatarSkeleton } from "@/components/Avatar";
import { useCanvasContext } from "@/contexts";
import { useLeaderboard } from "@/hooks/queries/useLeaderboard";
import { LeaderboardEntry } from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  place-items: center;
  padding-inline: var(--layout-padding-x);
  padding-block: calc(2 * var(--layout-padding-y));
  gap: calc(2 * var(--layout-padding-y));
`;

const TitleBlock = styled("div")`
  text-align: center;
`;

const Table = styled("table")`
  font-size: min(4svw, 1.75rem);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  inline-size: min(40rem, 100%);

  th,
  td {
    --cell-padding: min(1.5svw, 1rem);
    padding: var(--cell-padding);
  }
`;

const RankCell = styled("td")`
  color: oklch(from var(--discord-white) l c h / 45%);
`;

const AvatarCell = styled("td")`
  --avatar-size: min(8svw, 3.75rem);
  --width: calc(var(--avatar-size) + 2 * var(--cell-padding));

  width: var(--width);
  min-width: var(--width);
`;

const UsernameCell = styled("td")`
  font-stretch: 125%;
  font-weight: 900;
  text-align: left;
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

const NoContentsMessage = styled("p")`
  color: oklch(from var(--discord-white) l c h / 55%);
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
`;

function leaderboardRecordToTableRow(user?: LeaderboardEntry): JSX.Element {
  const { userId, rank, profilePictureUrl, username, totalPixels } = user ?? {};
  return (
    <tr key={userId}>
      <RankCell>{rank}</RankCell>
      <AvatarCell>
        {userId && profilePictureUrl ?
          <Avatar
            username={username ?? userId}
            profilePictureUrl={profilePictureUrl}
          />
        : <AvatarSkeleton />}
      </AvatarCell>
      <UsernameCell>
        <Username>
          {userId ?
            (username ?? userId)
          : <Skeleton variant="rounded" width="min(35svw, 16rem)" />}
        </Username>
      </UsernameCell>
      <PixelCountCell>
        <PixelCountCellContents>
          <PixelCount>
            {totalPixels ?
              totalPixels.toLocaleString()
            : <Skeleton width="min(12svw, 5.5rem)" />}
          </PixelCount>
          <PixelCountLabel>
            {totalPixels ?
              <>pixels placed</>
            : <Skeleton width="min(12svw, 5.5rem)" />}
          </PixelCountLabel>
        </PixelCountCellContents>
      </PixelCountCell>
    </tr>
  );
}

export default function Leaderboard() {
  const { canvas } = useCanvasContext();
  const { data: leaderboard = [], isLoading: leaderboardIsLoading } =
    useLeaderboard(canvas.id);

  return (
    <Wrapper>
      <TitleBlock>
        <h1>Leaderboard</h1>
        <h2>{canvas.name}</h2>
      </TitleBlock>
      <Table>
        <thead hidden>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Pixels placed</th>
          </tr>
        </thead>
        <tbody>
          {leaderboardIsLoading ?
            Array.from({ length: 10 }, () => leaderboardRecordToTableRow())
          : leaderboard.length > 0 ?
            leaderboard.map(leaderboardRecordToTableRow)
          : <NoContentsMessage>No leaderboard found</NoContentsMessage>}
        </tbody>
      </Table>
    </Wrapper>
  );
}

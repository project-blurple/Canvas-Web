"use client";

import { LeaderboardEntry } from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";
import Avatar from "@/components/Avatar";
import { useCanvasContext } from "@/contexts";
import { useLeaderboard } from "@/hooks/queries/useLeaderboard";

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  place-items: center;
  padding: 4rem 4rem;
  gap: 4rem;
`;

const TitleBlock = styled("div")`
  text-align: center;
`;

const Table = styled("table")`
  font-size: min(4svw, 1.75rem);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  inline-size: min(40rem, 100svw);
  max-inline-size: 100%;

  th,
  td {
    padding: min(1.5svw, 1rem);
  }
`;

const RankCell = styled("td")`
  color: oklch(from var(--discord-white) l c h / 45%);
  text-align: center;
`;

const UserCell = styled("td")`
  align-items: center;
  display: flex;
  font-stretch: 125%;
  font-weight: 900;
  gap: 1rem;
`;

const Username = styled("p")`
  max-inline-size: 22rem;
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
  font-size: 0.75rem;
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
      <UserCell>
        {userId && profilePictureUrl ?
          <Avatar
            username={username ?? userId}
            profilePictureUrl={profilePictureUrl}
            size={60}
          />
        : <Skeleton variant="circular" width={60} height={60} />}
        <Username>
          {userId ?
            (username ?? userId)
          : <Skeleton variant="rounded" width={260} />}
        </Username>
      </UserCell>
      <PixelCountCell>
        <PixelCountCellContents>
          <PixelCount>
            {totalPixels ?
              totalPixels.toLocaleString()
            : <Skeleton width={90} />}
          </PixelCount>
          <PixelCountLabel>
            {totalPixels ?
              <>pixels placed</>
            : <Skeleton width={90} />}
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

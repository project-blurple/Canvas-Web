"use client";

import { LeaderboardEntry } from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useCanvasContext } from "@/contexts";
import { useLeaderboard } from "@/hooks/queries/useLeaderboard";
import LeaderboardRow, { LeaderboardRowEntry } from "./LeaderboardRow";

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  place-items: center;
  padding-inline: var(--layout-padding-x);
  padding-block: 4rem;
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

const NoContentsMessage = styled("p")`
  color: oklch(from var(--discord-white) l c h / 55%);
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: center;
`;

export default function Leaderboard() {
  const { canvas } = useCanvasContext();
  const { data: leaderboard = [], isLoading: isLeaderboardLoading } =
    useLeaderboard(canvas.id);

  const entries = toLeaderboardRowEntries(isLeaderboardLoading, leaderboard);
  const isLeaderboardEmpty = entries.length === 0;

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
          {isLeaderboardEmpty ?
            <NoContentsMessage>No leaderboard found</NoContentsMessage>
          : entries.map((entry) => (
              <LeaderboardRow key={entry.userId} entry={entry} />
            ))
          }
        </tbody>
      </Table>
    </Wrapper>
  );
}

function toLeaderboardRowEntries(
  isLoading: boolean,
  entries: LeaderboardEntry[],
): LeaderboardRowEntry[] {
  if (isLoading) {
    return Array.from({ length: 10 }, (_, index) => ({
      isLoading: true,
      userId: index.toString(), // This is used for the React key prop.
      rank: index + 1,
    }));
  }

  return entries.map((entry) => ({
    isLoading: false,
    ...entry,
  }));
}

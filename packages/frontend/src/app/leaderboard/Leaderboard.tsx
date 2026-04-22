"use client";

import { useCanvasContext } from "@/contexts";
import { useLeaderboard } from "@/hooks/queries/useLeaderboard";
import { styled } from "@mui/material";
import Pagination from "@mui/material/Pagination";
import { useId, useState } from "react";
import LeaderboardRow, { LeaderboardRowSkeleton } from "./LeaderboardRow";

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: calc(2 * var(--layout-padding-y));
  padding-block: 4rem;
  padding-inline: var(--layout-padding-x);
  place-items: center;
`;

const TitleBlock = styled("div")`
  text-align: center;
`;

const List = styled("ol")`
  display: grid;
  font-size: 1.2rem;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  grid-template-columns: auto 1fr auto;
  inline-size: min(36rem, 100%);
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
  const [page, setPage] = useState(1); // TODO: Use URL for this state

  const {
    data: { total, page: currentPage, size = 10, entries } = {},
    isFetching: isLeaderboardFetching,
  } = useLeaderboard(canvas.id, page);
  const isLeaderboardEmpty = entries?.length === 0;

  const [prevCanvasId, setPrevCanvasId] = useState(canvas.id);
  if (prevCanvasId !== canvas.id) {
    setPage(1);
    setPrevCanvasId(canvas.id);
  }

  const listId = useId();

  return (
    <Wrapper>
      <TitleBlock>
        <h1>Leaderboard</h1>
        <h2>{canvas.name}</h2>
      </TitleBlock>

      {/** biome-ignore lint/a11y/noRedundantRoles: <explanation> */}
      <List
        aria-busy={isLeaderboardFetching}
        id={listId}
        role="list"
        start={entries?.[0]?.rank}
      >
        {isLeaderboardFetching ?
          Array.from({ length: 10 }, (_, index) => (
            <LeaderboardRowSkeleton key={index.toString()} />
          ))
        : isLeaderboardEmpty ?
          <NoContentsMessage>No leaderboard found</NoContentsMessage>
        : entries?.map((entry) => (
            <LeaderboardRow key={entry.userId} entry={entry} />
          ))
        }
      </List>
      <Pagination
        aria-controls={listId}
        color="primary"
        count={total ? Math.ceil(total / size) : currentPage}
        onChange={(_, value) => setPage(value)}
        page={page}
        shape="rounded"
        showFirstButton
        showLastButton
      />
    </Wrapper>
  );
}

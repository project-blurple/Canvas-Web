"use client";

import { Pagination, PaginationItem, styled } from "@mui/material";
import { useEffect, useState } from "react";
import { useCanvasContext } from "@/contexts";
import { useLeaderboard } from "@/hooks/queries/useLeaderboard";
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
  const [page, setPage] = useState(1);
  const {
    data: { total, page: currentPage, size, entries: leaderboard } = {
      total: undefined,
      page: page,
      size: 10,
      entries: [],
    },
    isLoading: isLeaderboardLoading,
  } = useLeaderboard(canvas.id, page);

  useEffect(() => {
    if (canvas.id) setPage(1);
  }, [canvas.id]);

  const isLeaderboardEmpty = leaderboard.length === 0;

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
          {isLeaderboardLoading ?
            Array.from({ length: size }, (_, index) => (
              <LeaderboardRowSkeleton key={index.toString()} />
            ))
          : isLeaderboardEmpty ?
            <NoContentsMessage>No leaderboard found</NoContentsMessage>
          : leaderboard.map((entry) => (
              <LeaderboardRow key={entry.userId} entry={entry} />
            ))
          }
        </tbody>
      </Table>
      <Pagination
        page={page}
        siblingCount={0}
        boundaryCount={0}
        showFirstButton
        showLastButton
        onChange={(_, value) => setPage(value)}
        count={total ? Math.ceil(total / size) : currentPage}
        color="primary"
        size="large"
        renderItem={(item) => {
          switch (item.type) {
            case "start-ellipsis":
            case "end-ellipsis":
              return null;
            case "page":
              if (item.page !== currentPage) return null;
          }

          return <PaginationItem {...item} />;
        }}
        sx={{
          display: total === 0 ? "none" : "inherit",
        }}
      />
    </Wrapper>
  );
}

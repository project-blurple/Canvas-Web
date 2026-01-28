"use client";

import Avatar from "@/components/Avatar";
import { useCanvasContext } from "@/contexts";
import { useLeaderboard } from "@/hooks/queries/useLeaderboard";
import { LeaderboardEntry } from "@blurple-canvas-web/types";
import { Pagination, PaginationItem, Skeleton, styled } from "@mui/material";
import { useEffect, useState } from "react";

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  place-items: center;
  padding: 4rem 4rem;
  gap: 4rem;
  overflow-x: hidden;
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

const EntryRow = styled("tr")`
  height: 60px;
  overflow: hidden;
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
  max-inline-size: min(22rem, 50vw);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
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
    <EntryRow key={userId}>
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
    </EntryRow>
  );
}

export default function Leaderboard() {
  const { canvas } = useCanvasContext();
  const [page, setPage] = useState(0);
  const {
    data: { total, page: currentPage, size, entries: leaderboard } =
      { total: undefined, page: page + 1, size: 10, entries: [] },
    isLoading: leaderboardIsLoading,
  } = useLeaderboard(canvas.id, page + 1);

  useEffect(() => {
    if (canvas.id) setPage(0);
  }, [canvas.id]);

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
            Array.from({ length: size }, () => leaderboardRecordToTableRow())
          : leaderboard.length > 0 ?
            leaderboard.map(leaderboardRecordToTableRow)
          : <NoContentsMessage>No leaderboard found</NoContentsMessage>}
        </tbody>
      </Table>
      <Pagination
        page={page + 1}
        siblingCount={0}
        boundaryCount={0}
        showFirstButton
        showLastButton
        onChange={(_, value) => setPage(value - 1)}
        count={total ? Math.ceil(total / size) : currentPage}
        color="primary"
        size="large"
        renderItem={(item) => {
          switch (item.type) {
            case "start-ellipsis":
            case "end-ellipsis":
              return null;
            case "page":
              if (item.page !== currentPage)
                return null;
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

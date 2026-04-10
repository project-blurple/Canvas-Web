"use client";

import { UserStats } from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";
import {
  formatTimestamp,
  formatTimestampLocalTZ,
  getOrdinalSuffix,
} from "@/util";

const EmptyStateMessage = styled("div")`
  border-radius: var(--card-border-radius);
  background-color: var(--discord-legacy-not-quite-black);
  padding: 1rem;
`;

const Table = styled("table")`
  container-type: inline-size;
  margin-block-start: 1rem;
  font-size: 1.125rem;
  width: 100%;

  th,
  td {
    padding: 0.5rem;
  }

  th {
    font-weight: 600;
    text-align: start;
  }

  td {
    text-align: end;
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }
`;

interface StatsTableProps {
  stats?: UserStats;
  isStatsLoading: boolean;
}

export default function StatsTable({ stats, isStatsLoading }: StatsTableProps) {
  if (!stats && !isStatsLoading)
    return (
      <EmptyStateMessage>You don’t have any stats (yet)!</EmptyStateMessage>
    );

  const { totalPixels, mostFrequentColor, mostRecentTimestamp, rank } =
    stats ?? {};

  return (
    <Table>
      <tbody>
        <tr>
          <th>
            {isStatsLoading ?
              <Skeleton width="clamp(5rem, 45cqi, 9rem)" />
            : <>{totalPixels?.toLocaleString() ?? "?"}&nbsp;pixels placed</>}
          </th>
          <td>
            {isStatsLoading ?
              <Skeleton width="clamp(1.5rem, 12.5cqi, 2.5rem)" />
            : rank !== undefined &&
              `${rank.toLocaleString()}${getOrdinalSuffix(rank)}`
            }
          </td>
        </tr>
        <tr>
          <th>
            {isStatsLoading ?
              <Skeleton width="clamp(4.5rem, 40cqi, 8rem)" />
            : <>Most used color</>}
          </th>
          <td>
            {isStatsLoading ?
              <Skeleton width="clamp(3rem, 25cqi, 5rem)" />
            : (mostFrequentColor?.name ?? "Unknown")}
          </td>
        </tr>
        <tr>
          <th>
            {isStatsLoading ?
              <Skeleton width="clamp(5.5rem, 50cqi, 10rem)" />
            : <>Most recently placed</>}
          </th>
          <td>
            {isStatsLoading ?
              <Skeleton width="clamp(4.5rem, 40cqi, 8rem)" />
            : mostRecentTimestamp ?
              <span title={formatTimestamp(mostRecentTimestamp)}>
                {formatTimestampLocalTZ(mostRecentTimestamp)}
              </span>
            : "Unknown"}
          </td>
        </tr>
      </tbody>
    </Table>
  );
}

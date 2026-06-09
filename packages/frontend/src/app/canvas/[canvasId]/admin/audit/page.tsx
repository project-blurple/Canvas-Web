"use client";

import {
  AUDIT_ACTIONS_BY_RESOURCE,
  AUDIT_RESOURCE_TYPES,
  type AuditLogEntry,
  type AuditResourceType,
} from "@blurple-canvas-web/types";
import { styled } from "@mui/material";
import { useMemo, useState } from "react";
import Avatar from "@/components/Avatar";
import DynamicButton from "@/components/button/DynamicButton";
import { type AuditLogFilters, useAuditLog } from "@/hooks/queries/useAuditLog";
import AdminDashboard from "../AdminDashboard";

const AuditPageBlock = styled("section")`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 80rem;
  width: 100%;
`;

const FilterForm = styled("form")`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  align-items: end;
  background-color: oklch(
    from var(--discord-legacy-not-quite-black) l c h / 70%
  );
  border-radius: 0.75rem;
  padding: 1rem;

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.85rem;
    opacity: 0.85;
  }

  input,
  select {
    background-color: var(--discord-legacy-not-quite-black);
    border: 1px solid oklch(from var(--discord-white) l c h / 12%);
    border-radius: 0.375rem;
    color: inherit;
    font: inherit;
    padding: 0.45rem 0.5rem;
  }

  > .actions {
    grid-column: 1 / -1;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
`;

const EntryList = styled("ol")`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EntryCard = styled("li")`
  background-color: var(--discord-legacy-not-quite-black);
  border-radius: 0.5rem;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .actor {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 500;
  }

  .action-chip {
    background-color: oklch(from var(--discord-blurple) l c h / 25%);
    border-radius: 999px;
    font-family: var(--font-mono, monospace);
    font-size: 0.78rem;
    padding: 0.1rem 0.55rem;
  }

  .role {
    font-size: 0.75rem;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  time {
    font-size: 0.78rem;
    opacity: 0.6;
    margin-left: auto;
  }

  .resource {
    font-size: 0.85rem;
    opacity: 0.85;
  }

  details {
    margin-top: 0.25rem;
  }

  details summary {
    cursor: pointer;
    font-size: 0.78rem;
    opacity: 0.7;
  }

  details pre {
    background-color: var(--discord-legacy-dark-but-not-black);
    border-radius: 0.375rem;
    font-size: 0.78rem;
    margin: 0.4rem 0 0;
    max-height: 320px;
    overflow: auto;
    padding: 0.6rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const Empty = styled("p")`
  opacity: 0.6;
  padding: 1rem 0;
  text-align: center;
`;

const Footer = styled("div")`
  display: flex;
  justify-content: center;
  padding-block-start: 0.5rem;
`;

function humanizeResource(resource: AuditResourceType): string {
  const spaced = resource.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All actions" },
  ...AUDIT_RESOURCE_TYPES.flatMap((resource) => {
    const label = humanizeResource(resource);
    return [
      { value: `${resource}.`, label: `${label} (all)` },
      ...AUDIT_ACTIONS_BY_RESOURCE[resource].map((verb) => ({
        value: `${resource}.${verb}`,
        label: `${label}: ${verb}`,
      })),
    ];
  }),
];

const RESOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All resources" },
  ...AUDIT_RESOURCE_TYPES.map((resource) => ({
    value: resource,
    label: humanizeResource(resource),
  })),
];

function formatTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
}

interface EntryRowProps {
  readonly entry: AuditLogEntry;
}

function EntryRow({ entry }: EntryRowProps) {
  const username = entry.actorUsername ?? entry.actorId;
  const metadataJson = useMemo(
    () => JSON.stringify(entry.metadata ?? {}, null, 2),
    [entry.metadata],
  );

  return (
    <EntryCard>
      <header>
        <span className="actor">
          {entry.actorProfilePictureUrl ?
            <Avatar
              username={username}
              profilePictureUrl={entry.actorProfilePictureUrl}
              size={24}
            />
          : null}
          <span>{username}</span>
        </span>
        <span className="role">{entry.actorRole}</span>
        <span className="action-chip">{entry.action}</span>
        <time dateTime={new Date(entry.createdAt).toISOString()}>
          {formatTimestamp(entry.createdAt)}
        </time>
      </header>
      {entry.resourceType ?
        <div className="resource">
          {entry.resourceType}
          {entry.resourceId ? ` · ${entry.resourceId}` : ""}
        </div>
      : null}
      <details>
        <summary>Details</summary>
        <pre>{metadataJson}</pre>
      </details>
    </EntryCard>
  );
}

function AuditAdminPanel() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [draft, setDraft] = useState<AuditLogFilters>({});

  const query = useAuditLog(filters);
  const entries = useMemo(
    () => query.data?.pages.flatMap((page) => page.entries) ?? [],
    [query.data],
  );

  const onSubmit: React.SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setFilters({ ...draft });
  };

  const onReset = () => {
    setDraft({});
    setFilters({});
  };

  return (
    <AuditPageBlock>
      <FilterForm onSubmit={onSubmit}>
        <label>
          <span>Action</span>
          <select
            value={draft.action ?? ""}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                action: event.target.value || undefined,
              }))
            }
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Resource type</span>
          <select
            value={draft.resourceType ?? ""}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                resourceType: event.target.value || undefined,
              }))
            }
          >
            {RESOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Actor ID</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Discord user ID"
            value={draft.actorId ?? ""}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                actorId: event.target.value || undefined,
              }))
            }
          />
        </label>
        <label>
          <span>Resource ID</span>
          <input
            type="text"
            placeholder="e.g. canvas/color id"
            value={draft.resourceId ?? ""}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                resourceId: event.target.value || undefined,
              }))
            }
          />
        </label>
        <label>
          <span>From</span>
          <input
            type="datetime-local"
            value={draft.from ?? ""}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                from: event.target.value || undefined,
              }))
            }
          />
        </label>
        <label>
          <span>To</span>
          <input
            type="datetime-local"
            value={draft.to ?? ""}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                to: event.target.value || undefined,
              }))
            }
          />
        </label>
        <div className="actions">
          <DynamicButton type="button" onClick={onReset}>
            Reset
          </DynamicButton>
          <DynamicButton type="submit">Apply filters</DynamicButton>
        </div>
      </FilterForm>

      <EntryList>
        {query.isLoading ?
          <Empty>Loading audit log…</Empty>
        : query.isError ?
          <Empty>Failed to load audit log.</Empty>
        : entries.length === 0 ?
          <Empty>No audit entries match these filters.</Empty>
        : entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)}
      </EntryList>

      <Footer>
        {query.hasNextPage ?
          <DynamicButton
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </DynamicButton>
        : null}
      </Footer>
    </AuditPageBlock>
  );
}

export default function AuditAdminPage() {
  return (
    <AdminDashboard>
      <AuditAdminPanel />
    </AdminDashboard>
  );
}

"use client";

import { CircularProgress, styled } from "@mui/material";
import { AxiosError } from "axios";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/button";
import { useAuthContext } from "@/contexts";
import { useRefreshGuildMemberships } from "@/hooks";

type RefreshMutation = ReturnType<typeof useRefreshGuildMemberships>;

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const StatusText = styled("p")`
  color: oklch(from var(--discord-white) l c h / 60%);
  font-size: 0.875rem;
  margin: 0;
`;

const InlineTrigger = styled("button")`
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 0;
  text-decoration: underline;

  &:disabled {
    cursor: progress;
  }
`;

const StatusBlock = styled("p")`
  color: oklch(from var(--discord-white) l c h / 60%);
  font-size: 0.875rem;
  margin: 0.25rem 0 0;
`;

const SUCCESS_TEXT_RESET_MS = 5_000;

function getErrorText(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof AxiosError && error.response?.status === 429) {
    return "Slow down — try again in a minute.";
  }
  return "Couldn't reach Discord. Try again shortly.";
}

export type RecheckMembershipsController = RefreshMutation & {
  showSuccess: boolean;
  errorText: string | null;
  statusText: string | null;
};

export function useRecheckMemberships(): RecheckMembershipsController {
  const { user } = useAuthContext();
  const mutation = useRefreshGuildMemberships(user?.id);
  const { isPending, isSuccess, error, reset } = mutation;
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!isSuccess) return;
    setShowSuccess(true);
    const timer = setTimeout(() => {
      setShowSuccess(false);
      reset();
    }, SUCCESS_TEXT_RESET_MS);
    return () => clearTimeout(timer);
  }, [isSuccess, reset]);

  const errorText = getErrorText(error);
  const statusText =
    isPending ?
      "Checking with Discord…"
    : (errorText ?? (showSuccess ? "Server list updated." : null));

  return { ...mutation, showSuccess, errorText, statusText };
}

export default function RecheckMembershipsButton() {
  const { user } = useAuthContext();
  const { mutate, isPending, showSuccess, errorText } = useRecheckMemberships();

  if (!user) return null;

  return (
    <Wrapper>
      <Button
        variant="contained"
        onClick={() => mutate()}
        disabled={isPending}
        startIcon={
          isPending ?
            <CircularProgress color="inherit" size="1em" />
          : undefined
        }
      >
        {isPending ? "Rechecking…" : "Recheck your Discord servers"}
      </Button>
      {showSuccess && !errorText && (
        <StatusText>Server list updated.</StatusText>
      )}
      {errorText && <StatusText role="alert">{errorText}</StatusText>}
    </Wrapper>
  );
}

interface RecheckMembershipsLinkProps {
  children?: ReactNode;
  controller: RecheckMembershipsController;
}

export function RecheckMembershipsLink({
  children = "here",
  controller,
}: RecheckMembershipsLinkProps) {
  const { user } = useAuthContext();
  const { mutate, isPending } = controller;

  if (!user) return <>{children}</>;

  return (
    <InlineTrigger
      type="button"
      onClick={() => mutate()}
      disabled={isPending}
      aria-label="Refresh your Discord server list"
    >
      {children}
    </InlineTrigger>
  );
}

interface RecheckMembershipsStatusProps {
  className?: string;
  controller: RecheckMembershipsController;
}

export function RecheckMembershipsStatus({
  className,
  controller,
}: Readonly<RecheckMembershipsStatusProps>) {
  const { user } = useAuthContext();
  const { statusText, errorText } = controller;

  if (!user || !statusText) return null;

  return (
    <StatusBlock className={className} role={errorText ? "alert" : "status"}>
      {statusText}
    </StatusBlock>
  );
}

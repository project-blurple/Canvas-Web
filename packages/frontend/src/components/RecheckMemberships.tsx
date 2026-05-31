"use client";

import { styled } from "@mui/material";
import { AxiosError } from "axios";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button, PrimitiveButton } from "@/components/button";
import { useAuthContext } from "@/contexts";
import { useRefreshGuildMemberships } from "@/hooks";

type RefreshMutation = ReturnType<typeof useRefreshGuildMemberships>;

const Wrapper = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const InlineTrigger = styled(PrimitiveButton)`
  cursor: pointer;
  text-decoration-line: underline;

  &[aria-busy="true"] {
    cursor: progress;
  }
`;

function getErrorText(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof AxiosError && error.response?.status === 429) {
    return "Slow down — try again in a minute";
  }
  return "Couldn’t reach Discord. Try again shortly.";
}

type RecheckMembershipsController = RefreshMutation & {
  errorText: string | null;
};

export function useRecheckMemberships(): RecheckMembershipsController {
  const { user } = useAuthContext();
  const mutation = useRefreshGuildMemberships(user?.id);
  const errorText = getErrorText(mutation.error);

  return { ...mutation, errorText };
}

export default function RecheckMembershipsButton() {
  const { user } = useAuthContext();
  const { mutateAsync, isPending, errorText } = useRecheckMemberships();

  if (!user) return null;

  return (
    <Wrapper>
      <Button
        variant="contained"
        onClick={async () => {
          toast.promise(mutateAsync(), {
            loading: "Rechecking servers…",
            success: "Server list updated",
            error: errorText ?? "Failed to reach Discord. Please try again.",
          });
        }}
        disabled={isPending}
      >
        Recheck your Discord servers
      </Button>
    </Wrapper>
  );
}

interface RecheckMembershipsLinkProps {
  children: ReactNode;
  controller: RecheckMembershipsController;
}

export function RecheckMembershipsLink({
  children,
  controller,
}: RecheckMembershipsLinkProps) {
  const { user } = useAuthContext();
  const { mutateAsync, isPending, errorText } = controller;

  if (!user) return <>{children}</>;

  return (
    <InlineTrigger
      type="button"
      onClick={async () => {
        toast.promise(mutateAsync(), {
          loading: "Rechecking servers…",
          success: "Server list updated",
          error: errorText ?? "Failed to reach Discord. Please try again.",
        });
      }}
      disabled={isPending}
    >
      {children}
    </InlineTrigger>
  );
}

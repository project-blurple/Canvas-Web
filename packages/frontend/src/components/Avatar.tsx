"use client";

import type { DiscordUserProfile } from "@blurple-canvas-web/types";
import { Skeleton, styled } from "@mui/material";

interface AvatarProps
  extends
    Pick<DiscordUserProfile, "username" | "profilePictureUrl">,
    React.ComponentPropsWithRef<"object"> {
  /** In pixels */
  size?: number;
}

const StyledObject = styled("object")`
  aspect-ratio: 1;
  border-radius: calc(infinity * 1px);
  border: var(--card-border);
`;

const AvatarImage = styled("img")`
  height: 100%;
  object-fit: cover;
  object-position: center;
  width: 100%;
`;

export default function Avatar({
  username,
  profilePictureUrl,
  size,
  ...props
}: AvatarProps) {
  const hash = (username.length % 6) as 0 | 1 | 2 | 3 | 4 | 5;
  return (
    <StyledObject
      data={profilePictureUrl}
      role="img"
      width={size}
      height={size}
      {...props}
    >
      <AvatarImage
        alt={`${username}’s avatar`}
        src={`https://cdn.discordapp.com/embed/avatars/${hash}.png`}
        width={size}
        height={size}
      />
    </StyledObject>
  );
}

interface AvatarSkeletonProps extends React.ComponentPropsWithoutRef<
  typeof Skeleton
> {
  size?: string | number | undefined;
}

export function AvatarSkeleton({ size, sx, ...props }: AvatarSkeletonProps) {
  return (
    <Skeleton
      variant="circular"
      width={size ?? "100%"}
      height={size ?? "auto"}
      sx={{ aspectRatio: 1, ...sx }}
      {...props}
    />
  );
}

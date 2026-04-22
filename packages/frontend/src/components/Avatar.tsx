"use client";

import { DiscordUserProfile } from "@blurple-canvas-web/types";
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
  border: oklch(from var(--discord-white) l c h / 12%) 1px solid;
  object-fit: cover;
  overflow: hidden;
`;

const AvatarImage = styled("img")`
  border-radius: inherit;
  outline: inherit;
  outline-offset: inherit;
  aspect-ratio: 1;
  object-fit: cover;
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
      style={{
        minHeight: size,
        minWidth: size,
        height: size,
        width: size,
      }}
      {...props}
    >
      <AvatarImage
        alt={`${username}’s avatar`}
        src={`https://cdn.discordapp.com/embed/avatars/${hash}.png`}
        width={size}
        height={size}
        style={{
          minHeight: size,
          minWidth: size,
          height: size,
          width: size,
        }}
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

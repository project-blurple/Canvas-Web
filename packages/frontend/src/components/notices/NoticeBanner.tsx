import type { Notice } from "@blurple-canvas-web/types";
import { styled } from "@mui/material/styles";
import { CircleX, Info, TriangleAlert, X } from "lucide-react";

type BannerComponent = typeof StyledBanner;

const StyledBanner = styled("div")`
  align-items: center;
  background-color: var(--discord-legacy-dark-but-not-black);
  border-radius: var(--card-border-radius);
  border: 3px solid;
  box-shadow: 0 0 10px rgba(0 0 0 / 50%);
  cursor: default;
  display: flex;
  flex-direction: row;
  gap: 1rem;
  justify-content: center;
  padding: 1rem;
  width: fit-content;

  & > svg {
    flex: 0 0 auto;
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const StyledInfoBanner = styled(StyledBanner)`
  border-color: oklch(from var(--discord-white) l c h / 50%);
`;

const StyledWarningBanner = styled(StyledBanner)`
  border-color: var(--discord-blurple);
`;

const StyledErrorBanner = styled(StyledBanner)`
  border-color: var(--discord-red);
`;

const BannerBody = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
`;

const DismissButton = styled("button")`
  background: transparent;
  border: none;
  cursor: pointer;
  flex: 0 0 auto;
  opacity: 25%;
  transition: opacity var(--transition-duration-fast) ease;

  :hover {
    opacity: 75%;
  }
`;

interface BannerProps {
  notice: Notice;
  onDismiss?: () => void;
}

function Banner({
  notice,
  BannerRoot,
  icon,
  onDismiss,
}: {
  BannerRoot: BannerComponent;
  icon: React.ReactNode;
} & BannerProps) {
  return (
    <BannerRoot
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
    >
      {icon}
      <BannerBody>
        {notice.header && <h3>{notice.header}</h3>}
        {notice.content && <p>{notice.content}</p>}
      </BannerBody>
      <DismissButton
        aria-label="Dismiss notice"
        onClick={onDismiss}
        type="button"
      >
        <X />
      </DismissButton>
    </BannerRoot>
  );
}

function InfoBanner({ notice, onDismiss }: BannerProps) {
  return (
    <Banner
      BannerRoot={StyledInfoBanner}
      icon={<Info />}
      notice={notice}
      onDismiss={onDismiss}
    />
  );
}

function WarningBanner({ notice, onDismiss }: BannerProps) {
  return (
    <Banner
      BannerRoot={StyledWarningBanner}
      icon={<TriangleAlert />}
      notice={notice}
      onDismiss={onDismiss}
    />
  );
}

function ErrorBanner({ notice, onDismiss }: BannerProps) {
  return (
    <Banner
      BannerRoot={StyledErrorBanner}
      icon={<CircleX />}
      notice={notice}
      onDismiss={onDismiss}
    />
  );
}

export default function NoticeBanner({
  notice,
  onDismiss,
}: {
  notice: Notice;
  onDismiss?: () => void;
}) {
  switch (notice.type) {
    case "info":
      return <InfoBanner notice={notice} onDismiss={onDismiss} />;
    case "warning":
      return <WarningBanner notice={notice} onDismiss={onDismiss} />;
    case "error":
      return <ErrorBanner notice={notice} onDismiss={onDismiss} />;
    default:
      return null;
  }
}

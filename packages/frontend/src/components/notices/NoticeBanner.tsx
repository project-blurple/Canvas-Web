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
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  width: fit-content;
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
`;

const DismissButton = styled("button")`
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 25%;
  transition: opacity var(--transition-duration-fast) ease;

  :hover {
    opacity: 75%;
  }
`;

function Banner({
  notice,
  BannerRoot,
  icon,
}: {
  notice: Notice;
  BannerRoot: BannerComponent;
  icon: React.ReactNode;
}) {
  return (
    <BannerRoot>
      {icon}
      <BannerBody>
        {notice.header && <h3>{notice.header}</h3>}
        {notice.content && <p>{notice.content}</p>}
      </BannerBody>
      <DismissButton>
        <X />
      </DismissButton>
    </BannerRoot>
  );
}

function InfoBanner({ notice }: { notice: Notice }) {
  return (
    <Banner notice={notice} BannerRoot={StyledInfoBanner} icon={<Info />} />
  );
}

function WarningBanner({ notice }: { notice: Notice }) {
  return (
    <Banner
      notice={notice}
      BannerRoot={StyledWarningBanner}
      icon={<TriangleAlert />}
    />
  );
}

function ErrorBanner({ notice }: { notice: Notice }) {
  return (
    <Banner notice={notice} BannerRoot={StyledErrorBanner} icon={<CircleX />} />
  );
}

export default function NoticeBanner({ notice }: { notice: Notice }) {
  switch (notice.type) {
    case "info":
      return <InfoBanner notice={notice} />;
    case "warning":
      return <WarningBanner notice={notice} />;
    case "error":
      return <ErrorBanner notice={notice} />;
    default:
      return null;
  }
}

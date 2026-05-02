import type { Notice } from "@blurple-canvas-web/types";
import { styled } from "@mui/material/styles";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import Markdown from "markdown-to-jsx";
import { resolveSpecialText } from "@/util/text";

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

const ContentSpan = styled("span")`
  > div {
    display: flex;
    flex-direction: column;
  }
`;

const DismissWrapper = styled("div")`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
`;

const DismissButton = styled("button")`
  background: transparent;
  border: none;
  cursor: pointer;
  flex: 0 0 auto;
  opacity: 50%;
  transition: opacity var(--transition-duration-fast) ease;

  :hover {
    opacity: 80%;
  }
`;

interface BannerProps {
  notice: Notice;
  onDismiss?: () => void;
  onDismissPermanently?: () => void;
}

function Banner({
  notice,
  BannerRoot,
  icon,
  onDismiss,
  onDismissPermanently,
}: {
  BannerRoot: BannerComponent;
  icon: React.ReactNode;
} & BannerProps) {
  const headerText =
    notice.header ? `### ${resolveSpecialText(notice.header)}` : "";
  const contentText = notice.content ? resolveSpecialText(notice.content) : "";

  return (
    <BannerRoot
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
    >
      {icon}
      <BannerBody>
        {headerText && (
          <ContentSpan>
            <Markdown>{headerText}</Markdown>
          </ContentSpan>
        )}
        {contentText && (
          <ContentSpan>
            <Markdown>{contentText}</Markdown>
          </ContentSpan>
        )}
        <DismissWrapper>
          <DismissButton onClick={onDismiss}>Dismiss</DismissButton>
          {!notice.persistOnDismiss && (
            <DismissButton onClick={onDismissPermanently}>
              Don't show again
            </DismissButton>
          )}
        </DismissWrapper>
      </BannerBody>
    </BannerRoot>
  );
}

export default function NoticeBanner({
  notice,
  onDismiss,
  onDismissPermanently,
}: {
  notice: Notice;
  onDismiss?: () => void;
  onDismissPermanently?: () => void;
}) {
  switch (notice.type) {
    case "info":
      return (
        <Banner
          BannerRoot={StyledInfoBanner}
          icon={<Info />}
          notice={notice}
          onDismiss={onDismiss}
          onDismissPermanently={onDismissPermanently}
        />
      );
    case "warning":
      return (
        <Banner
          BannerRoot={StyledWarningBanner}
          icon={<TriangleAlert />}
          notice={notice}
          onDismiss={onDismiss}
          onDismissPermanently={onDismissPermanently}
        />
      );
    case "error":
      return (
        <Banner
          BannerRoot={StyledErrorBanner}
          icon={<CircleAlert />}
          notice={notice}
          onDismiss={onDismiss}
          onDismissPermanently={onDismissPermanently}
        />
      );
    default:
      return null;
  }
}

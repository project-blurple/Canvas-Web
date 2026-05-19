"use client";

import { styled } from "@mui/material";
import CanvasIcon from "@/components/CanvasIcon";
import { useNotices } from "@/hooks/queries/useNotice";
import AdminDashboard from "../AdminDashboard";

const AdminNoticeTabBlock = styled("section")`
  display: block;
  max-width: 80rem;
  width: 100%;
`;

const NoticeWrapper = styled("div")`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

function AdminNoticeTab() {
  const { data: notices, isLoading } = useNotices();

  return (
    <AdminNoticeTabBlock>
      <NoticeWrapper>
        {isLoading || notices === undefined ?
          <CanvasIcon
            loading
            size={64}
            style={{
              color: "var(--discord-blurple)",
              margin: "auto",
              opacity: 0.5,
            }}
          />
        : notices.map((notice) => (
            <div
              key={notice.id}
              style={{
                backgroundColor: "var(--discord-secondary-background)",
                borderRadius: "8px",
                padding: "1rem",
                width: "100%",
              }}
            >
              <h2>{notice.header}</h2>
              <p>{notice.content}</p>
            </div>
          ))
        }
      </NoticeWrapper>
    </AdminNoticeTabBlock>
  );
}

export default function NoticeAdminPage() {
  return (
    <AdminDashboard>
      <AdminNoticeTab />
    </AdminDashboard>
  );
}

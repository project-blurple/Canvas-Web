"use client";

import { styled } from "@mui/material";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/button/Button";
import CanvasIcon from "@/components/CanvasIcon";
import { useNotices } from "@/hooks/queries/useNotice";
import AdminDashboard from "../AdminDashboard";
import { adminNoticeCss, EditableNotice } from "./EditableNotice";

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

const CreateNoticeButton = styled(Button)`
  ${adminNoticeCss}
  align-items: center;
  color: var(--discord-white);
  height: 5rem;
  justify-content: center;
  transition: border-color var(--transition-duration-fast) ease;

  &:hover {
    border-color: oklch(from var(--discord-white) l c h / 20%);
  }

  &:active {
    border-color: oklch(from var(--discord-white) l c h / 40%);
    scale: inherit;
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

function AdminNoticeTab() {
  const { data: notices, isLoading } = useNotices(true);
  const [isCreateMode, setIsCreateMode] = useState(false);

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
        : <>
            {isCreateMode ?
              <EditableNotice
                mode="create"
                onComplete={() => setIsCreateMode(false)}
              />
            : <CreateNoticeButton
                onClick={() => setIsCreateMode(true)}
                disabled={isCreateMode}
              >
                <Plus />
              </CreateNoticeButton>
            }
            {notices.map((notice) => (
              <EditableNotice key={notice.id} notice={notice} />
            ))}
          </>
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

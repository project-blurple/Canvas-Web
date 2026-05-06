"use client";

import { IconButton, Menu } from "@mui/material";
import { Megaphone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import VisuallyHidden from "../VisuallyHidden";
import Noticeboard from "./Noticeboard";

const searchParamKey = "notices";
const searchParamValue = "1";

export default function Notices() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isOpen = searchParams.get("notices") === searchParamValue;

  const open: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.set(searchParamKey, searchParamValue);
    router.push(`?${next}`);
  }, [searchParams, router.push]);

  const close: React.MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(searchParamKey);
    router.push(`?${next}`);
  }, [searchParams, router.push]);

  const toggle = isOpen ? close : open;

  const buttonId = useId();
  const dialogId = useId();

  return (
    <>
      <IconButton
        aria-controls={dialogId}
        aria-expanded={isOpen}
        aria-haspopup="true"
        id={buttonId}
        onClick={toggle}
        ref={buttonRef}
      >
        <Megaphone />
        <VisuallyHidden>Notices</VisuallyHidden>
      </IconButton>
      <Menu
        id={dialogId}
        anchorEl={buttonRef.current}
        open={isOpen}
        onClose={close}
        slotProps={{
          list: { "aria-labelledby": buttonId },
        }}
      >
        <Noticeboard />
      </Menu>
    </>
  );
}

"use client";

import type { Frame } from "@blurple-canvas-web/types";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useState,
} from "react";

interface SelectedFrameContextType {
  frame: Frame | null;
  setFrame: Dispatch<SetStateAction<Frame | null>>;
}

const SelectedFrameContext = createContext<SelectedFrameContextType>({
  frame: null,
  setFrame: () => {},
});

export const SelectedFrameProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selectedFrame, setSelectedFrame] =
    useState<SelectedFrameContextType["frame"]>(null);

  return (
    <SelectedFrameContext.Provider
      value={{ frame: selectedFrame, setFrame: setSelectedFrame }}
    >
      {children}
    </SelectedFrameContext.Provider>
  );
};

export const useSelectedFrameContext = () => {
  return useContext(SelectedFrameContext);
};

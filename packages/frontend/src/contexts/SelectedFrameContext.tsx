"use client";

import { Frame } from "@blurple-canvas-web/types";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from "react";

type SelectedFrameContextType = [
  Frame | null,
  Dispatch<SetStateAction<Frame | null>>,
];

const SelectedFrameContext = createContext<SelectedFrameContextType>([
  null,
  () => {},
]);

export const SelectedFrameProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selectedFrame, setSelectedFrame] =
    useState<SelectedFrameContextType[0]>(null);

  return (
    <SelectedFrameContext.Provider value={[selectedFrame, setSelectedFrame]}>
      {children}
    </SelectedFrameContext.Provider>
  );
};

export const useSelectedFrameContext = () => {
  return useContext(SelectedFrameContext);
};

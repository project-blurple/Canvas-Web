"use client";

import type { PaletteColor } from "@blurple-canvas-web/types";
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useState,
} from "react";

interface SelectedColorContextType {
  color: PaletteColor | null;
  setColor: Dispatch<SetStateAction<PaletteColor | null>>;
}

const SelectedColorContext = createContext<SelectedColorContextType>({
  color: null,
  setColor: () => {},
});

export const SelectedColorProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selectedColor, setSelectedColor] =
    useState<SelectedColorContextType["color"]>(null);

  return (
    <SelectedColorContext.Provider
      value={{
        color: selectedColor,
        setColor: setSelectedColor,
      }}
    >
      {children}
    </SelectedColorContext.Provider>
  );
};

export const useSelectedColorContext = () => {
  return useContext(SelectedColorContext);
};

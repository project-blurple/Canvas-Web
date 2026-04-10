"use client";

import { DiscordUserProfile } from "@blurple-canvas-web/types";
import axios from "axios";
import Cookies from "js-cookie";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import config from "@/config";

interface AuthContextType {
  user: DiscordUserProfile | null;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signOut: () => {},
});

export const useAuthContext = () => useContext(AuthContext);

interface AuthProviderProps {
  children?: ReactNode;
  profile: DiscordUserProfile | null;
}

export function AuthProvider({ children, profile }: AuthProviderProps) {
  const [user, setUser] = useState(profile);

  const signOut = useCallback<AuthContextType["signOut"]>(() => {
    // Delete the session cookie
    axios.post(`${config.apiUrl}/api/v1/discord/logout`).catch(console.error);

    Cookies.remove("profile");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

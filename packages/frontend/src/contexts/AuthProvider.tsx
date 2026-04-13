"use client";

import { DiscordUserProfile } from "@blurple-canvas-web/types";
import axios from "axios";
import Cookies from "js-cookie";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import config from "@/config";
import { useUserData } from "@/hooks";

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
  const { data: userData } = useUserData(user);

  useEffect(() => {
    if (!user) {
      return;
    }
  }, [user]);

  useEffect(() => {
    if (!user || !userData?.guilds) {
      return;
    }

    setUser((currentUser) => {
      if (!currentUser || currentUser.guilds) {
        return currentUser;
      }

      return {
        ...currentUser,
        guilds: userData.guilds,
      };
    });
  }, [user, userData]);

  const signOut = useCallback<AuthContextType["signOut"]>(() => {
    // Delete the session cookie
    axios
      .post(`${config.apiUrl}/api/v1/discord/logout`, undefined, {
        withCredentials: true,
      })
      .catch(console.error);

    Cookies.remove("profile");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

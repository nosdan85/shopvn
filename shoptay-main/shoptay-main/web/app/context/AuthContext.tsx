"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DiscordUser {
  discordId: string;
  discordUsername: string;
  avatar?: string;
  isOwner?: boolean;
}

interface AuthContextType {
  user: DiscordUser | null;
  token: string | null;
  isLoading: boolean;
  login: (user: DiscordUser, token: string) => void;
  logout: () => void;
  getOAuthUrl: (returnTo?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("discordUser");
      const savedToken = localStorage.getItem("discordToken");
      if (savedUser && savedToken) {
        queueMicrotask(() => {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        });
      }
    } catch (e) {
      console.error("Failed to load auth state:", e);
    } finally {
      queueMicrotask(() => setIsLoading(false));
    }
  }, []);

  const login = (newUser: DiscordUser, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("discordUser", JSON.stringify(newUser));
    localStorage.setItem("discordToken", newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("discordUser");
    localStorage.removeItem("discordToken");
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("pendingCheckout");
      window.localStorage.removeItem("pendingRoblox");
    }
  };

  const getOAuthUrl = (returnTo?: string): string => {
    if (typeof window === "undefined") return "";
    const clientId = String(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "").trim();
    const redirectUri =
      process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ||
      `${window.location.origin}/auth/callback`;
    if (!clientId || clientId.includes("your-discord-client-id")) {
      return "#discord-env-missing";
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds.join",
    });
    if (returnTo) params.set("state", encodeURIComponent(returnTo));
    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, getOAuthUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}


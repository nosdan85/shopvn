"use client";

import { ReactNode } from "react";
import { AuthProvider } from "./context/AuthContext";
import { AuthVietProvider } from "./context/AuthVietContext";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthVietProvider>
        {children}
      </AuthVietProvider>
    </AuthProvider>
  );
}

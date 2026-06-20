"use client";

import { ReactNode } from "react";
import { AuthVietProvider } from "./context/AuthVietContext";

export function ClientProviders({ children }: { children: ReactNode }) {
 return (
 <AuthVietProvider>
 {children}
 </AuthVietProvider>
 );
}

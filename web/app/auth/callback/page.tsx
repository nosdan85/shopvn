// This file is deprecated - AuthContext has been removed.
// All Discord OAuth now goes through /auth/discord/callback
// For backward compatibility, redirect to shop
import { redirect } from "next/navigation";

export default function AuthCallbackPage() {
  redirect("/shop");
}
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const [status, setStatus] = useState("Processing Discord login...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const oauthError = searchParams.get("error");

      if (oauthError) {
        setStatus("Discord authorization was not completed");
        setError(`OAuth error: ${oauthError}`);
        return;
      }

      if (!code) {
        setStatus("Error: no authorization code found.");
        setError("No code parameter in callback URL.");
        return;
      }

      try {
        setStatus("Verifying with server...");
        const response = await fetch("/api/discord-exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            redirect_uri: `${window.location.origin}/auth/callback`,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Discord authentication failed.");
        }

        const user = data.user || {
          discordId: data.discordId,
          discordUsername: data.username,
          avatar: data.avatar,
          isOwner: data.isOwner || false,
        };
        const token = data.token || data.accessToken || "mock_token";

        login(user, token);
        setStatus("Success! Redirecting...");
        const returnTo = state ? decodeURIComponent(state) : "/";
        setTimeout(() => router.push(returnTo.startsWith("/") ? returnTo : "/"), 500);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setStatus("Discord login failed");
        setError(errorMessage);
      }
    };

    handleAuth();
  }, [searchParams, login, router]);

  return (
    <div className="max-w-lg w-full bg-[#111111] border border-[#1E1E1E] rounded-2xl p-8 text-center shadow-xl animate-fade-in-up">
      {!error ? (
        <>
          {status.includes("Success") ? (
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4 animate-pop" />
          ) : (
            <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
          )}
          <h1 className="text-2xl font-bold mb-3">{status}</h1>
          <p className="text-[#B5B5B5]">Please wait while we link your Discord account.</p>
        </>
      ) : (
        <>
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3">{status}</h1>
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-[#B5B5B5] whitespace-pre-wrap">{error}</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-[#161616] hover:bg-[#1E1E1E] rounded-lg font-medium transition-all duration-200 hover:scale-105"
          >
            Back to Home
          </button>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <Suspense fallback={
        <div className="max-w-lg w-full bg-[#111111] border border-[#1E1E1E] rounded-2xl p-8 text-center shadow-xl animate-fade-in-up">
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold mb-3">Loading...</h1>
        </div>
      }>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}

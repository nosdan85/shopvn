"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthViet } from "@/app/context/AuthVietContext";
import BackButton from "../../components/BackButton";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { getDiscordLinkRedirectUri } from "@/lib/discordOAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function getStoredWebToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("webToken");
}

function LinkDiscordCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { layThongTin } = useAuthViet();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState<string>("Đang liên kết Discord...");
  const [error, setError] = useState<string | null>(null);
  const daXuLyRef = useRef(false);

  useEffect(() => {
    if (daXuLyRef.current) {
      return;
    }

    daXuLyRef.current = true;

    const handleLinkDiscord = async () => {
      const code = searchParams.get("code");
      const oauthError = searchParams.get("error");

      if (oauthError) {
        setStatus("error");
        setMessage("Lỗi xác thực Discord");
        setError(`OAuth error: ${oauthError}`);
        return;
      }

      if (!code) {
        setStatus("error");
        setMessage("Lỗi");
        setError("Không tìm thấy mã xác thực từ Discord.");
        return;
      }

      try {
        const token = getStoredWebToken();

        if (!token) {
          throw new Error("Phiên đăng nhập đã hết hạn. Hãy vào lại tài khoản rồi liên kết Discord thêm lần nữa.");
        }

        const response = await fetch(`${API_URL}/api/tai-khoan/lien-ket-discord`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code,
            redirect_uri: getDiscordLinkRedirectUri({
              envRedirectUri: process.env.NEXT_PUBLIC_DISCORD_LINK_REDIRECT_URI,
              origin: window.location.origin,
            }),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.thongBao ||
            data?.message ||
            "Lỗi liên kết Discord."
          );
        }

        await layThongTin();
        setStatus("success");
        setMessage("Liên kết Discord thành công!");
        setError(null);
        setTimeout(() => router.push("/don-hang"), 2000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Lỗi không xác định";
        setStatus("error");
        setMessage("Lỗi liên kết Discord");
        setError(errorMessage);
      }
    };

    handleLinkDiscord();
  }, [searchParams, layThongTin, router]);

  return (
    <div className="max-w-lg w-full rounded-2xl border border-[#1E1E1E] bg-[#111111] p-8 text-center shadow-xl animate-fade-in-up">
      {status === "processing" && (
        <>
          <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-blue-400" />
          <h1 className="mb-3 text-2xl font-bold text-white">{message}</h1>
          <p className="text-[#B5B5B5]">Vui lòng đợi trong khi chúng tôi liên kết tài khoản Discord của bạn.</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold text-white">{message}</h1>
          <p className="text-[#B5B5B5]">Bạn sẽ được chuyển hướng trở lại Đơn Hàng trong 2 giây.</p>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-3 text-2xl font-bold text-white">{message}</h1>
          <div className="mb-6 rounded-lg border border-[#1E1E1E] bg-[#050505] p-4 text-left">
            <p className="text-sm text-[#B5B5B5]">{error}</p>
          </div>
          <button
            onClick={() => router.push("/don-hang")}
            className="rounded-lg bg-[#161616] px-6 py-3 font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-[#1E1E1E]"
          >
            Quay về Đơn Hàng
          </button>
        </>
      )}
    </div>
  );
}

export default function LinkDiscordCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 text-white">
      <div className="absolute left-4 top-4">
        <BackButton href="/shop" label="Cửa Hàng" variant="back" />
      </div>
      <Suspense
        fallback={
          <div className="max-w-lg w-full rounded-2xl border border-[#1E1E1E] bg-[#111111] p-8 text-center shadow-xl animate-fade-in-up">
            <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-blue-400" />
            <h1 className="mb-3 text-2xl font-bold text-white">Đang tải...</h1>
          </div>
        }
      >
        <LinkDiscordCallbackContent />
      </Suspense>
    </div>
  );
}

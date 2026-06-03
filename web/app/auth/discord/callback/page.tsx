"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthViet } from "../../../context/AuthVietContext";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function DiscordCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setNguoiDung } = useAuthViet();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState<string>("Đang xử lý...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const oauthError = searchParams.get("error");
      const flow = typeof window !== 'undefined' ? localStorage.getItem('discord_flow') : 'link';

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
        setMessage(flow === 'signup' ? 'Đang tạo tài khoản...' : 'Đang liên kết Discord...');

        // Exchange code for Discord user info
        const response = await fetch(`${API_URL}/api/shop/auth/discord`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            code,
            redirect_uri: `${window.location.origin}/auth/discord/callback`,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || data?.message || "Lỗi xác thực Discord");
        }

        // Discord OAuth successful - user is now logged in
        if (data.user) {
          setNguoiDung(data.user);
          localStorage.removeItem('discord_flow');

          setStatus("success");
          setMessage(flow === 'signup' ? 'Đăng ký thành công!' : 'Liên kết Discord thành công!');
          setTimeout(() => router.push("/shop"), 2000);
        } else {
          throw new Error("Không nhận được thông tin user");
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Lỗi không xác định";
        setStatus("error");
        setMessage("Lỗi xác thực");
        setError(errorMessage);
        localStorage.removeItem('discord_flow');
      }
    };

    handleCallback();
  }, [searchParams, router, setNguoiDung]);

  return (
    <div className="max-w-lg w-full bg-[#111111] border border-[#1E1E1E] rounded-2xl p-8 text-center shadow-xl animate-fade-in-up">
      {status === "processing" && (
        <>
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold mb-3 text-white">{message}</h1>
          <p className="text-[#B5B5B5]">Vui lòng đợi trong khi chúng tôi xử lý xác thực Discord.</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-white">{message}</h1>
          <p className="text-[#B5B5B5]">Bạn sẽ được chuyển hướng trong 2 giây.</p>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-3 text-white">{message}</h1>
          <div className="bg-[#050505] border border-[#1E1E1E] rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-[#B5B5B5]">{error}</p>
          </div>
          <button
            onClick={() => router.push("/dang-ky")}
            className="px-6 py-3 bg-[#161616] hover:bg-[#1E1E1E] text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
          >
            Quay về Đăng Ký
          </button>
        </>
      )}
    </div>
  );
}

export default function DiscordCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white px-4">
      <Suspense
        fallback={
          <div className="max-w-lg w-full bg-[#111111] border border-[#1E1E1E] rounded-2xl p-8 text-center shadow-xl">
            <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-3 text-white">Đang tải...</h1>
          </div>
        }
      >
        <DiscordCallbackContent />
      </Suspense>
    </div>
  );
}




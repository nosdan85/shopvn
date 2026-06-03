"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthViet } from "../../../context/AuthVietContext";
import BackButton from "../../components/BackButton";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

function LinkDiscordCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { daDangNhap, kiemTraDiscord } = useAuthViet();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState<string>("Đang liên kết Discord...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleLinkDiscord = async () => {
      if (!daDangNhap) {
        setStatus("error");
        setMessage("Lỗi xác thực");
        setError("Bạn cần đăng nhập để liên kết Discord.");
        setTimeout(() => router.push("/dang-nhap"), 2000);
        return;
      }

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
        const response = await fetch("/api/tai-khoan/lien-ket-discord", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            redirect_uri: `${window.location.origin}/lien-ket-discord/callback`,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Lỗi liên kết Discord.");
        }

        await kiemTraDiscord();
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
  }, [searchParams, daDangNhap, kiemTraDiscord, router]);

  return (
    <div className="max-w-lg w-full bg-[#111111] border border-[#1E1E1E] rounded-2xl p-8 text-center shadow-xl animate-fade-in-up">
      {status === "processing" && (
        <>
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold mb-3 text-white">{message}</h1>
          <p className="text-[#B5B5B5]">Vui lòng đợi trong khi chúng tôi liên kết tài khoản Discord của bạn.</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-white">{message}</h1>
          <p className="text-[#B5B5B5]">Bạn sẽ được chuyển hướng trở lại Đơn Hàng trong 2 giây.</p>
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
            onClick={() => router.push("/don-hang")}
            className="px-6 py-3 bg-[#161616] hover:bg-[#1E1E1E] text-white rounded-lg font-medium transition-all duration-200 hover:scale-105"
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
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white px-4">
      <div className="absolute top-4 left-4">
        <BackButton href="/shop" label="Cửa Hàng" variant="back" />
      </div>
      <Suspense
        fallback={
          <div className="max-w-lg w-full bg-[#111111] border border-[#1E1E1E] rounded-2xl p-8 text-center shadow-xl animate-fade-in-up">
            <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-3 text-white">Đang tải...</h1>
          </div>
        }
      >
        <LinkDiscordCallbackContent />
      </Suspense>
    </div>
  );
}




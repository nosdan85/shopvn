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

 // Get return URL from localStorage (set by checkout/profile)
 const returnTo = typeof window !== 'undefined'
 ? localStorage.getItem('discord_return_to')
 : null;

 // Clean up
 if (typeof window !== 'undefined') {
 localStorage.removeItem('discord_return_to');
 }

 // Redirect to saved URL or default to /shop
 const redirectPath = returnTo || '/shop';
 setTimeout(() => router.push(redirectPath), 2000);
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
 <div className="max-w-lg w-full rounded-2xl border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] p-8 text-center shadow-xl animate-fade-in-up">
 {status === "processing" && (
 <>
 <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-blue-400" />
 <h1 className="mb-3 text-2xl font-bold text-[#071326]/90/90">{message}</h1>
 <p className="text-slate-600">Vui lòng đợi trong khi chúng tôi liên kết tài khoản Discord của bạn.</p>
 </>
 )}
 {status === "success" && (
 <>
 <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
 <h1 className="mb-2 text-2xl font-bold text-[#071326]/90/90">{message}</h1>
 <p className="text-slate-600">Bạn sẽ được chuyển hướng trở lại Cửa Hàng trong 2 giây.</p>
 </>
 )}
 {status === "error" && (
 <>
 <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
 <h1 className="mb-3 text-2xl font-bold text-[#071326]/90/90">{message}</h1>
 <div className="mb-6 rounded-lg border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] p-4 text-left">
 <p className="text-sm text-slate-600">{error}</p>
 </div>
 <button
 onClick={() => router.push("/shop")}
 className="rounded-lg bg-white/40 backdrop-blur-sm border border-white/50 px-6 py-3 font-medium text-[#071326]/90/90 transition-all duration-200 hover:scale-105 hover:bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]"
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
 <div className="min-h-screen flex items-center justify-center bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] px-4 text-[#071326]/90/90">
 <div className="absolute left-4 top-4">
 <BackButton href="/shop" label="Cửa Hàng" variant="back" />
 </div>
 <Suspense
 fallback={
 <div className="max-w-lg w-full rounded-2xl border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] p-8 text-center shadow-xl animate-fade-in-up">
 <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-blue-400" />
 <h1 className="mb-3 text-2xl font-bold text-[#071326]/90/90">Đang tải...</h1>
 </div>
 }
 >
 <LinkDiscordCallbackContent />
 </Suspense>
 </div>
 );
}

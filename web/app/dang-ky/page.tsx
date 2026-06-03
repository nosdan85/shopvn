"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, Mail, Eye, EyeOff, Loader2, Home } from "lucide-react";
import { useAuthViet } from "../context/AuthVietContext";

export default function DangKyPage() {
  const router = useRouter();
  const { dangKy } = useAuthViet();

  const [tenDangNhap, setTenDangNhap] = useState("");
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState("");
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [hienXacNhanMatKhau, setHienXacNhanMatKhau] = useState(false);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState("");
  const [thanhCong, setThanhCong] = useState(false);

  const kiemTra = (): string | null => {
    if (!tenDangNhap.trim()) {
      return "Vui lòng nhập tên đăng nhập";
    }
    if (tenDangNhap.trim().length < 3 || tenDangNhap.trim().length > 30) {
      return "Tên đăng nhập phải từ 3 đến 30 ký tự";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(tenDangNhap.trim())) {
      return "Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới";
    }
    if (!email.trim()) {
      return "Vui lòng nhập email";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Email không hợp lệ";
    }
    if (!matKhau) {
      return "Vui lòng nhập mật khẩu";
    }
    if (matKhau.length < 6) {
      return "Mật khẩu phải có ít nhất 6 ký tự";
    }
    if (!xacNhanMatKhau) {
      return "Vui lòng xác nhận mật khẩu";
    }
    if (matKhau !== xacNhanMatKhau) {
      return "Mật khẩu xác nhận không khớp";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoi("");
    setThanhCong(false);

    const loiKiemTra = kiemTra();
    if (loiKiemTra) {
      setLoi(loiKiemTra);
      return;
    }

    setDangTai(true);
    try {
      await dangKy({
        tenDangNhap: tenDangNhap.trim(),
        email: email.trim(),
        matKhau,
        xacNhanMatKhau,
      });
      setThanhCong(true);
      router.push("/shop");
      router.refresh();
    } catch (err) {
      setLoi(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setDangTai(false);
    }
  };

  const handleDiscordSignup = () => {
    const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/discord/callback`;

    if (!DISCORD_CLIENT_ID) {
      setLoi("Discord OAuth chưa được cấu hình");
      return;
    }

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email`;

    // Save state to indicate this is signup flow
    if (typeof window !== 'undefined') {
      localStorage.setItem('discord_flow', 'signup');
    }

    window.location.href = discordAuthUrl;
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#2F9BE6] to-[#1a6cb8]">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" />
            <path d="M2 17L12 22L22 17" />
            <path d="M2 12L12 17L22 12" />
          </svg>
        </div>
        <span className="text-2xl font-bold text-white">NOSMarket</span>
      </div>

      {/* Back to Home Button */}
      <Link
        href="/shop"
        className="mb-4 flex items-center gap-2 text-sm text-[#B5B5B5] hover:text-white transition-colors"
      >
        <Home className="h-4 w-4" />
        Quay về Cửa Hàng
      </Link>

      {/* Form Card */}
      <div className="w-full max-w-[380px] rounded-[22px] border border-[#1E1E1E] bg-[#111111] p-6 sm:p-8">
        <h1 className="mb-6 text-center text-xl font-semibold text-white">Đăng Ký</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="space-y-2">
            <label htmlFor="tenDangNhap" className="block text-sm font-medium text-[#B5B5B5]">
              Tên Đăng Nhập
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <User className="h-4 w-4 text-[#B5B5B5]" />
              </div>
              <input
                id="tenDangNhap"
                type="text"
                value={tenDangNhap}
                onChange={(e) => setTenDangNhap(e.target.value)}
                placeholder="3-30 ký tự, chữ cái, số, dấu gạch dưới"
                className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#0A0A0A] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-[#6B6B6B] focus:border-[#2F9BE6]"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-[#B5B5B5]">
              Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Mail className="h-4 w-4 text-[#B5B5B5]" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#0A0A0A] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-[#6B6B6B] focus:border-[#2F9BE6]"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label htmlFor="matKhau" className="block text-sm font-medium text-[#B5B5B5]">
              Mật Khẩu
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="h-4 w-4 text-[#B5B5B5]" />
              </div>
              <input
                id="matKhau"
                type={hienMatKhau ? "text" : "password"}
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#0A0A0A] py-3 pl-10 pr-12 text-sm text-white outline-none placeholder:text-[#6B6B6B] focus:border-[#2F9BE6]"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setHienMatKhau(!hienMatKhau)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B5B5B5] hover:text-white"
              >
                {hienMatKhau ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-2">
            <label htmlFor="xacNhanMatKhau" className="block text-sm font-medium text-[#B5B5B5]">
              Xác Nhận Mật Khẩu
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="h-4 w-4 text-[#B5B5B5]" />
              </div>
              <input
                id="xacNhanMatKhau"
                type={hienXacNhanMatKhau ? "text" : "password"}
                value={xacNhanMatKhau}
                onChange={(e) => setXacNhanMatKhau(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#0A0A0A] py-3 pl-10 pr-12 text-sm text-white outline-none placeholder:text-[#6B6B6B] focus:border-[#2F9BE6]"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setHienXacNhanMatKhau(!hienXacNhanMatKhau)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B5B5B5] hover:text-white"
              >
                {hienXacNhanMatKhau ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {loi && (
            <div className="rounded-[10px] bg-[#FF4D4F]/10 p-3 text-sm text-[#FF4D4F]">
              {loi}
            </div>
          )}

          {/* Success Message */}
          {thanhCong && (
            <div className="rounded-[10px] bg-[#3DDC84]/10 p-3 text-sm text-[#3DDC84]">
              Đăng ký thành công! Đang chuyển hướng...
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={dangTai}
            className="w-full rounded-[14px] bg-gradient-to-r from-[#2F9BE6] to-[#1a6cb8] py-3.5 font-medium text-white transition-all hover:from-[#49B6FF] hover:to-[#2F9BE6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {dangTai ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xử lý...
              </span>
            ) : (
              "Đăng Ký"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#1E1E1E]"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#111111] px-2 text-[#6B6B6B]">HOẶC</span>
          </div>
        </div>

        {/* Discord Signup Button */}
        <button
          type="button"
          onClick={handleDiscordSignup}
          disabled={dangTai}
          className="w-full rounded-[14px] bg-[#5865F2] py-3.5 font-medium text-white transition-all hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Đăng ký bằng Discord
        </button>

        {/* Login Link */}
        <div className="mt-6 text-center text-sm text-[#B5B5B5]">
          Đã có tài khoản?{" "}
          <Link href="/dang-nhap" className="font-medium text-[#2F9BE6] hover:text-[#49B6FF]">
            Đăng nhập
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-[#6B6B6B]">
        <p>2026 NOSMarket. All rights reserved.</p>
      </div>
    </div>
  );
}
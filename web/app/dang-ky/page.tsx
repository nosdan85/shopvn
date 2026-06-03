"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";
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
      return "Vui long nhap ten dang nhap";
    }
    if (tenDangNhap.trim().length < 3 || tenDangNhap.trim().length > 30) {
      return "Ten dang nhap phai tu 3 den 30 ky tu";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(tenDangNhap.trim())) {
      return "Ten dang nhap chi duoc chua chu cai, so va dau gach duoi";
    }
    if (!email.trim()) {
      return "Vui long nhap email";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Email khong hop le";
    }
    if (!matKhau) {
      return "Vui long nhap mat khau";
    }
    if (matKhau.length < 6) {
      return "Mat khau phai co it nhat 6 ky tu";
    }
    if (!xacNhanMatKhau) {
      return "Vui long xac nhan mat khau";
    }
    if (matKhau !== xacNhanMatKhau) {
      return "Mat khau xac nhan khong khop";
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
      setLoi(err instanceof Error ? err.message : "Dang ky that bai");
    } finally {
      setDangTai(false);
    }
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

      {/* Form Card */}
      <div className="w-full max-w-[380px] rounded-[22px] border border-[#1E1E1E] bg-[#111111] p-6 sm:p-8">
        <h1 className="mb-6 text-center text-xl font-semibold text-white">Dang Ky</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div className="space-y-2">
            <label htmlFor="tenDangNhap" className="block text-sm font-medium text-[#B5B5B5]">
              Ten Dang Nhap
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
                placeholder="3-30 ky tu, chu cai, so, dau gach duoi"
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
              Mat Khau
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
                placeholder="Toi thieu 6 ky tu"
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
              Xac Nhan Mat Khau
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
                placeholder="Nhap lai mat khau"
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
              Dang ky thanh cong! Dang chuyen huong...
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
                Dang xu ly...
              </span>
            ) : (
              "Dang Ky"
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center text-sm text-[#B5B5B5]">
          Da co tai khoan?{" "}
          <Link href="/dang-nhap" className="font-medium text-[#2F9BE6] hover:text-[#49B6FF]">
            Dang nhap
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
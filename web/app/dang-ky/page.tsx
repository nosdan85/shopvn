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

  return (
    <div className="min-h-screen bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#2F9BE6] to-[#1a6cb8]">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" />
            <path d="M2 17L12 22L22 17" />
            <path d="M2 12L12 17L22 12" />
          </svg>
        </div>
        <span className="text-2xl font-bold text-[#071326]/90/90">NOSMarket</span>
      </div>

      <Link
        href="/shop"
        className="mb-4 flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-[#071326]/90/90"
      >
        <Home className="h-4 w-4" />
        Quay về Cửa Hàng
      </Link>

      <div className="w-full max-w-[380px] rounded-[22px] border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] backdrop-blur-[40px] saturate-[180%] shadow-[0_8px_40px_rgba(30,144,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] p-6 sm:p-8 relative overflow-hidden">
        <h1 className="mb-6 text-center text-xl font-semibold text-[#071326]/90/90">Đăng Ký</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="tenDangNhap" className="block text-sm font-medium text-slate-600">
              Tên Đăng Nhập
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <User className="h-4 w-4 text-slate-600" />
              </div>
              <input
                id="tenDangNhap"
                type="text"
                value={tenDangNhap}
                onChange={(e) => setTenDangNhap(e.target.value)}
                placeholder="3-30 ký tự, chữ cái, số, dấu gạch dưới"
                className="w-full rounded-[12px] border border-white/40 bg-white/30 backdrop-blur-md border border-white/50 shadow-lg py-3 pl-10 pr-4 text-sm text-[#071326]/90/90 outline-none placeholder:text-slate-600 focus:border-white/60"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-slate-600">
              Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Mail className="h-4 w-4 text-slate-600" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full rounded-[12px] border border-white/40 bg-white/30 backdrop-blur-md border border-white/50 shadow-lg py-3 pl-10 pr-4 text-sm text-[#071326]/90/90 outline-none placeholder:text-slate-600 focus:border-white/60"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="matKhau" className="block text-sm font-medium text-slate-600">
              Mật Khẩu
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="h-4 w-4 text-slate-600" />
              </div>
              <input
                id="matKhau"
                type={hienMatKhau ? "text" : "password"}
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full rounded-[12px] border border-white/40 bg-white/30 backdrop-blur-md border border-white/50 shadow-lg py-3 pl-10 pr-12 text-sm text-[#071326]/90/90 outline-none placeholder:text-slate-600 focus:border-white/60"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setHienMatKhau(!hienMatKhau)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-[#071326]/90/90"
              >
                {hienMatKhau ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="xacNhanMatKhau" className="block text-sm font-medium text-slate-600">
              Xác Nhận Mật Khẩu
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="h-4 w-4 text-slate-600" />
              </div>
              <input
                id="xacNhanMatKhau"
                type={hienXacNhanMatKhau ? "text" : "password"}
                value={xacNhanMatKhau}
                onChange={(e) => setXacNhanMatKhau(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full rounded-[12px] border border-white/40 bg-white/30 backdrop-blur-md border border-white/50 shadow-lg py-3 pl-10 pr-12 text-sm text-[#071326]/90/90 outline-none placeholder:text-slate-600 focus:border-white/60"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setHienXacNhanMatKhau(!hienXacNhanMatKhau)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-[#071326]/90/90"
              >
                {hienXacNhanMatKhau ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {loi && (
            <div className="rounded-[10px] bg-[#FF4D4F]/10 p-3 text-sm text-red-400">
              {loi}
            </div>
          )}

          {thanhCong && (
            <div className="rounded-[10px] bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]/10 p-3 text-sm text-emerald-700">
              Đăng ký thành công! Đang chuyển hướng...
            </div>
          )}

          <button
            type="submit"
            disabled={dangTai}
            className="w-full rounded-[14px] bg-gradient-to-r from-[#2F9BE6] to-[#1a6cb8] py-3.5 font-medium text-[#071326]/90/90 transition-all hover:from-[#49B6FF] hover:to-[#2F9BE6] disabled:cursor-not-allowed disabled:opacity-50"
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

        <div className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link href="/dang-nhap" className="font-medium text-blue-300/80 hover:text-slate-600">
            Đăng nhập
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-600">
        <p>2026 NOSMarket. All rights reserved.</p>
      </div>
    </div>
  );
}

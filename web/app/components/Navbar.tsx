"use client";

import Link from "next/link";
import { useAuthViet } from "../context/AuthVietContext";
import { ShoppingCart, LogOut, User, Loader2, Menu, X, Wallet, ShoppingBag } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { isAdminRole } from "@/lib/authRole";

const SUPPORT_DISCORD_URL = "https://discord.com/channels/1398984938111369256/1493927408217100438";

interface NavbarProps {
  cartCount?: number;
  showCart?: boolean;
  onCartClick?: () => void;
}

const getUserInitial = (username: string) => {
  return username.charAt(0).toUpperCase();
};

export default function Navbar({ cartCount = 0, showCart = false, onCartClick }: NavbarProps) {
  const { user, isLoading, soDuVnd, daDangNhap, dangXuat, daLienKetDiscord, discordTenHienThi, getDiscordOAuthUrl, huyLienKetDiscord } = useAuthViet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle scroll for sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await dangXuat();
      setDropdownOpen(false);
      setMobileMenuOpen(false);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDiscordLink = () => {
    const discordOAuthUrl = getDiscordOAuthUrl();

    if (!discordOAuthUrl || discordOAuthUrl.startsWith("#")) {
      return;
    }

    setDropdownOpen(false);
    setMobileMenuOpen(false);
    localStorage.setItem('discord_flow', 'link'); // Set flow to 'link'
    window.location.href = discordOAuthUrl;
  };

  const handleDiscordUnlink = async () => {
    if (!window.confirm('Bạn có chắc muốn hủy liên kết Discord?')) {
      return;
    }

    try {
      await huyLienKetDiscord();
      setDropdownOpen(false);
      setMobileMenuOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi hủy liên kết');
    }
  };

  const clearCheckoutResume = () => {
    try {
      window.sessionStorage.removeItem("pendingCheckout");
      window.localStorage.removeItem("pendingRoblox");
    } catch {
      // ignore
    }
  };

  const getAvatarInitial = (username: string) => {
    const initial = getUserInitial(username);
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-green-500",
      "bg-orange-500",
      "bg-red-500",
      "bg-cyan-500",
      "bg-indigo-500",
    ];
    const colorIndex = username.charCodeAt(0) % colors.length;
    return { initial, color: colors[colorIndex] };
  };

  return (
    <nav className={`
      sticky top-0 z-50 h-[68px] transition-all duration-500
      bg-white/60 backdrop-blur-2xl border-b border-white/50
      shadow-[0_4px_30px_rgba(30,144,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]
      ${isScrolled
        ? "bg-white/50 backdrop-blur-3xl shadow-[0_8px_40px_rgba(30,144,255,0.15),inset_0_1px_0_rgba(255,255,255,0.15)]"
        : ""}
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/shop" onClick={clearCheckoutResume} className="flex items-center gap-3 group">
          <img
            src="/pictures/site-logo.png"
            alt="NOS"
            className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-base font-bold text-slate-800 tracking-tight sm:text-xl drop-shadow-[0_2px_10px_rgba(100,180,255,0.5)]">
            NOS<span className="text-slate-700">Market</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/shop"
            onClick={clearCheckoutResume}
            className="relative px-3 py-2 text-slate-700 hover:text-[#071326]/90 transition-colors duration-300 font-medium text-sm group"
          >
            Cua Hang
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-400/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full shadow-[0_0_10px_rgba(100,180,255,0.5)]" />
          </Link>
          <Link
            href="/proofs"
            className="relative px-3 py-2 text-slate-700 hover:text-[#071326]/90 transition-colors duration-300 font-medium text-sm group"
          >
            Danh Gia
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-400/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full shadow-[0_0_10px_rgba(100,180,255,0.5)]" />
          </Link>
          <a
            href={SUPPORT_DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="relative px-3 py-2 text-slate-700 hover:text-[#071326]/90 transition-colors duration-300 font-medium text-sm group"
          >
            Ho Tro
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-400/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full shadow-[0_0_10px_rgba(100,180,255,0.5)]" />
          </a>
          {isAdminRole(user?.vaiTro) && (
            <Link
              href="/admin"
              className="relative px-3 py-2 text-cyan-300/80 hover:text-[#071326]/90 transition-colors duration-300 font-medium text-sm group"
            >
              Quan Tri
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-cyan-400/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full shadow-[0_0_10px_rgba(100,200,255,0.5)]" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Cart Icon */}
          {showCart && (
            <button
              type="button"
              onClick={onCartClick}
              className="relative rounded-xl p-2 text-slate-500 transition-colors duration-300 hover:text-[#071326]/90 active:scale-95"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-r from-blue-400 to-cyan-400 text-[#071326]/90 text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(100,180,255,0.6)] animate-bounce-in">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* User Section Desktop */}
          <div className="hidden md:block">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Dang tai...</span>
              </div>
            ) : daDangNhap && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/50 bg-white/60 hover:bg-white/70 hover:border-white/50 transition-all duration-200 group"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[#071326]/90 font-semibold text-xs ${getAvatarInitial(user.tenDangNhap).color}`}>
                    {getAvatarInitial(user.tenDangNhap).initial}
                  </div>
                  <span className="text-sm font-medium text-[#071326]/90 max-w-[100px] truncate">{user.tenDangNhap}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white/60 border border-white/50 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in z-50">
                    <div className="px-4 py-3 border-b border-white/50 bg-white/70">
                      <p className="text-sm font-semibold text-[#071326]/90 truncate">{user.tenDangNhap}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</p>
                    </div>

                    <div className="px-4 py-3 border-b border-white/50 bg-white/400 backdrop-blur-xl">
                      <p className="text-xs text-slate-500 mb-1">So du</p>
                      <p className="text-sm font-semibold text-slate-600">
                        {soDuVnd.toLocaleString("vi-VN")} VND
                      </p>
                    </div>

                    <Link
                      href="/nap-tien"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-[#071326]/90 hover:bg-white/70 transition-colors duration-150 border-b border-white/50"
                    >
                      <Wallet className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Nap Tien</span>
                    </Link>

                    <Link
                      href="/don-hang"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-[#071326]/90 hover:bg-white/70 transition-colors duration-150 border-b border-white/50"
                    >
                      <ShoppingBag className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">Don Hang</span>
                    </Link>

                    <button
                      type="button"
                      onClick={daLienKetDiscord ? handleDiscordUnlink : handleDiscordLink}
                      className="w-full flex items-center gap-2 px-4 py-3 text-[#071326]/90 hover:bg-white/70 transition-colors duration-150 border-b border-white/50"
                    >
                      <User className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium">
                        {daLienKetDiscord
                          ? `Discord: ${discordTenHienThi || "Da lien ket"} ✕`
                          : "Lien Ket Discord"}
                      </span>
                    </button>

                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-[#FF4D4F]/10 transition-colors duration-150 disabled:opacity-50"
                    >
                      {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                      <span className="text-sm font-medium">Dang Xuat</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/dang-nhap"
                  className="px-4 py-2 rounded-full border border-blue-400/30 text-slate-700 font-medium text-sm transition-all duration-300 hover:bg-white/60 backdrop-blur-md active:scale-95"
                >
                  Dang Nhap
                </Link>
                <Link
                  href="/dang-ky"
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/50 hover:bg-white/15 backdrop-blur-xl border border-white/50 text-[#071326]/90 rounded-full font-medium text-sm transition-all duration-500 shadow-[0_4px_30px_rgba(30,144,255,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:scale-[1.03]"
                >
                  Dang Ky
                </Link>
              </div>
            )}
          </div>

          {/* Hamburger Icon Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-[#071326]/90 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Fullscreen Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full z-[9998] bg-white/50 backdrop-blur-3xl border-b border-white/50 animate-fade-in shadow-[0_8px_40px_rgba(30,144,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="max-h-[calc(100dvh-68px)] min-h-[calc(100dvh-68px)] overflow-y-auto px-4 py-6 flex flex-col gap-3">
            <Link
              href="/shop"
              onClick={() => {
                clearCheckoutResume();
                setMobileMenuOpen(false);
              }}
              className="flex items-center rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 px-5 py-4 text-lg font-semibold text-[#071326]/90 transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/50"
            >
              Cua Hang
            </Link>
            <Link
              href="/proofs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 px-5 py-4 text-lg font-semibold text-[#071326]/90 transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/50"
            >
              Danh Gia
            </Link>
            <a
              href={SUPPORT_DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 px-5 py-4 text-lg font-semibold text-[#071326]/90 transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/50"
            >
              Ho Tro
            </a>
            {isAdminRole(user?.vaiTro) && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center rounded-2xl bg-blue-500/10 backdrop-blur-xl border border-blue-400/20 px-5 py-4 text-lg font-semibold text-slate-700 transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(30,144,255,0.15)]"
              >
                Quan Tri
              </Link>
            )}

            {/* Mobile Auth Section */}
            <div className="border-t border-white/50 pt-4 mt-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-3 text-slate-700 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Dang tai...</span>
                </div>
              ) : daDangNhap && user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2 py-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[#071326]/90 font-semibold text-sm ${getAvatarInitial(user.tenDangNhap).color}`}>
                      {getAvatarInitial(user.tenDangNhap).initial}
                    </div>
                    <div>
                      <p className="font-semibold text-[#071326]/90 truncate max-w-[180px]">{user.tenDangNhap}</p>
                      <p className="text-xs text-slate-600 truncate max-w-[180px]">{user.email}</p>
                    </div>
                  </div>

                  <div className="px-3 py-2 bg-white/60 backdrop-blur-md rounded-xl border border-white/50 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                    <p className="text-xs text-slate-600 mb-1">So du</p>
                    <p className="text-sm font-semibold bg-gradient-to-r from-[#3DDC84] to-[#4F8CFF] bg-clip-text text-transparent">
                      {soDuVnd.toLocaleString("vi-VN")} VND
                    </p>
                  </div>

                  <Link
                    href="/nap-tien"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/60 backdrop-blur-md border border-white/50 text-slate-700 rounded-[28px] transition-all font-medium shadow-[0_0_15px_rgba(79,140,255,0.2)] active:scale-[0.98]"
                  >
                    <Wallet className="w-5 h-5" />
                    <span>Nap Tien</span>
                  </Link>

                  <Link
                    href="/don-hang"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/60 backdrop-blur-md border border-white/50 text-slate-700 rounded-[28px] transition-all font-medium shadow-[0_0_15px_rgba(79,140,255,0.2)] active:scale-[0.98]"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>Don Hang</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleDiscordLink}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#5865F2]/20 backdrop-blur-md border border-[#5865F2]/40 text-slate-600 rounded-[28px] transition-all font-medium shadow-[0_0_15px_rgba(88,101,242,0.2)] active:scale-[0.98]"
                  >
                    <User className="w-5 h-5" />
                    <span>{daLienKetDiscord ? `Discord: ${discordTenHienThi || "Da lien ket"}` : "Lien Ket Discord"}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF4D4F]/20 backdrop-blur-md border border-[#FF4D4F]/40 text-red-600 rounded-[28px] transition-all font-medium active:scale-[0.98] disabled:opacity-50"
                  >
                    {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                    <span>Dang Xuat</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/dang-nhap"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3 border-2 border-[#4F8CFF]/50 text-slate-700 rounded-[28px] transition-all font-medium backdrop-blur-md active:scale-[0.98]"
                  >
                    Dang Nhap
                  </Link>
                  <Link
                    href="/dang-ky"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-[#4F8CFF] via-[#8B7CFF] to-[#7EE7FF] text-[#071326]/90 rounded-[28px] transition-all font-medium shadow-[0_0_25px_rgba(79,140,255,0.4)] active:scale-[0.98]"
                  >
                    Dang Ky
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

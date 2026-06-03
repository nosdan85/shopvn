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
  const { user, isLoading, soDuVnd, daDangNhap, dangXuat, daLienKetDiscord, discordTenHienThi, getDiscordOAuthUrl } = useAuthViet();
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
    window.location.href = discordOAuthUrl;
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
      sticky top-0 z-50 h-[68px] transition-all duration-300
      ${isScrolled
        ? "bg-black/90 backdrop-blur-xl border-b border-white/[0.06]"
        : "bg-[#050505]/80 backdrop-blur-lg border-b border-[#1E1E1E]"}
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/shop" onClick={clearCheckoutResume} className="flex items-center gap-3 group">
          <img
            src="/pictures/site-logo.png"
            alt="NOS"
            className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-base font-bold text-white tracking-tight sm:text-xl">
            NOS<span className="text-[#2F9BE6]">Market</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/shop"
            onClick={clearCheckoutResume}
            className="relative px-3 py-2 text-[#B5B5B5] hover:text-white transition-colors duration-200 font-medium text-sm group"
          >
            Cua Hang
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2F9BE6] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
          </Link>
          <Link
            href="/proofs"
            className="relative px-3 py-2 text-[#B5B5B5] hover:text-white transition-colors duration-200 font-medium text-sm group"
          >
            Danh Gia
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2F9BE6] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
          </Link>
          <a
            href={SUPPORT_DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="relative px-3 py-2 text-[#B5B5B5] hover:text-white transition-colors duration-200 font-medium text-sm group"
          >
            Ho Tro
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2F9BE6] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
          </a>
          {isAdminRole(user?.vaiTro) && (
            <Link
              href="/admin"
              className="relative px-3 py-2 text-[#B5B5B5] hover:text-white transition-colors duration-200 font-medium text-sm group"
            >
              Quan Tri
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2F9BE6] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Cart Icon */}
          {showCart && (
            <button
              type="button"
              onClick={onCartClick}
              className="relative rounded-xl p-2 text-[#B5B5B5] transition-colors duration-200 hover:text-white active:scale-95"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#2F9BE6] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(47,155,230,0.4)] animate-bounce-in">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* User Section Desktop */}
          <div className="hidden md:block">
            {isLoading ? (
              <div className="flex items-center gap-2 text-[#B5B5B5]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Dang tai...</span>
              </div>
            ) : daDangNhap && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#1E1E1E] bg-[#111111]/60 hover:bg-[#161616] hover:border-[#2F9BE6]/30 transition-all duration-200 group"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs ${getAvatarInitial(user.tenDangNhap).color}`}>
                    {getAvatarInitial(user.tenDangNhap).initial}
                  </div>
                  <span className="text-sm font-medium text-white max-w-[100px] truncate">{user.tenDangNhap}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#111111] border border-[#1E1E1E] rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in z-50">
                    <div className="px-4 py-3 border-b border-[#1E1E1E] bg-[#161616]">
                      <p className="text-sm font-semibold text-white truncate">{user.tenDangNhap}</p>
                      <p className="text-xs text-[#B5B5B5] mt-0.5 truncate">{user.email}</p>
                    </div>

                    <div className="px-4 py-3 border-b border-[#1E1E1E] bg-[#0A0A0A]">
                      <p className="text-xs text-[#B5B5B5] mb-1">So du</p>
                      <p className="text-sm font-semibold text-[#10B981]">
                        {soDuVnd.toLocaleString("vi-VN")} VND
                      </p>
                    </div>

                    <Link
                      href="/nap-tien"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-white hover:bg-[#161616] transition-colors duration-150 border-b border-[#1E1E1E]"
                    >
                      <Wallet className="w-4 h-4 text-[#2F9BE6]" />
                      <span className="text-sm font-medium">Nap Tien</span>
                    </Link>

                    <Link
                      href="/don-hang"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-white hover:bg-[#161616] transition-colors duration-150 border-b border-[#1E1E1E]"
                    >
                      <ShoppingBag className="w-4 h-4 text-[#2F9BE6]" />
                      <span className="text-sm font-medium">Don Hang</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleDiscordLink}
                      className="w-full flex items-center gap-2 px-4 py-3 text-white hover:bg-[#161616] transition-colors duration-150 border-b border-[#1E1E1E]"
                    >
                      <User className="w-4 h-4 text-[#5865F2]" />
                      <span className="text-sm font-medium">
                        {daLienKetDiscord
                          ? `Discord: ${discordTenHienThi || "Da lien ket"}`
                          : "Lien Ket Discord"}
                      </span>
                    </button>

                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-2 px-4 py-3 text-[#FF4D4F] hover:bg-[#FF4D4F]/10 transition-colors duration-150 disabled:opacity-50"
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
                  className="px-4 py-2 rounded-xl border border-[#2F9BE6] text-[#2F9BE6] font-medium text-sm transition-all duration-200 hover:bg-[#2F9BE6]/10"
                >
                  Dang Nhap
                </Link>
                <Link
                  href="/dang-ky"
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2F9BE6] to-[#49B6FF] hover:from-[#49B6FF] hover:to-[#2F9BE6] text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-[0_0_20px_rgba(47,155,230,0.25)] hover:shadow-[0_0_30px_rgba(47,155,230,0.4)] hover:scale-[1.02]"
                >
                  Dang Ky
                </Link>
              </div>
            )}
          </div>

          {/* Hamburger Icon Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#B5B5B5] hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Fullscreen Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full z-[9998] border-b border-[#1E1E1E] bg-[#050505]/98 backdrop-blur-xl animate-fade-in">
          <div className="max-h-[calc(100dvh-68px)] min-h-[calc(100dvh-68px)] overflow-y-auto px-4 py-6 flex flex-col gap-2">
            <Link
              href="/shop"
              onClick={() => {
                clearCheckoutResume();
                setMobileMenuOpen(false);
              }}
              className="flex items-center rounded-2xl bg-[#111111] px-5 py-4 text-lg font-semibold text-white transition-all active:scale-[0.98]"
            >
              Cua Hang
            </Link>
            <Link
              href="/proofs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center rounded-2xl bg-[#111111] px-5 py-4 text-lg font-semibold text-white transition-all active:scale-[0.98]"
            >
              Danh Gia
            </Link>
            <a
              href={SUPPORT_DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center rounded-2xl bg-[#111111] px-5 py-4 text-lg font-semibold text-white transition-all active:scale-[0.98]"
            >
              Ho Tro
            </a>
            {isAdminRole(user?.vaiTro) && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center rounded-2xl bg-[#111111] px-5 py-4 text-lg font-semibold text-[#2F9BE6] transition-all active:scale-[0.98]"
              >
                Quan Tri
              </Link>
            )}

            {/* Mobile Auth Section */}
            <div className="border-t border-[#1E1E1E] pt-4 mt-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-3 text-[#B5B5B5] gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Dang tai...</span>
                </div>
              ) : daDangNhap && user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2 py-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarInitial(user.tenDangNhap).color}`}>
                      {getAvatarInitial(user.tenDangNhap).initial}
                    </div>
                    <div>
                      <p className="font-semibold text-white truncate max-w-[180px]">{user.tenDangNhap}</p>
                      <p className="text-xs text-[#B5B5B5] truncate max-w-[180px]">{user.email}</p>
                    </div>
                  </div>

                  <div className="px-3 py-2 bg-[#0A0A0A] rounded-lg border border-[#1E1E1E]">
                    <p className="text-xs text-[#B5B5B5] mb-1">So du</p>
                    <p className="text-sm font-semibold text-[#10B981]">
                      {soDuVnd.toLocaleString("vi-VN")} VND
                    </p>
                  </div>

                  <Link
                    href="/nap-tien"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#2F9BE6]/10 hover:bg-[#2F9BE6]/20 text-[#2F9BE6] rounded-xl transition-all font-medium"
                  >
                    <Wallet className="w-5 h-5" />
                    <span>Nap Tien</span>
                  </Link>

                  <Link
                    href="/don-hang"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#2F9BE6]/10 hover:bg-[#2F9BE6]/20 text-[#2F9BE6] rounded-xl transition-all font-medium"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>Don Hang</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleDiscordLink}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#AAB2FF] rounded-xl transition-all font-medium"
                  >
                    <User className="w-5 h-5" />
                    <span>{daLienKetDiscord ? `Discord: ${discordTenHienThi || "Da lien ket"}` : "Lien Ket Discord"}</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF4D4F]/10 hover:bg-[#FF4D4F]/20 text-[#FF4D4F] rounded-xl transition-all font-medium disabled:opacity-50"
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
                    className="w-full flex items-center justify-center py-3 border border-[#2F9BE6] text-[#2F9BE6] rounded-xl transition-all font-medium"
                  >
                    Dang Nhap
                  </Link>
                  <Link
                    href="/dang-ky"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-[#2F9BE6] to-[#49B6FF] text-white rounded-xl transition-all font-medium shadow-[0_0_20px_rgba(47,155,230,0.25)]"
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

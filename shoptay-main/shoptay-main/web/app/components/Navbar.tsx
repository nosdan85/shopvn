"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { ShoppingCart, LogOut, User, Loader2, Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const SUPPORT_DISCORD_URL = "https://discord.com/channels/1398984938111369256/1493927408217100438";

interface NavbarProps {
  cartCount?: number;
  showCart?: boolean;
  onCartClick?: () => void;
}

export default function Navbar({ cartCount = 0, showCart = false, onCartClick }: NavbarProps) {
  const { user, isLoading, logout, getOAuthUrl } = useAuth();
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

  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      logout();
      setLoggingOut(false);
      setDropdownOpen(false);
      setMobileMenuOpen(false);
    }, 500);
  };

  const clearCheckoutResume = () => {
    try {
      window.sessionStorage.removeItem("pendingCheckout");
      window.localStorage.removeItem("pendingRoblox");
    } catch {
      // ignore
    }
  };

  const getAvatarUrl = (user: { avatar?: string; discordId: string }) => {
    if (!user.avatar) return null;
    return `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=64`;
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
            Shop
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2F9BE6] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
          </Link>
          <Link 
            href="/proofs" 
            className="relative px-3 py-2 text-[#B5B5B5] hover:text-white transition-colors duration-200 font-medium text-sm group"
          >
            Proofs
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2F9BE6] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
          </Link>
          <a
            href={SUPPORT_DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="relative px-3 py-2 text-[#B5B5B5] hover:text-white transition-colors duration-200 font-medium text-sm group"
          >
            Support
            <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#2F9BE6] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
          </a>
          {user?.isOwner && (
            <Link 
              href="/admin" 
              className="relative px-3 py-2 text-[#B5B5B5] hover:text-white transition-colors duration-200 font-medium text-sm group"
            >
              Admin
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
                <span className="text-sm">Loading...</span>
              </div>
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#1E1E1E] bg-[#111111]/60 hover:bg-[#161616] hover:border-[#2F9BE6]/30 transition-all duration-200 group"
                >
                  {getAvatarUrl(user) ? (
                    <img
                      src={getAvatarUrl(user)!}
                      alt={user.discordUsername}
                      className="w-6 h-6 rounded-full ring-2 ring-[#1E1E1E] group-hover:ring-[#2F9BE6]/30 transition-all"
                    />
                  ) : (
                    <User className="w-5 h-5 text-[#B5B5B5]" />
                  )}
                  <span className="text-sm font-medium text-white max-w-[100px] truncate">{user.discordUsername}</span>
                  {user.isOwner && (
                    <span className="px-2 py-0.5 bg-[#2F9BE6]/15 text-[#2F9BE6] text-[10px] font-bold rounded-md tracking-wider">
                      ADMIN
                    </span>
                  )}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#111111] border border-[#1E1E1E] rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in z-50">
                    <div className="px-4 py-3 border-b border-[#1E1E1E] bg-[#161616]">
                      <p className="text-sm font-semibold text-white truncate">{user.discordUsername}</p>
                      <p className="text-xs text-[#B5B5B5] mt-0.5">Discord ID: {user.discordId}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-2 px-4 py-3 text-[#FF4D4F] hover:bg-[#FF4D4F]/10 transition-colors duration-150 disabled:opacity-50"
                    >
                      {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a
                href={getOAuthUrl()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2F9BE6] to-[#49B6FF] hover:from-[#49B6FF] hover:to-[#2F9BE6] text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-[0_0_20px_rgba(47,155,230,0.25)] hover:shadow-[0_0_30px_rgba(47,155,230,0.4)] hover:scale-[1.02]"
              >
                Login with Discord
              </a>
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
              Shop
            </Link>
            <Link
              href="/proofs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center rounded-2xl bg-[#111111] px-5 py-4 text-lg font-semibold text-white transition-all active:scale-[0.98]"
            >
              Proofs
            </Link>
            <a
              href={SUPPORT_DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center rounded-2xl bg-[#111111] px-5 py-4 text-lg font-semibold text-white transition-all active:scale-[0.98]"
            >
              Support
            </a>
            {user?.isOwner && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center rounded-2xl bg-[#111111] px-5 py-4 text-lg font-semibold text-[#2F9BE6] transition-all active:scale-[0.98]"
              >
                Admin Dashboard
              </Link>
            )}

              {/* Mobile Auth Section */}
              <div className="border-t border-[#1E1E1E] pt-4 mt-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-3 text-[#B5B5B5] gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading User...</span>
                </div>
              ) : user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2 py-2">
                    {getAvatarUrl(user) ? (
                      <img src={getAvatarUrl(user)!} alt="" className="w-10 h-10 rounded-full ring-2 ring-[#1E1E1E]" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center border border-[#1E1E1E]">
                        <User className="w-5 h-5 text-[#B5B5B5]" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white truncate max-w-[180px]">{user.discordUsername}</p>
                      <p className="text-xs text-[#B5B5B5] truncate max-w-[180px]">ID: {user.discordId}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF4D4F]/10 hover:bg-[#FF4D4F]/20 text-[#FF4D4F] rounded-xl transition-all font-medium disabled:opacity-50"
                  >
                    {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <a
                  href={getOAuthUrl()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#2F9BE6] to-[#49B6FF] text-white rounded-xl transition-all font-medium shadow-[0_0_20px_rgba(47,155,230,0.25)]"
                >
                  Login with Discord
                </a>
              )}
              </div>
          </div>
        </div>
      )}
    </nav>
  );
}





"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthViet } from "../context/AuthVietContext";
import BackButton from "../components/BackButton";
import { getDiscordLinkRedirectUri } from "@/lib/discordOAuth";
import {
 ChevronDown,
 ChevronUp,
 AlertTriangle,
 ExternalLink,
 Loader2,
 ShoppingBag,
 Clock,
 CreditCard,
 Trash2,
 CheckCircle,
} from "lucide-react";

interface DonHangItem {
 _id: string;
 name: string;
 quantity: number;
 packQuantity: number;
 priceVnd: number;
 lineTotalVnd: number;
}

interface DonHang {
 _id: string;
 maDonHang: string;
 ngayTao: string;
 tongTienVnd: number;
 trangThai: string;
 trangThaiThanhToan: string;
 discordDaLienKet: boolean;
 discordDaJoinServer: boolean;
 daTaoTicket: boolean;
 ticketChannelName?: string;
 ticketStatus?: string;
 items: DonHangItem[];
 subtotalVnd: number;
 giamGiaVnd: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
 cho_xu_ly: { label: "Chờ xử lý", color: "#FBBF24", bg: "rgba(251,191,36,0.2)" },
 da_thanh_toan: { label: "Đã thanh toán", color: "#2F9BE6", bg: "rgba(47,155,230,0.2)" },
 da_tao_ticket: { label: "Đã tạo ticket", color: "#3DDC84", bg: "rgba(61,220,132,0.2)" },
 dang_giao: { label: "Đang giao hàng", color: "#A855F7", bg: "rgba(168,85,247,0.2)" },
 hoan_thanh: { label: "Hoàn thành", color: "#10B981", bg: "rgba(16,185,129,0.2)" },
 huy: { label: "Đã hủy", color: "#FF4D4F", bg: "rgba(255,77,79,0.2)" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
 pending: { label: "Chưa thanh toán", color: "#FBBF24", bg: "rgba(251,191,36,0.2)" },
 paid: { label: "Đã thanh toán", color: "#3DDC84", bg: "rgba(61,220,132,0.2)" },
 cancelled: { label: "Đã hủy", color: "#FF4D4F", bg: "rgba(255,77,79,0.2)" },
 refunded: { label: "Đã hoàn", color: "#A855F7", bg: "rgba(168,85,247,0.2)" },
};

const DISCORD_SERVER_INVITE = process.env.NEXT_PUBLIC_DISCORD_SERVER_INVITE || "https://discord.gg/nosdan";

function formatVnd(value: number | string | undefined | null): string {
 const n = Number(value);
 if (!Number.isFinite(n)) return "0";
 return n.toLocaleString("vi-VN");
}

function formatDateVn(dateStr: string | undefined | null): string {
 if (!dateStr) return "";
 try {
 return new Date(dateStr).toLocaleDateString("vi-VN", {
 day: "2-digit",
 month: "2-digit",
 year: "numeric",
 });
 } catch {
 return "";
 }
}

function OrderCardSkeleton() {
 return (
 <div className="animate-pulse rounded-[18px] border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] p-4">
 <div className="flex items-start justify-between">
 <div className="h-4 w-24 rounded bg-white/60 backdrop-blur-md" />
 <div className="h-4 w-16 rounded bg-white/60 backdrop-blur-md" />
 </div>
 <div className="mt-3 h-3 w-32 rounded bg-white/60 backdrop-blur-md" />
 <div className="mt-2 h-5 w-20 rounded bg-white/60 backdrop-blur-md" />
 <div className="mt-3 space-y-2">
 <div className="h-3 w-full rounded bg-white/60 backdrop-blur-md" />
 <div className="h-3 w-3/4 rounded bg-white/60 backdrop-blur-md" />
 </div>
 </div>
 );
}

const API_URL = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_API_URL || "" : "";

function DonHangPage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const { user, token, isLoading: authLoading, layThongTin } = useAuthViet();

 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [orders, setOrders] = useState<DonHang[]>([]);
 const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
 const [submitting, setSubmitting] = useState<string | null>(null);
 const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
 const [successMessage, setSuccessMessage] = useState<string | null>(null);
 const [showDiscordModal, setShowDiscordModal] = useState(false);

 // Check if user has paid orders but not linked Discord
 useEffect(() => {
 if (!authLoading && user && orders.length > 0) {
 const hasPaidOrders = orders.some(
 (order) => order.trangThai === "da_thanh_toan" || order.trangThaiThanhToan === "da_thanh_toan"
 );
 const hasLinkedDiscord = user.daLienKetDiscord;

 if (hasPaidOrders && !hasLinkedDiscord) {
 setShowDiscordModal(true);
 }
 }
 }, [authLoading, user, orders]);

 const loadOrders = useCallback(async (isPolling = false) => {
 if (!token) return;

 if (!isPolling) setLoading(true);
 setError(null);
 try {
 const res = await fetch(`${API_URL}/api/don-hang/lich-su`, {
 cache: "no-store",
 headers: {
 "Authorization": `Bearer ${token}`
 }
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data?.error || data?.message || "Lỗi tải đơn hàng");

 // API returns { donHang: [], tong: number }
 setOrders(Array.isArray(data.donHang) ? data.donHang : []);
 } catch (e) {
 if (!isPolling) setError(e instanceof Error ? e.message : "Lỗi tải đơn hàng");
 } finally {
 if (!isPolling) setLoading(false);
 }
 }, [token]);

 useEffect(() => {
 if (!authLoading && !user) {
 router.replace("/dang-nhap");
 return;
 }

 if (!authLoading && user) {
 loadOrders();
 
 // Poll for order updates every 10 seconds
 const intervalId = setInterval(() => {
   loadOrders(true);
 }, 10000);
 
 return () => clearInterval(intervalId);
 }
 }, [authLoading, user, router, loadOrders]);

 // Handle Discord OAuth callback
 useEffect(() => {
 const discordStatus = searchParams.get("discord");
 if (discordStatus === "success") {
 // Refresh user data to get updated Discord link status
 layThongTin().catch(() => {});
 setSuccessMessage("Lien ket Discord thanh cong!");
 // Refresh orders to get updated discordDaLienKet status
 loadOrders();
 } else if (discordStatus === "error") {
 setError("Lien ket Discord that bai. Vui long thu lai.");
 }
 // Clear the URL params after processing
 if (discordStatus) {
 router.replace("/don-hang");
 }
 }, [searchParams, router, layThongTin, loadOrders]);

 const toggleExpand = (id: string) => {
 setExpandedIds((prev) => {
 const next = new Set(prev);
 if (next.has(id)) {
 next.delete(id);
 } else {
 next.add(id);
 }
 return next;
 });
 };

 const handleCancelOrder = async (orderId: string) => {
 if (!confirm("Ban co chan chan muon huy don hang nay?")) {
 return;
 }

 setSubmitting(orderId);
 setError(null);

 try {
 const res = await fetch(`${API_URL}/api/don-hang/${orderId}/huy`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 "Authorization": `Bearer ${token}`
 },
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data?.message || "Huy don hang that bai");

 setOrders((prev) =>
 prev.map((o) =>
 o._id === orderId ? { ...o, trangThai: "huy" } : o
 )
 );
 setCancelConfirm(null);
 } catch (e) {
 setError(e instanceof Error ? e.message : "Huy don hang that bai");
 } finally {
 setSubmitting(null);
 }
 };

 const handleCreateTicket = async (orderId: string) => {
 setSubmitting(orderId);
 setError(null);

 try {
 const res = await fetch(`${API_URL}/api/don-hang/${orderId}/tao-ticket`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 "Authorization": `Bearer ${token}`
 },
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data?.message || "Tao ticket that bai");

 await loadOrders();
 } catch (e) {
 setError(e instanceof Error ? e.message : "Tao ticket that bai");
 } finally {
 setSubmitting(null);
 }
 };

 const handleLinkDiscord = () => {
 const clientId = String(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "").trim();
 const redirectUri = getDiscordLinkRedirectUri({
 envRedirectUri: process.env.NEXT_PUBLIC_DISCORD_LINK_REDIRECT_URI,
 origin: window.location.origin,
 });

 if (!clientId || !redirectUri) {
 setError("Cau hinh Discord chua san sang.");
 return;
 }

 const params = new URLSearchParams({
 client_id: clientId,
 redirect_uri: redirectUri,
 response_type: "code",
 scope: "identify email",
 });
 window.location.href = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
 };

 const handleJoinServer = () => {
 window.open(DISCORD_SERVER_INVITE, "_blank");
 };

 if (authLoading) {
 return (
 <div className="min-h-screen bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]">
 <div className="flex items-center justify-center pt-32">
 <Loader2 className="h-8 w-8 animate-spin text-blue-300/80" />
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] text-[#071326]/90/90">
 {/* Header */}
 <div className="sticky top-0 z-30 border-b border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] border border-white/50 shadow-lg backdrop-blur-sm">
 <div className="mx-auto max-w-3xl px-3 sm:px-4 py-3 sm:py-4">
 <div className="flex items-center justify-between">
 <h1 className="text-base sm:text-lg font-semibold">Đơn Hàng Của Tôi</h1>
 {!loading && orders.length > 0 && (
 <span className="rounded-full bg-white/40 backdrop-blur-sm px-3 py-1 text-xs font-medium text-blue-300/80">
 {orders.length} don
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6">
 <BackButton href="/shop" label="Cửa Hàng" variant="back" />
 <div className="mt-4">
 {/* Success Message */}
 {successMessage && (
 <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]/20 px-4 py-3 text-sm text-emerald-700">
 <CheckCircle className="h-4 w-4" />
 {successMessage}
 </div>
 )}

 {/* Error Message */}
 {error && (
 <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-[#FF4D4F]/20 px-4 py-3 text-sm text-red-400">
 <AlertTriangle className="h-4 w-4" />
 {error}
 </div>
 )}

 {/* Discord Link Required Modal */}
 {showDiscordModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm p-4">
 <div className="w-full max-w-md rounded-[22px] border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] p-6 shadow-2xl">
 <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#5865F2]/20">
 <svg className="h-6 w-6 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
 <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
 </svg>
 </div>

 <h2 className="mb-2 text-xl font-bold text-[#071326]/90/90">Liên Kết Discord Để Nhận Hàng</h2>

 <p className="mb-6 text-sm text-slate-600">
 Bạn có đơn hàng đã thanh toán! Để nhận hàng, vui lòng liên kết tài khoản Discord của bạn.
 Chúng tôi sẽ tạo ticket riêng trên Discord để giao hàng.
 </p>

 <div className="flex gap-3">
 <button
 onClick={() => setShowDiscordModal(false)}
 className="flex-1 rounded-[14px] border border-white/40 bg-white/30 backdrop-blur-md border border-white/50 shadow-lg py-3 text-sm font-medium text-[#071326]/90/90 transition-all hover:bg-white/40 backdrop-blur-sm border border-white/50"
 >
 Để sau
 </button>
 <button
 onClick={handleLinkDiscord}
 className="flex-1 rounded-[14px] bg-[#5865F2] py-3 text-sm font-medium text-[#071326]/90/90 transition-all hover:bg-[#4752C4] flex items-center justify-center gap-2"
 >
 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
 <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
 </svg>
 Liên Kết Ngay
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Loading Skeletons */}
 {loading && (
 <div className="space-y-4">
 <OrderCardSkeleton />
 <OrderCardSkeleton />
 <OrderCardSkeleton />
 </div>
 )}

 {/* Empty State */}
 {!loading && orders.length === 0 && (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <ShoppingBag className="h-16 w-16 text-slate-600/50" />
 <p className="mt-4 text-slate-600">Bạn chưa có đơn hàng nào</p>
 <Link
 href="/shop"
 className="mt-4 rounded-[14px] bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] px-6 py-2.5 text-sm font-medium text-[#071326]/90/90 transition-all hover:bg-white/60 hover:shadow-[0_4px_20px_rgba(255,255,255,0.4)] primary-hover-glow"
 >
 Di mua sam
 </Link>
 </div>
 )}

 {/* Order List */}
 {!loading && orders.length > 0 && (
 <div className="space-y-4">
 {orders.map((order) => {
 const isExpanded = expandedIds.has(order._id);
 const canCancel =
 order.trangThai === "cho_xu_ly" || order.trangThai === "da_thanh_toan";
 const canCreateTicket =
 order.trangThai === "da_thanh_toan" &&
 order.discordDaLienKet &&
 order.discordDaJoinServer &&
 !order.daTaoTicket;
 const showDiscordWarning =
 order.trangThai === "da_thanh_toan" && !order.discordDaLienKet;

 return (
 <div
 key={order._id}
 className="overflow-hidden rounded-[18px] border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]"
 >
 {/* Order Header */}
 <div
 className="cursor-pointer p-4"
 onClick={() => toggleExpand(order._id)}
 >
 <div className="flex items-start justify-between">
 <div>
 <p className="text-xs text-slate-600">
 Ma don hang
 </p>
 <p className="mt-0.5 font-mono text-sm font-semibold">
 {order.maDonHang}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <span
 className="rounded-full px-2.5 py-1 text-xs font-medium"
 style={{
 color: STATUS_LABELS[order.trangThai]?.color || "#B5B5B5",
 backgroundColor: STATUS_LABELS[order.trangThai]?.bg || "#B5B5B5/20",
 }}
 >
 {STATUS_LABELS[order.trangThai]?.label || order.trangThai}
 </span>
 {isExpanded ? (
 <ChevronUp className="h-4 w-4 text-slate-600" />
 ) : (
 <ChevronDown className="h-4 w-4 text-slate-600" />
 )}
 </div>
 </div>

 <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
 <div className="flex items-center gap-1">
 <Clock className="h-3.5 w-3.5" />
 {formatDateVn(order.ngayTao)}
 </div>
 <span
 className="rounded-full px-2 py-0.5 text-xs font-medium"
 style={{
 color:
 PAYMENT_STATUS_LABELS[order.trangThaiThanhToan]?.color ||
 "#B5B5B5",
 backgroundColor:
 PAYMENT_STATUS_LABELS[
 order.trangThaiThanhToan
 ]?.bg || "#B5B5B5/20",
 }}
 >
 {PAYMENT_STATUS_LABELS[order.trangThaiThanhToan]?.label ||
 order.trangThaiThanhToan}
 </span>
 </div>

 <div className="mt-2 flex items-baseline justify-between">
 <p className="text-lg font-bold text-emerald-700">
 {formatVnd(order.tongTienVnd)} VND
 </p>
 </div>

 {/* Items Preview */}
 {!isExpanded && order.items.length > 0 && (
 <div className="mt-3 space-y-1">
 {order.items.slice(0, 2).map((item, idx) => (
 <p
 key={idx}
 className="truncate text-xs text-slate-600"
 >
 {item.name} (x{item.quantity * item.packQuantity})
 </p>
 ))}
 {order.items.length > 2 && (
 <p className="text-xs text-blue-300/80">
 +{order.items.length - 2} san pham khac
 </p>
 )}
 </div>
 )}
 </div>

 {/* Order Detail (Expanded) */}
 {isExpanded && (
 <div className="border-t border-white/40 px-4 pb-4">
 {/* Item List */}
 <div className="mt-4 space-y-3">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
 San pham
 </h3>
 {order.items.map((item, idx) => (
 <div
 key={idx}
 className="flex items-start justify-between rounded-[12px] bg-white/30 backdrop-blur-md border border-white/50 shadow-lg p-3"
 >
 <div className="flex-1 min-w-0">
 <p className="truncate text-sm">{item.name}</p>
 <p className="mt-0.5 text-xs text-slate-600">
 x{item.quantity * item.packQuantity} -{" "}
 {formatVnd(item.priceVnd)} VND
 </p>
 </div>
 <p className="ml-3 whitespace-nowrap text-sm font-medium text-emerald-700">
 {formatVnd(item.lineTotalVnd)} VND
 </p>
 </div>
 ))}
 </div>

 {/* Summary */}
 <div className="mt-4 space-y-2 rounded-[12px] bg-white/30 backdrop-blur-md border border-white/50 shadow-lg p-3">
 <div className="flex justify-between text-sm">
 <span className="text-slate-600">Subtotal</span>
 <span>{formatVnd(order.subtotalVnd)} VND</span>
 </div>
 {order.giamGiaVnd > 0 && (
 <div className="flex justify-between text-sm text-emerald-700">
 <span>Giam gia</span>
 <span>-{formatVnd(order.giamGiaVnd)} VND</span>
 </div>
 )}
 <div className="flex justify-between border-t border-white/40 pt-2 text-base font-semibold">
 <span>Tong</span>
 <span className="text-emerald-700">
 {formatVnd(order.tongTienVnd)} VND
 </span>
 </div>
 </div>

 {/* Ticket Section */}
 <div className="mt-4 space-y-3">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
 Ticket giao hang
 </h3>

 {/* Discord Link Warning */}
 {showDiscordWarning && (
 <div className="flex items-start gap-3 rounded-[12px] bg-[#FF4D4F]/10 p-3">
 <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
 <div className="flex-1">
 <p className="text-sm text-slate-600">
 Ban can lien ket Discord de tao ticket
 </p>
 <button
 onClick={handleLinkDiscord}
 className="mt-2 rounded-[10px] bg-[#5865F2] px-4 py-2 text-sm font-medium text-[#071326]/90/90 transition-all hover:bg-[#7289DA]"
 >
 Lien Ket Discord
 </button>
 </div>
 </div>
 )}

 {/* Discord Join Server Warning */}
 {order.trangThai === "da_thanh_toan" &&
 order.discordDaLienKet &&
 !order.discordDaJoinServer && (
 <div className="flex items-start gap-3 rounded-[12px] bg-[#FF4D4F]/10 p-3">
 <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
 <div className="flex-1">
 <p className="text-sm text-slate-600">
 Ban can tham gia server Discord
 </p>
 <button
 onClick={handleJoinServer}
 className="mt-2 flex items-center gap-2 rounded-[10px] bg-[#5865F2] px-4 py-2 text-sm font-medium text-[#071326]/90/90 transition-all hover:bg-[#7289DA]"
 >
 Tham Gia Server
 <ExternalLink className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 )}

 {/* Create Ticket Button */}
 {canCreateTicket && (
 <button
 onClick={() => handleCreateTicket(order._id)}
 disabled={submitting === order._id}
 className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] px-4 py-3 text-sm font-medium text-slate-600 transition-all hover:bg-white/60 hover:shadow-[0_4px_20px_rgba(255,255,255,0.4)] disabled:opacity-50"
 >
 {submitting === order._id ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" />
 Dang xu ly...
 </>
 ) : (
 <>
 <CreditCard className="h-4 w-4" />
 Tao Ticket Giao Hang
 </>
 )}
 </button>
 )}

 {/* Existing Ticket Info */}
 {order.daTaoTicket && order.ticketChannelName && (
 <div className="flex items-center gap-3 rounded-[12px] bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] p-3">
 <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-700" />
 <div>
 <p className="text-sm text-emerald-700">
 Da tao ticket
 </p>
 <p className="text-xs text-slate-600">
 Channel: {order.ticketChannelName}
 </p>
 {order.ticketStatus && (
 <p className="mt-1 text-xs text-blue-300/80">
 Trang thai: {order.ticketStatus}
 </p>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Cancel Button */}
 {canCancel && (
 <div className="mt-4 pt-2">
 {cancelConfirm === order._id ? (
 <div className="flex items-center gap-2">
 <button
 onClick={() => setCancelConfirm(null)}
 className="flex-1 rounded-[12px] bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] px-4 py-2 text-sm font-medium text-[#071326]/90/90"
 >
 Khong
 </button>
 <button
 onClick={() => handleCancelOrder(order._id)}
 disabled={submitting === order._id}
 className="flex-1 rounded-[12px] bg-[#FF4D4F] px-4 py-2 text-sm font-medium text-[#071326]/90/90 disabled:opacity-50"
 >
 {submitting === order._id ? (
 <Loader2 className="h-4 w-4 animate-spin mx-auto" />
 ) : (
 "Xac nhan huy"
 )}
 </button>
 </div>
 ) : (
 <button
 onClick={() => setCancelConfirm(order._id)}
 className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-[#FF4D4F]/30 px-4 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-[#FF4D4F]/10"
 >
 <Trash2 className="h-4 w-4" />
 Huy don hang
 </button>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

export default function DonHangPageWrapper() {
 return (
 <Suspense
 fallback={
 <div className="min-h-screen bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]">
 <div className="flex items-center justify-center pt-32">
 <Loader2 className="h-8 w-8 animate-spin text-blue-300/80" />
 </div>
 </div>
 }
 >
 <DonHangPage />
 </Suspense>
 );
}

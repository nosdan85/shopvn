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

  // API returns { donHang: [], tong: number } — only show completed orders
  const allOrders = Array.isArray(data.donHang) ? data.donHang : [];
  setOrders(allOrders.filter((o: DonHang) => o.trangThai === 'hoan_thanh'));
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
 
 const intervalId = setInterval(() => {
   loadOrders(true);
 }, 10000);
 
 return () => clearInterval(intervalId);
 }
 }, [authLoading, user, router, loadOrders]);

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
 <div className="sticky top-0 z-30 border-b border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] border border-white/50 shadow-lg backdrop-blur-sm">
 <div className="mx-auto max-w-3xl px-3 sm:px-4 py-3 sm:py-4">
 <div className="flex items-center justify-between">
 <h1 className="text-base sm:text-lg font-semibold">Đơn Hàng Đã Hoàn Thành</h1>
 {!loading && orders.length > 0 && (
 <span className="rounded-full bg-white/40 backdrop-blur-sm px-3 py-1 text-xs font-medium text-blue-300/80">
 {orders.length} đơn
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6">
 <BackButton href="/shop" label="Cửa Hàng" variant="back" />
 <div className="mt-4">
 {error && (
 <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-[#FF4D4F]/20 px-4 py-3 text-sm text-red-400">
 <AlertTriangle className="h-4 w-4" />
 {error}
 </div>
 )}

 {loading && (
 <div className="space-y-4">
 <OrderCardSkeleton />
 <OrderCardSkeleton />
 <OrderCardSkeleton />
 </div>
 )}

 {!loading && orders.length === 0 && (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <ShoppingBag className="h-16 w-16 text-slate-600/50" />
 <p className="mt-4 text-slate-600">Bạn chưa có đơn hàng hoàn thành nào</p>
 <Link
 href="/shop"
 className="mt-4 rounded-[14px] bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] px-6 py-2.5 text-sm font-medium text-[#071326]/90/90 transition-all hover:bg-white/60 hover:shadow-[0_4px_20px_rgba(255,255,255,0.4)] primary-hover-glow"
 >
 Đi mua sắm
 </Link>
 </div>
 )}

 {!loading && orders.length > 0 && (
 <div className="space-y-4">
 {orders.map((order) => {
 const isExpanded = expandedIds.has(order._id);

 return (
 <div
 key={order._id}
 className="overflow-hidden rounded-[18px] border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]"
 >
 <div
 className="cursor-pointer p-4"
 onClick={() => toggleExpand(order._id)}
 >
 <div className="flex items-start justify-between">
 <div>
 <p className="text-xs text-slate-600">
 Mã đơn hàng
 </p>
 <p className="mt-0.5 font-mono text-sm font-semibold">
 {order.maDonHang}
 </p>
 </div>
 <div className="flex items-center gap-2">
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
 </div>

  <div className="mt-2 flex items-baseline justify-between">
  <p className="text-lg font-bold text-emerald-700">
  {formatVnd(order.tongTienVnd)} VND
  </p>
  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">✅ Hoàn thành</span>
  </div>

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
 +{order.items.length - 2} sản phẩm khác
 </p>
 )}
 </div>
 )}
 </div>

 {isExpanded && (
 <div className="border-t border-white/40 px-4 pb-4">
 <div className="mt-4 space-y-3">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
 Sản phẩm
 </h3>
 {order.items.map((item, idx) => (
 <div
 key={idx}
 className="flex items-start justify-between rounded-[12px] bg-white/30 backdrop-blur-md border border-white/50 shadow-lg p-3"
 >
  <div className="flex-1 min-w-0">
  <p className="truncate text-sm">{item.name}</p>
  <p className="mt-0.5 text-xs text-slate-600">
  x{item.quantity * (item.packQuantity || 1)}
  </p>
  </div>
  <p className="ml-3 whitespace-nowrap text-sm font-medium text-emerald-700">
  {formatVnd(item.lineTotalVnd || item.priceVnd || 0)} VND
  </p>
 </div>
 ))}
 </div>

 <div className="mt-4 space-y-2 rounded-[12px] bg-white/30 backdrop-blur-md border border-white/50 shadow-lg p-3">
 <div className="flex justify-between text-sm">
 <span className="text-slate-600">Subtotal</span>
 <span>{formatVnd(order.subtotalVnd)} VND</span>
 </div>
 {order.giamGiaVnd > 0 && (
 <div className="flex justify-between text-sm text-emerald-700">
 <span>Giảm giá</span>
 <span>-{formatVnd(order.giamGiaVnd)} VND</span>
 </div>
 )}
 <div className="flex justify-between border-t border-white/40 pt-2 text-base font-semibold">
 <span>Tổng</span>
 <span className="text-emerald-700">
 {formatVnd(order.tongTienVnd)} VND
 </span>
 </div>
 </div>

 {/* Completed order info */}
 <div className="mt-4 flex items-center gap-3 rounded-[12px] bg-emerald-50/60 backdrop-blur-md border border-emerald-200/40 p-3">
 <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600" />
 <p className="text-sm text-emerald-700">Đơn hàng đã được giao thành công</p>
 </div>
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

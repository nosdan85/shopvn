"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthViet } from "../context/AuthVietContext";
import BackButton from "../components/BackButton";
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
  cho_xu_ly: { label: "Cho xu ly", color: "#FBBF24", bg: "rgba(251,191,36,0.2)" },
  da_thanh_toan: { label: "Da thanh toan", color: "#2F9BE6", bg: "rgba(47,155,230,0.2)" },
  da_tao_ticket: { label: "Da tao ticket", color: "#3DDC84", bg: "rgba(61,220,132,0.2)" },
  dang_giao: { label: "Dang giao hang", color: "#A855F7", bg: "rgba(168,85,247,0.2)" },
  hoan_thanh: { label: "Hoan thanh", color: "#3DDC84", bg: "rgba(61,220,132,0.2)" },
  huy: { label: "Da huy", color: "#FF4D4F", bg: "rgba(255,77,79,0.2)" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  chua_thanh_toan: { label: "Chua thanh toan", color: "#FF4D4F", bg: "rgba(255,77,79,0.2)" },
  da_thanh_toan: { label: "Da thanh toan", color: "#3DDC84", bg: "rgba(61,220,132,0.2)" },
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
    <div className="animate-pulse rounded-[18px] border border-[#1E1E1E] bg-[#111111] p-4">
      <div className="flex items-start justify-between">
        <div className="h-4 w-24 rounded bg-[#2A2A2A]" />
        <div className="h-4 w-16 rounded bg-[#2A2A2A]" />
      </div>
      <div className="mt-3 h-3 w-32 rounded bg-[#2A2A2A]" />
      <div className="mt-2 h-5 w-20 rounded bg-[#2A2A2A]" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-[#2A2A2A]" />
        <div className="h-3 w-3/4 rounded bg-[#2A2A2A]" />
      </div>
    </div>
  );
}

const API_URL = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_API_URL || "" : "";

function DonHangPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, getDiscordOAuthUrl, layThongTin } = useAuthViet();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<DonHang[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Discord OAuth callback
  useEffect(() => {
    const discordStatus = searchParams.get("discord");
    if (discordStatus === "success") {
      setSuccessMessage("Lien ket Discord thanh cong!");
      layThongTin().catch(() => {});
    } else if (discordStatus === "error") {
      setError("Lien ket Discord that bai. Vui long thu lai.");
    }
  }, [searchParams, layThongTin]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = window.setTimeout(() => setSuccessMessage(null), 5000);
      return () => window.clearTimeout(timer);
    }
  }, [successMessage]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/don-hang/don-hang/lich-su`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Loi tai don hang");
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Loi tai don hang");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/dang-nhap");
      return;
    }

    if (!authLoading && user) {
      loadOrders();
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

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Ban co chan chan muon huy don hang nay?")) {
      return;
    }

    setSubmitting(orderId);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/don-hang/don-hang/${orderId}/huy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`${API_URL}/api/don-hang/don-hang/${orderId}/tao-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    const url = getDiscordOAuthUrl();
    if (url && url !== "#discord-env-missing") {
      window.location.href = url;
    } else {
      setError("Cau hinh Discord chua san sang.");
    }
  };

  const handleJoinServer = () => {
    window.open(DISCORD_SERVER_INVITE, "_blank");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-[#2F9BE6]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-[#1E1E1E] bg-[#050505]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Don Hang Cua Toi</h1>
            {!loading && orders.length > 0 && (
              <span className="rounded-full bg-[#2F9BE6]/20 px-3 py-1 text-xs font-medium text-[#2F9BE6]">
                {orders.length} don
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <BackButton href="/cua-hang" label="Cửa Hàng" variant="back" />
        <div className="mt-4">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-[#3DDC84]/20 px-4 py-3 text-sm text-[#3DDC84]">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-[#FF4D4F]/20 px-4 py-3 text-sm text-[#FF4D4F]">
            <AlertTriangle className="h-4 w-4" />
            {error}
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
            <ShoppingBag className="h-16 w-16 text-[#B5B5B5]/50" />
            <p className="mt-4 text-[#B5B5B5]">Ban chua co don hang nao</p>
            <Link
              href="/shop"
              className="mt-4 rounded-[14px] bg-[#2F9BE6] px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#49B6FF] primary-hover-glow"
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
                  className="overflow-hidden rounded-[18px] border border-[#1E1E1E] bg-[#111111]"
                >
                  {/* Order Header */}
                  <div
                    className="cursor-pointer p-4"
                    onClick={() => toggleExpand(order._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-[#B5B5B5]">
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
                          <ChevronUp className="h-4 w-4 text-[#B5B5B5]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#B5B5B5]" />
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-[#B5B5B5]">
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
                      <p className="text-lg font-bold text-[#3DDC84]">
                        {formatVnd(order.tongTienVnd)} VND
                      </p>
                    </div>

                    {/* Items Preview */}
                    {!isExpanded && order.items.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <p
                            key={idx}
                            className="truncate text-xs text-[#B5B5B5]"
                          >
                            {item.name} (x{item.quantity * item.packQuantity})
                          </p>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-xs text-[#2F9BE6]">
                            +{order.items.length - 2} san pham khac
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Order Detail (Expanded) */}
                  {isExpanded && (
                    <div className="border-t border-[#1E1E1E] px-4 pb-4">
                      {/* Item List */}
                      <div className="mt-4 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B5B5B5]">
                          San pham
                        </h3>
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between rounded-[12px] bg-[#0A0A0A] p-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm">{item.name}</p>
                              <p className="mt-0.5 text-xs text-[#B5B5B5]">
                                x{item.quantity * item.packQuantity} -{" "}
                                {formatVnd(item.priceVnd)} VND
                              </p>
                            </div>
                            <p className="ml-3 whitespace-nowrap text-sm font-medium text-[#3DDC84]">
                              {formatVnd(item.lineTotalVnd)} VND
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div className="mt-4 space-y-2 rounded-[12px] bg-[#0A0A0A] p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#B5B5B5]">Subtotal</span>
                          <span>{formatVnd(order.subtotalVnd)} VND</span>
                        </div>
                        {order.giamGiaVnd > 0 && (
                          <div className="flex justify-between text-sm text-[#3DDC84]">
                            <span>Giam gia</span>
                            <span>-{formatVnd(order.giamGiaVnd)} VND</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-[#1E1E1E] pt-2 text-base font-semibold">
                          <span>Tong</span>
                          <span className="text-[#3DDC84]">
                            {formatVnd(order.tongTienVnd)} VND
                          </span>
                        </div>
                      </div>

                      {/* Ticket Section */}
                      <div className="mt-4 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B5B5B5]">
                          Ticket giao hang
                        </h3>

                        {/* Discord Link Warning */}
                        {showDiscordWarning && (
                          <div className="flex items-start gap-3 rounded-[12px] bg-[#FF4D4F]/10 p-3">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[#FF4D4F]" />
                            <div className="flex-1">
                              <p className="text-sm text-[#FFB3B3]">
                                Ban can lien ket Discord de tao ticket
                              </p>
                              <button
                                onClick={handleLinkDiscord}
                                className="mt-2 rounded-[10px] bg-[#5865F2] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#7289DA]"
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
                              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[#FF4D4F]" />
                              <div className="flex-1">
                                <p className="text-sm text-[#FFB3B3]">
                                  Ban can tham gia server Discord
                                </p>
                                <button
                                  onClick={handleJoinServer}
                                  className="mt-2 flex items-center gap-2 rounded-[10px] bg-[#5865F2] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#7289DA]"
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
                            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#3DDC84] px-4 py-3 text-sm font-medium text-[#050505] transition-all hover:bg-[#4EE67A] disabled:opacity-50"
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
                          <div className="flex items-center gap-3 rounded-[12px] bg-[#3DDC84]/10 p-3">
                            <CheckCircle className="h-5 w-5 flex-shrink-0 text-[#3DDC84]" />
                            <div>
                              <p className="text-sm text-[#3DDC84]">
                                Da tao ticket
                              </p>
                              <p className="text-xs text-[#B5B5B5]">
                                Channel: {order.ticketChannelName}
                              </p>
                              {order.ticketStatus && (
                                <p className="mt-1 text-xs text-[#2F9BE6]">
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
                                className="flex-1 rounded-[12px] bg-[#1E1E1E] px-4 py-2 text-sm font-medium text-white"
                              >
                                Khong
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order._id)}
                                disabled={submitting === order._id}
                                className="flex-1 rounded-[12px] bg-[#FF4D4F] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
                              className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-[#FF4D4F]/30 px-4 py-2.5 text-sm font-medium text-[#FF4D4F] transition-all hover:bg-[#FF4D4F]/10"
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
        <div className="min-h-screen bg-[#050505]">
          <div className="flex items-center justify-center pt-32">
            <Loader2 className="h-8 w-8 animate-spin text-[#2F9BE6]" />
          </div>
        </div>
      }
    >
      <DonHangPage />
    </Suspense>
  );
}
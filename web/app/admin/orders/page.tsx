"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";
import { useAuthViet } from "@/app/context/AuthVietContext";
import { isAdminRole } from "@/lib/authRole";
import { AlertCircle, CheckCircle2, Clock3, RefreshCcw, Search, ShieldAlert, XCircle } from "lucide-react";

type Order = {
 _id: string;
 orderId?: string;
 discordUsername?: string;
 discordId?: string;
 customerEmail?: string;
 totalAmount?: number;
 status?: string;
 paymentStatus?: string;
 createdAt?: string;
 items?: Array<{ name?: string; quantity?: number; packQuantity?: number }>;
 txnId?: string;
};

const statusTone = (status?: string) => {
 switch (status) {
 case "hoan_thanh":
 return "bg-white/30 backdrop-blur-sm text-emerald-700 border-green-400/20";
 case "huy":
 return "bg-[#FF4D4F]/15 text-red-400 border-red-500/30";
 case "da_thanh_toan":
 return "bg-white/30 backdrop-blur-sm text-blue-300/80 border-amber-400/20";
 default:
 return "bg-white/30 backdrop-blur-sm text-blue-300/80 border-blue-400/20";
 }
};

const statusLabels = {
 "cho_xu_ly": "Chờ xử lý",
 "da_thanh_toan": "Đã thanh toán",
 "da_tao_ticket": "Đã tạo ticket",
 "dang_giao": "Đang giao",
 "hoan_thanh": "Hoàn thành",
 "huy": "Đã hủy",
};

const formatOrderItem = (item: { name?: string; quantity?: number; packQuantity?: number }) => {
 const packQty = Math.max(1, Number(item.packQuantity) || 1);
 const orderQty = Math.max(1, Number(item.quantity) || 1);
 return `${item.name || "Item"} (x${packQty * orderQty})`;
};

const formatPrice = (amount: number): string => {
 return Number(amount || 0).toLocaleString("vi-VN") + " VND";
};

export default function AdminOrdersPage() {
 const { user, token, isLoading } = useAuthViet();
 const [orders, setOrders] = useState<Order[]>([]);
 const [query, setQuery] = useState("");
 const [status, setStatus] = useState("All");
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [mutatingId, setMutatingId] = useState("");

 const loadOrders = async () => {
 if (!token) return;
 setLoading(true);
 setError("");
 try {
 const res = await fetch("/api/admin/orders", {
 headers: { Authorization: `Bearer ${token}` },
 cache: "no-store",
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data?.message || "Failed to load orders");
 setOrders(Array.isArray(data?.orders) ? data.orders : []);
 } catch (err) {
 setError(err instanceof Error ? err.message : "Failed to load orders");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (token && isAdminRole(user?.vaiTro)) {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 void loadOrders();
 } else {
 setLoading(false);
 }
 }, [token, user?.vaiTro]);

 const filtered = useMemo(() => {
 const needle = query.trim().toLowerCase();
 return orders.filter((order) => {
 const statusOk = status === "All" || (order.status || "cho_xu_ly") === status;
 if (!statusOk) return false;
 if (!needle) return true;
 return [
 order.orderId,
 order.discordUsername,
 order.discordId,
 order.customerEmail,
 order.txnId,
 ...(order.items || []).map((item) => item.name || ""),
 ]
 .join(" ")
 .toLowerCase()
 .includes(needle);
 });
 }, [orders, query, status]);

 const updateStatus = async (id: string, nextStatus: string) => {
 if (!token) return;
 setMutatingId(id);
 setError("");
 try {
 const res = await fetch(`/api/admin/order/${id}`, {
 method: "PUT",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${token}`,
 },
 body: JSON.stringify({ status: nextStatus }),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data?.message || "Failed to update order");
 setOrders((prev) => prev.map((order) => (order._id === id ? data.order : order)));
 } catch (err) {
 setError(err instanceof Error ? err.message : "Failed to update order");
 } finally {
 setMutatingId("");
 }
 };

 if (!user && !isLoading) {
 return (
 <div className="min-h-screen bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] text-[#071326]/90/90">
 <Navbar />
 <div className="mx-auto max-w-md px-4 py-24">
 <div className="rounded-[18px] border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] p-8 text-center">
 <AlertCircle className="mx-auto mb-4 h-10 w-10 text-blue-300/80" />
 <h1 className="text-2xl font-semibold">Yêu cầu đăng nhập admin</h1>
 <a href="/login" className="mt-6 inline-flex rounded-[14px] bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] px-5 py-3 font-medium">
 Đăng Nhập
 </a>
 </div>
 </div>
 </div>
 );
 }

 if (user && !isAdminRole(user.vaiTro)) {
 return (
 <div className="min-h-screen bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] text-[#071326]/90/90">
 <Navbar />
 <div className="mx-auto max-w-md px-4 py-24">
 <div className="rounded-[18px] border border-red-400/20 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] p-8 text-center">
 <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-red-400" />
 <h1 className="text-2xl font-semibold">Bạn không có quyền truy cập</h1>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] text-[#071326]/90/90">
 <Navbar />
 <main className="mx-auto max-w-7xl px-4 py-8">
 <div className="mb-4">
 <BackButton href="/admin" label="Trang Admin" variant="back" />
 </div>
 <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
 <div>
 <h1 className="text-3xl font-semibold">Đơn Hàng</h1>
 <p className="mt-1 text-sm text-slate-600">Đơn hàng thực. Không phải dữ liệu giả.</p>
 </div>
 <button
 onClick={() => void loadOrders()}
 className="inline-flex items-center gap-2 rounded-[14px] border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] px-4 py-2 text-sm"
 >
 <RefreshCcw className="h-4 w-4" />
 Làm Mới
 </button>
 </div>

 <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
 <label className="flex items-center gap-3 rounded-[16px] border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] px-4 py-3">
 <Search className="h-4 w-4 text-slate-500" />
 <input
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Tìm kiếm đơn hàng / người dùng / mục / giao dịch"
 className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
 />
 </label>
 <select
 value={status}
 onChange={(e) => setStatus(e.target.value)}
 className="rounded-[16px] border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] px-4 py-3 text-sm outline-none"
 >
 <option value="All">Tất cả trạng thái</option>
 <option value="cho_xu_ly">Chờ xử lý</option>
 <option value="da_thanh_toan">Đã thanh toán</option>
 <option value="hoan_thanh">Hoàn thành</option>
 <option value="huy">Đã hủy</option>
 </select>
 </div>

 {error ? <div className="mb-4 rounded-[16px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

 <div className="overflow-hidden rounded-[18px] border border-white/40 bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)]">
 <div className="grid grid-cols-[1.1fr_1fr_140px_140px_180px] gap-4 border-b border-white/40 px-5 py-4 text-xs uppercase tracking-wide text-slate-500">
 <div>Đơn Hàng</div>
 <div>Khách Hàng</div>
 <div>Tổng</div>
 <div>Trạng Thái</div>
 <div>Thao Tác</div>
 </div>
 {loading ? (
 <div className="px-5 py-10 text-sm text-slate-600">Đang tải đơn hàng...</div>
 ) : filtered.length === 0 ? (
 <div className="px-5 py-10 text-sm text-slate-600">Không tìm thấy đơn hàng.</div>
 ) : (
 filtered.map((order) => (
 <div key={order._id} className="grid grid-cols-[1.1fr_1fr_140px_140px_180px] gap-4 border-b border-white/40 px-5 py-4 last:border-b-0">
 <div>
 <div className="font-medium text-[#071326]/90/90">{order.orderId || order._id}</div>
 <div className="mt-1 text-xs text-slate-500">
 {(order.items || []).map(formatOrderItem).join(", ") || "Không có mục"}
 </div>
 <div className="mt-1 text-xs text-slate-600/50">
 {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "-"}
 </div>
 </div>
 <div>
 <div className="text-sm text-[#071326]/90/90">{order.discordUsername || "Người dùng không xác định"}</div>
 <div className="text-xs text-slate-500">{order.discordId || "-"}</div>
 {order.customerEmail && <div className="text-xs text-slate-600/50">{order.customerEmail}</div>}
 {order.txnId && <div className="text-xs text-slate-600/50">TXN: {order.txnId}</div>}
 </div>
 <div className="text-sm font-medium text-emerald-300">
 {formatPrice(order.totalAmount || 0)}
 </div>
 <div>
 <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${statusTone(order.status)}`}>
 {statusLabels[order.status as keyof typeof statusLabels] || "Chờ xử lý"}
 </span>
 </div>
 <div className="flex flex-wrap gap-2">
 <button
 disabled={mutatingId === order._id}
 onClick={() => void updateStatus(order._id, "hoan_thanh")}
 className="inline-flex items-center gap-1 rounded-[14px] bg-white/30 backdrop-blur-sm px-2.5 py-1.5 text-xs text-emerald-700"
 >
 <CheckCircle2 className="h-3.5 w-3.5" />
 Duyệt
 </button>
 <button
 disabled={mutatingId === order._id}
 onClick={() => void updateStatus(order._id, "da_thanh_toan")}
 className="inline-flex items-center gap-1 rounded-[14px] bg-white/30 backdrop-blur-sm px-2.5 py-1.5 text-xs text-blue-300/80"
 >
 <Clock3 className="h-3.5 w-3.5" />
 Giữ
 </button>
 <button
 disabled={mutatingId === order._id}
 onClick={() => void updateStatus(order._id, "huy")}
 className="inline-flex items-center gap-1 rounded-[14px] bg-[#FF4D4F]/15 px-2.5 py-1.5 text-xs text-red-400"
 >
 <XCircle className="h-3.5 w-3.5" />
 Từ Chối
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </main>
 </div>
 );
}




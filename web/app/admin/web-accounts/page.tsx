"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthViet } from "@/app/context/AuthVietContext";
import { isAdminRole } from "@/lib/authRole";
import { Loader2, Key, ListOrdered, AlertTriangle, RefreshCcw, X, PlusCircle, Trash2, ArrowLeft } from "lucide-react";
import Navbar from "@/app/components/Navbar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface WebAccount {
    _id: string;
    tenDangNhap: string;
    email: string;
    soDuVnd: number;
    vaiTro: string;
    dangHoatDong: boolean;
    ngayTao: string;
    discordId: string;
    discordTenHienThi: string;
    referralCode: string;
}

interface OrderItem {
    name: string;
    quantity: number;
    priceVnd: number;
    lineTotalVnd: number;
}

interface Order {
    _id: string;
    orderId: string;
    totalVnd: number;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    ticketStatus: string;
    createdAt: string;
    items: OrderItem[];
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    cho_xu_ly: { label: "Chờ xử lý", cls: "bg-yellow-100 text-yellow-700" },
    da_thanh_toan: { label: "Đã TT", cls: "bg-blue-100 text-blue-700" },
    da_tao_ticket: { label: "Đã tạo ticket", cls: "bg-indigo-100 text-indigo-700" },
    dang_giao: { label: "Đang giao", cls: "bg-purple-100 text-purple-700" },
    hoan_thanh: { label: "Hoàn thành", cls: "bg-emerald-100 text-emerald-700" },
    huy: { label: "Đã hủy", cls: "bg-red-100 text-red-700" },
};

function formatVnd(n: number | undefined | null): string {
    return (n || 0).toLocaleString("vi-VN");
}

export default function WebAccountsAdminPage() {
    const router = useRouter();
    const { token, user, isLoading: authLoading } = useAuthViet();

    const [accounts, setAccounts] = useState<WebAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedAccount, setSelectedAccount] = useState<WebAccount | null>(null);

    // Password modal
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [passwordUpdating, setPasswordUpdating] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState({ text: "", type: "" });

    // Orders modal
    const [ordersModalOpen, setOrdersModalOpen] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    // Topup modal
    const [topupModalOpen, setTopupModalOpen] = useState(false);
    const [topupAmount, setTopupAmount] = useState("");
    const [topupReason, setTopupReason] = useState("");
    const [topupUpdating, setTopupUpdating] = useState(false);
    const [topupMsg, setTopupMsg] = useState({ text: "", type: "" });

    // Delete state
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchAccounts = useCallback(async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/admin/web-accounts`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.thongBao || "Lỗi tải dữ liệu");
            setAccounts(data.data || []);
        } catch (err: any) {
            if (!isPolling) setError(err.message);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!authLoading && user && isAdminRole(user.vaiTro)) {
            fetchAccounts();
            // Polling 5s
            const id = setInterval(() => fetchAccounts(true), 5000);
            return () => clearInterval(id);
        } else if (!authLoading && (!user || !isAdminRole(user.vaiTro))) {
            router.replace("/");
        }
    }, [authLoading, user, fetchAccounts, router]);

    // --- Password ---
    const handleOpenPasswordModal = (acc: WebAccount) => {
        setSelectedAccount(acc);
        setNewPassword("");
        setPasswordMsg({ text: "", type: "" });
        setPasswordModalOpen(true);
    };
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount || newPassword.length < 6) return;
        setPasswordUpdating(true);
        setPasswordMsg({ text: "", type: "" });
        try {
            const res = await fetch(`${API_BASE}/api/admin/web-accounts/${selectedAccount._id}/doi-mat-khau`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.thongBao || "Lỗi");
            setPasswordMsg({ text: "Cập nhật thành công!", type: "success" });
            setNewPassword("");
        } catch (err: any) {
            setPasswordMsg({ text: err.message, type: "error" });
        } finally {
            setPasswordUpdating(false);
        }
    };

    // --- Orders ---
    const handleOpenOrdersModal = async (acc: WebAccount) => {
        setSelectedAccount(acc);
        setOrdersModalOpen(true);
        setOrdersLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/web-accounts/${acc._id}/don-hang`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error("Lỗi lấy đơn hàng");
            setOrders(data.data || []);
        } catch {
            setOrders([]);
        } finally {
            setOrdersLoading(false);
        }
    };

    // --- Topup ---
    const handleOpenTopupModal = (acc: WebAccount) => {
        setSelectedAccount(acc);
        setTopupAmount("");
        setTopupReason("");
        setTopupMsg({ text: "", type: "" });
        setTopupModalOpen(true);
    };
    const handleTopup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount || !topupAmount) return;
        setTopupUpdating(true);
        setTopupMsg({ text: "", type: "" });
        try {
            const res = await fetch(`${API_BASE}/api/admin/web-accounts/${selectedAccount._id}/cong-tien`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ amount: Number(topupAmount), reason: topupReason })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.thongBao || "Lỗi cộng tiền");
            setTopupMsg({ text: data.thongBao || "Cộng tiền thành công!", type: "success" });
            setTopupAmount("");
            setTopupReason("");
            fetchAccounts(true);
        } catch (err: any) {
            setTopupMsg({ text: err.message, type: "error" });
        } finally {
            setTopupUpdating(false);
        }
    };

    // --- Delete ---
    const handleDelete = async (acc: WebAccount) => {
        if (!confirm(`Bạn có chắc muốn xóa tài khoản "${acc.tenDangNhap}"? Hành động này không thể hoàn tác!`)) return;
        setDeletingId(acc._id);
        try {
            const res = await fetch(`${API_BASE}/api/admin/web-accounts/${acc._id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.thongBao || "Lỗi xóa");
            setAccounts(prev => prev.filter(a => a._id !== acc._id));
        } catch (err: any) {
            alert(err.message);
        } finally {
            setDeletingId(null);
        }
    };

    if (authLoading || (loading && accounts.length === 0)) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <Navbar />

            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.push("/admin")} className="p-2 bg-white rounded-lg shadow hover:bg-slate-50 active:scale-95 transition-all">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold truncate">Quản Trị Tài Khoản Web</h1>
                        <p className="text-xs text-slate-500 mt-0.5">{accounts.length} tài khoản</p>
                    </div>
                    <button onClick={() => fetchAccounts()} className="p-2 bg-white rounded-lg shadow hover:bg-slate-50 active:scale-95 transition-all">
                        <RefreshCcw className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100 text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Mobile: Card layout / Desktop: Table */}
                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-xl shadow border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Tên đăng nhập</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Discord</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Vai trò</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Số dư (VND)</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Ngày tạo</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {accounts.map(acc => (
                                    <tr key={acc._id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium">{acc.tenDangNhap}</td>
                                        <td className="px-4 py-3 text-slate-500">{acc.discordTenHienThi || "Chưa liên kết"}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${acc.vaiTro === 'quan_tri' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {acc.vaiTro === 'quan_tri' ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-emerald-600 font-semibold">{formatVnd(acc.soDuVnd)} đ</td>
                                        <td className="px-4 py-3 text-slate-500">{new Date(acc.ngayTao).toLocaleDateString("vi-VN")}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => handleOpenOrdersModal(acc)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded" title="Đơn Hàng">
                                                    <ListOrdered className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleOpenTopupModal(acc)} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded" title="Cộng Tiền">
                                                    <PlusCircle className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleOpenPasswordModal(acc)} className="p-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded" title="Đổi Mật Khẩu">
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                {acc.vaiTro !== 'quan_tri' && (
                                                    <button onClick={() => handleDelete(acc)} disabled={deletingId === acc._id} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded disabled:opacity-50" title="Xóa">
                                                        {deletingId === acc._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {accounts.length === 0 && (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Không có tài khoản nào</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                    {accounts.map(acc => (
                        <div key={acc._id} className="bg-white rounded-xl shadow border border-slate-100 p-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-base truncate">{acc.tenDangNhap}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Discord: {acc.discordTenHienThi || "Chưa liên kết"}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${acc.vaiTro === 'quan_tri' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {acc.vaiTro === 'quan_tri' ? 'Admin' : 'User'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between mb-3 bg-slate-50 rounded-lg px-3 py-2">
                                <span className="text-xs text-slate-500">Số dư</span>
                                <span className="text-sm font-bold text-emerald-600">{formatVnd(acc.soDuVnd)} đ</span>
                            </div>

                            <div className="text-xs text-slate-400 mb-3">
                                Ngày tạo: {new Date(acc.ngayTao).toLocaleDateString("vi-VN")}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <button onClick={() => handleOpenOrdersModal(acc)} className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium active:scale-95 transition-all">
                                    <ListOrdered className="w-3.5 h-3.5" /> Đơn hàng
                                </button>
                                <button onClick={() => handleOpenTopupModal(acc)} className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-medium active:scale-95 transition-all">
                                    <PlusCircle className="w-3.5 h-3.5" /> Cộng tiền
                                </button>
                                <button onClick={() => handleOpenPasswordModal(acc)} className="flex items-center gap-1 px-3 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-xs font-medium active:scale-95 transition-all">
                                    <Key className="w-3.5 h-3.5" /> Đổi pass
                                </button>
                                {acc.vaiTro !== 'quan_tri' && (
                                    <button onClick={() => handleDelete(acc)} disabled={deletingId === acc._id} className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-xs font-medium active:scale-95 transition-all disabled:opacity-50">
                                        {deletingId === acc._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Xóa
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {accounts.length === 0 && (
                        <div className="text-center text-slate-500 py-12">Không có tài khoản nào</div>
                    )}
                </div>
            </div>

            {/* Password Modal */}
            {passwordModalOpen && selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md overflow-hidden">
                        <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-semibold text-sm">Đổi mật khẩu: {selectedAccount.tenDangNhap}</h3>
                            <button onClick={() => setPasswordModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-5">
                            {passwordMsg.text && (
                                <div className={`mb-4 p-3 rounded-lg text-sm ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {passwordMsg.text}
                                </div>
                            )}
                            <form onSubmit={handleChangePassword}>
                                <label className="block text-sm font-medium mb-1.5">Mật khẩu mới</label>
                                <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Nhập mật khẩu mới..." required minLength={6}
                                    className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                <p className="text-xs text-slate-500 mt-1">Ít nhất 6 ký tự.</p>
                                <div className="flex justify-end gap-2 mt-5">
                                    <button type="button" onClick={() => setPasswordModalOpen(false)} className="px-4 py-2.5 border rounded-lg hover:bg-slate-50 text-sm">Hủy</button>
                                    <button type="submit" disabled={passwordUpdating || newPassword.length < 6} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                                        {passwordUpdating ? "Đang lưu..." : "Cập nhật"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Topup Modal */}
            {topupModalOpen && selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md overflow-hidden">
                        <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-semibold text-sm">Cộng tiền: {selectedAccount.tenDangNhap}</h3>
                            <button onClick={() => setTopupModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-5">
                            {topupMsg.text && (
                                <div className={`mb-4 p-3 rounded-lg text-sm ${topupMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {topupMsg.text}
                                </div>
                            )}
                            <form onSubmit={handleTopup}>
                                <label className="block text-sm font-medium mb-1.5">Số tiền cộng (VND)</label>
                                <input type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)}
                                    placeholder="Ví dụ: 50000" required min={1}
                                    className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                                <label className="block text-sm font-medium mb-1.5 mt-3">Lý do (không bắt buộc)</label>
                                <input type="text" value={topupReason} onChange={(e) => setTopupReason(e.target.value)}
                                    placeholder="Ví dụ: Thưởng event..."
                                    className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
                                <div className="flex justify-end gap-2 mt-5">
                                    <button type="button" onClick={() => setTopupModalOpen(false)} className="px-4 py-2.5 border rounded-lg hover:bg-slate-50 text-sm">Hủy</button>
                                    <button type="submit" disabled={topupUpdating || !topupAmount} className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm">
                                        {topupUpdating ? "Đang xử lý..." : "Cộng Tiền"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders Modal */}
            {ordersModalOpen && selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl overflow-hidden max-h-[90vh] sm:max-h-[85vh] flex flex-col">
                        <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50 flex-shrink-0">
                            <h3 className="font-semibold text-sm">Đơn hàng: {selectedAccount.tenDangNhap}</h3>
                            <button onClick={() => setOrdersModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
                            {ordersLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                            ) : orders.length === 0 ? (
                                <p className="text-center text-slate-500 py-8 text-sm">Chưa có đơn hàng nào</p>
                            ) : (
                                <div className="space-y-3">
                                    {orders.map(order => (
                                        <div key={order._id} className="border rounded-xl p-4 bg-slate-50/50">
                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                <div className="min-w-0">
                                                    <p className="font-mono text-xs font-semibold">{order.orderId}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-bold text-emerald-600">{formatVnd(order.totalVnd || order.totalAmount)} đ</p>
                                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[order.status]?.cls || 'bg-slate-100 text-slate-500'}`}>
                                                        {STATUS_MAP[order.status]?.label || order.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-2 space-y-1.5">
                                                {(order.items || []).map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs bg-white rounded-lg px-3 py-2 border border-slate-100">
                                                        <span className="truncate pr-2 text-slate-700">{item.name} <span className="text-slate-400">x{item.quantity}</span></span>
                                                        <span className="font-medium text-slate-600 flex-shrink-0">{formatVnd(item.lineTotalVnd)} đ</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

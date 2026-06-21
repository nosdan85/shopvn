"use client";

import { useState, useEffect } from "react";
import { useAuthViet } from "@/app/context/AuthVietContext";
import { isAdminRole } from "@/lib/authRole";
import { Loader2, Key, ListOrdered, AlertTriangle, CheckCircle, RefreshCcw, X, PlusCircle } from "lucide-react";
import BackButton from "@/app/components/BackButton";
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
}

interface Order {
    _id: string;
    orderId: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    items: any[];
}

export default function WebAccountsAdminPage() {
    const { token, user, isLoading: authLoading } = useAuthViet();
    
    const [accounts, setAccounts] = useState<WebAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modals state
    const [selectedAccount, setSelectedAccount] = useState<WebAccount | null>(null);
    
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [passwordUpdating, setPasswordUpdating] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState({ text: "", type: "" });

    const [ordersModalOpen, setOrdersModalOpen] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    const [topupModalOpen, setTopupModalOpen] = useState(false);
    const [topupAmount, setTopupAmount] = useState("");
    const [topupReason, setTopupReason] = useState("");
    const [topupUpdating, setTopupUpdating] = useState(false);
    const [topupMsg, setTopupMsg] = useState({ text: "", type: "" });

    useEffect(() => {
        if (!authLoading && user && isAdminRole(user.vaiTro)) {
            fetchAccounts();
        } else if (!authLoading && (!user || !isAdminRole(user.vaiTro))) {
            window.location.href = "/";
        }
    }, [authLoading, user]);

    const fetchAccounts = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/admin/web-accounts`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.thongBao || "Lỗi tải dữ liệu");
            setAccounts(data.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.thongBao || "Lỗi cập nhật mật khẩu");
            
            setPasswordMsg({ text: "Cập nhật thành công!", type: "success" });
            setNewPassword("");
        } catch (err: any) {
            setPasswordMsg({ text: err.message, type: "error" });
        } finally {
            setPasswordUpdating(false);
        }
    };

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
        } catch (err: any) {
            console.error(err);
        } finally {
            setOrdersLoading(false);
        }
    };

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
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ amount: Number(topupAmount), reason: topupReason })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.thongBao || "Lỗi cộng tiền");
            
            setTopupMsg({ text: data.thongBao || "Cộng tiền thành công!", type: "success" });
            setTopupAmount("");
            setTopupReason("");
            fetchAccounts(); // Refresh balance
        } catch (err: any) {
            setTopupMsg({ text: err.message, type: "error" });
        } finally {
            setTopupUpdating(false);
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
            
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center gap-4 mb-6">
                    <BackButton href="/admin" label="Quản Trị" />
                    <h1 className="text-2xl font-bold">Quản Trị Tài Khoản Web</h1>
                    <button onClick={fetchAccounts} className="ml-auto p-2 bg-white rounded-md shadow hover:bg-slate-50">
                        <RefreshCcw className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100">
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Tên đăng nhập</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Vai trò</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Số dư ví (VND)</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Discord ID</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Ngày tạo</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {accounts.map(acc => (
                                    <tr key={acc._id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 font-medium">{acc.tenDangNhap}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${acc.vaiTro === 'quan_tri' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {acc.vaiTro === 'quan_tri' ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-emerald-600 font-semibold">
                                            {(acc.soDuVnd || 0).toLocaleString('vi-VN')} đ
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{acc.discordId || "Chưa l/k"}</td>
                                        <td className="px-4 py-3 text-slate-500">{new Date(acc.ngayTao).toLocaleDateString("vi-VN")}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleOpenOrdersModal(acc)}
                                                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded"
                                                    title="Xem Đơn Hàng"
                                                >
                                                    <ListOrdered className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenTopupModal(acc)}
                                                    className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded"
                                                    title="Cộng Tiền"
                                                >
                                                    <PlusCircle className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenPasswordModal(acc)}
                                                    className="p-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded"
                                                    title="Đổi Mật Khẩu"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {accounts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Không có tài khoản nào</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            {passwordModalOpen && selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-semibold">Đổi mật khẩu: {selectedAccount.tenDangNhap}</h3>
                            <button onClick={() => setPasswordModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-6">
                            {passwordMsg.text && (
                                <div className={`mb-4 p-3 rounded text-sm ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {passwordMsg.text}
                                </div>
                            )}
                            <form onSubmit={handleChangePassword}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Mật khẩu mới</label>
                                    <input 
                                        type="text" 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Nhập mật khẩu mới..."
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                        minLength={6}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Ít nhất 6 ký tự. Mật khẩu mới sẽ tự động được mã hóa.</p>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button type="button" onClick={() => setPasswordModalOpen(false)} className="px-4 py-2 border rounded hover:bg-slate-50">Hủy</button>
                                    <button type="submit" disabled={passwordUpdating || newPassword.length < 6} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-semibold">Cộng tiền: {selectedAccount.tenDangNhap}</h3>
                            <button onClick={() => setTopupModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-6">
                            {topupMsg.text && (
                                <div className={`mb-4 p-3 rounded text-sm ${topupMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {topupMsg.text}
                                </div>
                            )}
                            <form onSubmit={handleTopup}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Số tiền cộng (VND)</label>
                                    <input 
                                        type="number" 
                                        value={topupAmount}
                                        onChange={(e) => setTopupAmount(e.target.value)}
                                        placeholder="Ví dụ: 50000"
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        required
                                        min={1}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1">Lý do / Ghi chú (Không bắt buộc)</label>
                                    <input 
                                        type="text" 
                                        value={topupReason}
                                        onChange={(e) => setTopupReason(e.target.value)}
                                        placeholder="Ví dụ: Thưởng event..."
                                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button type="button" onClick={() => setTopupModalOpen(false)} className="px-4 py-2 border rounded hover:bg-slate-50">Hủy</button>
                                    <button type="submit" disabled={topupUpdating || !topupAmount} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="font-semibold">Đơn hàng của: {selectedAccount.tenDangNhap}</h3>
                            <button onClick={() => setOrdersModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {ordersLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                            ) : orders.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">Chưa có đơn hàng nào</p>
                            ) : (
                                <div className="space-y-4">
                                    {orders.map(order => (
                                        <div key={order._id} className="border rounded-lg p-4 bg-slate-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-mono text-sm font-semibold">{order.orderId}</p>
                                                    <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-600">{(order.totalAmount || 0).toLocaleString('vi-VN')} VND</p>
                                                    <p className="text-xs text-slate-500">Trạng thái: {order.status}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <p className="text-xs font-semibold mb-1">Sản phẩm:</p>
                                                <ul className="text-sm space-y-1">
                                                    {(order.items || []).map((item, idx) => (
                                                        <li key={idx} className="flex justify-between">
                                                            <span className="truncate pr-2">{item.name || item.productName} (x{item.quantity})</span>
                                                        </li>
                                                    ))}
                                                </ul>
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

"use client";

import { useEffect, useState } from "react";
import { useAuthViet } from "@/app/context/AuthVietContext";
import Navbar from "../../components/Navbar";
import BackButton from "../../components/BackButton";
import { isAdminRole } from "@/lib/authRole";
import { TrendingUp, Package, ShoppingCart, ImageIcon, Loader2, RefreshCw } from "lucide-react";

interface SalesData {
  today: { orders: number; revenue: number };
  week: { orders: number; revenue: number };
  month: { orders: number; revenue: number };
}

interface Order {
  orderId: string;
  discordUsername: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  robloxUsername?: string;
}

interface Product {
  _id: string;
  revenue: number;
  quantity: number;
}

interface ProofStats {
  totalProofs: number;
  weekProofs: number;
  recentProofs: Array<{ id: string; robloxUsername?: string; totalAmount: number; imageUrls: string[] }>;
}

export default function AnalyticsPage() {
  const { user, token, isLoading } = useAuthViet();
  const [sales, setSales] = useState<SalesData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [proofStats, setProofStats] = useState<ProofStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      const [salesRes, ordersRes, productsRes, proofsRes] = await Promise.all([
        fetch("/api/admin/analytics/sales", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/admin/analytics/recent-orders", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/admin/analytics/top-products", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/admin/analytics/proof-stats", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      ]);

      const [salesData, ordersData, productsData, proofsData] = await Promise.all([
        salesRes.json(),
        ordersRes.json(),
        productsRes.json(),
        proofsRes.json()
      ]);

      setSales(salesData);
      setOrders(ordersData.orders || []);
      setProducts(productsData.products || []);
      setProofStats(proofsData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isAdminRole(user?.vaiTro) && token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchAnalytics();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      const interval = setInterval(() => void fetchAnalytics(), 30000);
      return () => clearInterval(interval);
    }
  }, [isLoading, user, token]);

  if (isLoading || !isAdminRole(user?.vaiTro)) {
    return (
      <div className="min-h-screen bg-[#071326]">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          ) : (
            <p className="text-slate-600">Bạn không có quyền truy cập</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071326] text-[#071326]/90">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4">
          <BackButton href="/admin" label="Trang Admin" variant="back" />
        </div>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Thống Kê</h1>
          <button
            onClick={() => void fetchAnalytics()}
            className="flex items-center gap-2 rounded-[14px] bg-white/60 px-4 py-2 text-sm hover:bg-[#1E1E1E]"
          >
            <RefreshCw className="h-4 w-4" />
            Làm Mới
          </button>
        </div>

        {sales && (
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: "Hôm Nay", data: sales.today, icon: TrendingUp },
              { label: "Tuần Này", data: sales.week, icon: ShoppingCart },
              { label: "Tháng Này", data: sales.month, icon: Package }
            ].map(({ label, data, icon: Icon }) => (
              <div key={label} className="rounded-[16px] border border-white/50 bg-[#071326] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-green-600">{data.revenue.toLocaleString('vi-VN')} VND</p>
                    <p className="text-xs text-slate-500">{data.orders} đơn hàng</p>
                  </div>
                  <Icon className="h-8 w-8 text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-8 rounded-[16px] border border-white/50 bg-[#071326] p-6">
          <h2 className="mb-4 text-xl font-semibold">Đơn Hàng Gần Đây</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/50">
                  <th className="px-4 py-2 text-left text-slate-600">Mã Đơn</th>
                  <th className="px-4 py-2 text-left text-slate-600">Roblox</th>
                  <th className="px-4 py-2 text-left text-slate-600">Số Tiền</th>
                  <th className="px-4 py-2 text-left text-slate-600">Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.orderId} className="border-b border-white/50 hover:bg-white/60">
                    <td className="px-4 py-2 font-mono text-xs">{order.orderId}</td>
                    <td className="px-4 py-2">{order.robloxUsername || "-"}</td>
                    <td className="px-4 py-2">{order.totalAmount.toLocaleString('vi-VN')} VND</td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-1 text-xs ${order.paymentStatus === "paid" ? "bg-[#3DDC84]/20 text-green-600" : "bg-[#2F9BE6]/20 text-slate-600"}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {products.length > 0 && (
          <div className="mb-8 rounded-[16px] border border-white/50 bg-[#071326] p-6">
            <h2 className="mb-4 text-xl font-semibold">Sản Phẩm Bán Chạy</h2>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p._id} className="flex items-center justify-between rounded-[14px] border border-white/50 bg-white/70 p-3">
                  <span className="text-sm">{p._id}</span>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{p.revenue.toLocaleString('vi-VN')} VND</p>
                    <p className="text-xs text-slate-500">{p.quantity} bán</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {proofStats && (
          <div className="rounded-[16px] border border-white/50 bg-[#071326] p-6">
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Đánh Giá
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-3">
              <div className="rounded-[14px] bg-white/70 p-4">
                <p className="text-xs text-slate-600">Tổng Đánh Giá</p>
                <p className="mt-1 text-2xl font-bold text-slate-600">{proofStats.totalProofs}</p>
              </div>
              <div className="rounded-[14px] bg-white/70 p-4">
                <p className="text-xs text-slate-600">Tuần Này</p>
                <p className="mt-1 text-2xl font-bold text-slate-600">{proofStats.weekProofs}</p>
              </div>
            </div>
            {proofStats.recentProofs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Đánh Giá Gần Đây</p>
                {proofStats.recentProofs.map((proof) => (
                  <div key={proof.id} className="flex items-center justify-between rounded-[14px] border border-white/50 bg-white/70 p-3">
                    <div>
                      <p className="text-sm font-medium">{proof.robloxUsername || "Không rõ"}</p>
                      <p className="text-xs text-slate-500">{proof.totalAmount.toLocaleString('vi-VN')} VND</p>
                    </div>
                    <span className="text-xs text-slate-600">{proof.imageUrls.length} hình ảnh</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-xs text-slate-500">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
      </div>
    </div>
  );
}




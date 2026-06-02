"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/Navbar";
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
  const { user, token, isLoading } = useAuth();
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
    if (!isLoading && user?.isOwner && token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchAnalytics();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      const interval = setInterval(() => void fetchAnalytics(), 30000);
      return () => clearInterval(interval);
    }
  }, [isLoading, user, token]);

  if (isLoading || !user?.isOwner) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#2F9BE6]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <button
            onClick={() => void fetchAnalytics()}
            className="flex items-center gap-2 rounded-[14px] bg-[#111111] px-4 py-2 text-sm hover:bg-[#1E1E1E]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {sales && (
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: "Today", data: sales.today, icon: TrendingUp },
              { label: "This Week", data: sales.week, icon: ShoppingCart },
              { label: "This Month", data: sales.month, icon: Package }
            ].map(({ label, data, icon: Icon }) => (
              <div key={label} className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#B5B5B5]/80">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-[#3DDC84]">${data.revenue.toFixed(2)}</p>
                    <p className="text-xs text-[#B5B5B5]/60">{data.orders} orders</p>
                  </div>
                  <Icon className="h-8 w-8 text-[#2F9BE6]" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-8 rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-6">
          <h2 className="mb-4 text-xl font-semibold">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  <th className="px-4 py-2 text-left text-[#B5B5B5]/80">Order ID</th>
                  <th className="px-4 py-2 text-left text-[#B5B5B5]/80">Roblox</th>
                  <th className="px-4 py-2 text-left text-[#B5B5B5]/80">Amount</th>
                  <th className="px-4 py-2 text-left text-[#B5B5B5]/80">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.orderId} className="border-b border-[#1E1E1E] hover:bg-[#111111]/50">
                    <td className="px-4 py-2 font-mono text-xs">{order.orderId}</td>
                    <td className="px-4 py-2">{order.robloxUsername || "-"}</td>
                    <td className="px-4 py-2">${order.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-1 text-xs ${order.paymentStatus === "paid" ? "bg-[#3DDC84]/20 text-[#3DDC84]" : "bg-[#2F9BE6]/20 text-[#2F9BE6]"}`}>
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
          <div className="mb-8 rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-6">
            <h2 className="mb-4 text-xl font-semibold">Top Products</h2>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p._id} className="flex items-center justify-between rounded-[14px] border border-[#1E1E1E] bg-[#161616] p-3">
                  <span className="text-sm">{p._id}</span>
                  <div className="text-right">
                    <p className="font-semibold text-[#3DDC84]">${p.revenue.toFixed(2)}</p>
                    <p className="text-xs text-[#B5B5B5]/60">{p.quantity} sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {proofStats && (
          <div className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-6">
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Proofs
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-3">
              <div className="rounded-[14px] bg-[#161616] p-4">
                <p className="text-xs text-[#B5B5B5]/80">Total Proofs</p>
                <p className="mt-1 text-2xl font-bold text-[#2F9BE6]">{proofStats.totalProofs}</p>
              </div>
              <div className="rounded-[14px] bg-[#161616] p-4">
                <p className="text-xs text-[#B5B5B5]/80">This Week</p>
                <p className="mt-1 text-2xl font-bold text-[#2F9BE6]">{proofStats.weekProofs}</p>
              </div>
            </div>
            {proofStats.recentProofs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-[#B5B5B5]/80">Recent</p>
                {proofStats.recentProofs.map((proof) => (
                  <div key={proof.id} className="flex items-center justify-between rounded-[14px] border border-[#1E1E1E] bg-[#161616] p-3">
                    <div>
                      <p className="text-sm font-medium">{proof.robloxUsername || "Unknown"}</p>
                      <p className="text-xs text-[#B5B5B5]/60">${proof.totalAmount.toFixed(2)}</p>
                    </div>
                    <span className="text-xs text-[#B5B5B5]/80">{proof.imageUrls.length} images</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-xs text-[#B5B5B5]/60">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

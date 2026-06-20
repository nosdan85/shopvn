"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import BackButton from "../components/BackButton";
import { useAuthViet } from "../context/AuthVietContext";
import { resolveImageUrl } from "@/lib/imageUrl";
import { isAdminRole } from "@/lib/authRole";
import {
  AlertCircle, Loader2, Plus, Edit2, Trash2, RefreshCcw
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function imgUrl(src: string | undefined | null): string {
  return resolveImageUrl(src, API_BASE);
}

function toVietnamDateTimeParts(iso: string): { date: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + 7 * 60 * 60 * 1000);
  const normalized = shifted.toISOString();
  return {
    date: normalized.slice(0, 10),
    time: normalized.slice(11, 16),
  };
}

function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}


function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US");
}

interface Product { _id: string; name: string; price: number; bulkPrice?: number; packQuantity?: number; image: string; desc?: string; category: string; gameId?: string }
interface Game { _id: string; name: string; slug: string; image?: string; active: boolean }
interface LinkedUser {
  _id: string;
  discordId: string;
  discordUsername: string;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  tokenExpiresAt?: string | null;
  scopes: string[];
  cartItemsCount: number;
  cartUpdatedAt?: string | null;
  joinedAt?: string | null;
  luckyWheelTickets: number;
  luckyWheelTicketsGrantedByAdmin: number;
  luckyWheelFirstLinkAwardedAt?: string | null;
}

interface LuckyWheelSlice { label: string; type: "empty" | "discount"; discountPercent: number | "" }
interface LuckyWheelConfig { enabled: boolean; title: string; message: string; slices: LuckyWheelSlice[] }


function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function addMonths(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function buildCalendarDays(monthKey: string): Array<{ key: string; day: number; inMonth: boolean }> {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      day: date.getDate(),
      inMonth: date.getMonth() === month - 1,
    };
  });
}


export default function AdminPage() {
  const { user, token, isLoading } = useAuthViet();
  const [tab, setTab] = useState<"S?n Ph?m" | "Game" | "C?u H-nh" | "T-i Kho?n Web">("S?n Ph?m");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* --- products state --- */
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({ name: "", price: "", bulkPrice: "", packQuantity: "", image: "", desc: "", category: "", gameId: "" });

  /* --- games state --- */
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [showGameForm, setShowGameForm] = useState(false);
  const [editingGame, setEditingGame] = useState<string | null>(null);
  const [gameForm, setGameForm] = useState({ name: "", slug: "", image: "", active: true });

  /* --- banners & best sellers state --- */
  const [banners, setBanners] = useState<string[]>([]);
  const [bestSellers, setBestSellers] = useState<string[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [luckyWheel, setLuckyWheel] = useState<LuckyWheelConfig>({
    enabled: false,
    title: "Lucky Wheel Event",
    message: "We are running a limited lucky wheel event.",
    slices: [
      { label: "Better luck next time", type: "empty", discountPercent: 0 },
      { label: "5% off", type: "discount", discountPercent: 5 },
      { label: "15% off", type: "discount", discountPercent: 15 },
      { label: "30% off", type: "discount", discountPercent: 30 },
    ],
  });

  /* --- linked users state --- */
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [linkedUsersLoading, setLinkedUsersLoading] = useState(false);
  const [linkedUsersSearch, setLinkedUsersSearch] = useState("");
  const [linkedUsersPage, setLinkedUsersPage] = useState(1);
  const [linkedUsersTotalPages, setLinkedUsersTotalPages] = useState(1);
  const [linkedUsersTotal, setLinkedUsersTotal] = useState(0);

  const fetchProducts = async () => {
    if (!token) return;
    setProductsLoading(true);
    try {
      const res = await fetch("/api/shop/owner/products", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await res.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch { /* silent */ }
    setProductsLoading(false);
  };

  const fetchGames = async () => {
    if (!token) return;
    setGamesLoading(true);
    try {
      const res = await fetch("/api/shop/owner/games", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await res.json();
      const games = data.games || (Array.isArray(data) ? data : []);
      setGames(Array.isArray(games) ? games : []);
    } catch { /* silent */ }
    setGamesLoading(false);
  };


  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/shop/config", { cache: "no-store" });
      const data = await res.json();
      setBanners(Array.isArray(data.banners) ? data.banners : []);
      setBestSellers(Array.isArray(data.bestSellerIds) ? data.bestSellerIds : []);
    } catch { /* silent */ }
  };

  const fetchLinkedUsers = async (page = linkedUsersPage, search = linkedUsersSearch) => {
    if (!token) return;
    setLinkedUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/shop/owner/linked-users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Load linked users failed");
      setLinkedUsers(Array.isArray(data.users) ? data.users : []);
      setLinkedUsersPage(Number(data.page) || 1);
      setLinkedUsersTotalPages(Math.max(1, Number(data.totalPages) || 1));
      setLinkedUsersTotal(Number(data.total) || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load linked users failed");
    }
    setLinkedUsersLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isLoading && isAdminRole(user?.vaiTro) && token) {
      void fetchAll();
    }
  }, [isLoading, user, token]);

  /* --- CRUD PRODUCTS --- */
  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true); setError(null);
    try {
      const payload = {
        name: productForm.name.trim(),
        price: Number(productForm.price),
        bulkPrice: productForm.bulkPrice ? Number(productForm.bulkPrice) : null,
        packQuantity: productForm.packQuantity ? Number(productForm.packQuantity) : 1,
        image: productForm.image.trim(),
        desc: productForm.desc,
        category: productForm.category.trim(),
        gameId: productForm.gameId || null,
      };
      const url = editingProduct ? `/api/shop/owner/products/${editingProduct}` : "/api/shop/owner/products";
      const method = editingProduct ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "Luu th?t b?i");
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ name: "", price: "", bulkPrice: "", packQuantity: "", image: "", desc: "", category: "", gameId: "" });
      await fetchProducts();
    } catch (err) { setError(err instanceof Error ? err.message : "Luu th?t b?i"); }
    setSubmitting(false);
  };

  const deleteProduct = async (id: string) => {
    if (!token || !confirm("X-a item?")) return;
    try {
      await fetch(`/api/shop/owner/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      await fetchProducts();
    } catch { /* silent */ }
  };

  /* --- CRUD GAMES --- */
  const submitGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true); setError(null);
    try {
      const url = editingGame ? `/api/shop/owner/games/${editingGame}` : "/api/shop/owner/games";
      const method = editingGame ? "PUT" : "POST";
      const payload = {
        ...gameForm,
        slug: String(gameForm.slug || gameForm.name)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, ""),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Luu game that bai");
      setShowGameForm(false);
      setEditingGame(null);
      setGameForm({ name: "", slug: "", image: "", active: true });
      await fetchGames();
    } catch { setError("Luu game that bai"); }
    setSubmitting(false);
  };

  const deleteGame = async (id: string) => {
    if (!token || !confirm("X-a game?")) return;
    try {
      await fetch(`/api/shop/owner/games/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      await fetchGames();
    } catch { /* silent */ }
  };





  const fetchLuckyWheel = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/shop/owner/lucky-wheel", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Load lucky wheel failed");
      setLuckyWheel({
        enabled: Boolean(data.enabled),
        title: data.title || "Lucky Wheel Event",
        message: data.message || "We are running a limited lucky wheel event.",
        slices: Array.isArray(data.slices) ? data.slices : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load lucky wheel failed");
    }
  };

  async function fetchAll() {
    void fetchProducts();
    void fetchGames();

    void fetchConfig();
    void fetchLuckyWheel();
    void fetchLinkedUsers(1, linkedUsersSearch);
  }



  /* --- BANNERS & BEST SELLERS CONFIG --- */
  const handleBannerSave = async () => {
    if (!newBannerUrl.trim() || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/owner/config/banners", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bannerUrl: newBannerUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Luu banner that bai");
      setNewBannerUrl("");
      await fetchConfig();
    } catch (err) { setError(err instanceof Error ? err.message : "Luu banner that bai"); }
    setSubmitting(false);
  };

  const deleteBanner = async (bannerUrl: string) => {
    if (!token || !confirm("X-a banner?")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/owner/config/banners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bannerUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "X-a banner th?t b?i");
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : "X-a banner th?t b?i");
    }
    setSubmitting(false);
  };

  const toggleBestSeller = async (productId: string) => {
    if (!token) return;
    const isBs = bestSellers.includes(productId);
    const updated = isBs ? bestSellers.filter((id) => id !== productId) : [...bestSellers, productId];
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/owner/config/best-sellers", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bestSellerIds: updated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "C?p nh?t best sellers th?t b?i");
      setBestSellers(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "C?p nh?t best sellers th?t b?i");
    }
    setSubmitting(false);
  };

  const clearLinkedUserCart = async (userId: string) => {
    if (!token || !confirm(`X-a gi? h-ng cho ngu?i d-ng?`)) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/shop/owner/linked-users/${encodeURIComponent(userId)}/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "X-a gi? h-ng th?t b?i");
      await fetchLinkedUsers(linkedUsersPage, linkedUsersSearch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "X-a gi? h-ng th?t b?i");
    }
    setSubmitting(false);
  };

  const saveLuckyWheel = async () => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/owner/lucky-wheel", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...luckyWheel,
          slices: luckyWheel.slices.map((slice) => ({
            ...slice,
            discountPercent: slice.type === "discount" ? Number(slice.discountPercent) || 0 : 0,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save lucky wheel failed");
      setLuckyWheel({
        enabled: Boolean(data.enabled),
        title: data.title || "Lucky Wheel Event",
        message: data.message || "We are running a limited lucky wheel event.",
        slices: Array.isArray(data.slices) ? data.slices : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save lucky wheel failed");
    }
    setSubmitting(false);
  };

  const updateWheelSlice = (index: number, patch: Partial<LuckyWheelSlice>) => {
    setLuckyWheel((current) => ({
      ...current,
      slices: current.slices.map((slice, i) => (i === index ? { ...slice, ...patch } : slice)),
    }));
  };

  const addWheelSlice = () => {
    setLuckyWheel((current) => ({
      ...current,
      slices: [...current.slices, { label: "5% off", type: "discount", discountPercent: 5 }],
    }));
  };

  const removeWheelSlice = (index: number) => {
    setLuckyWheel((current) => ({
      ...current,
      slices: current.slices.filter((_, i) => i !== index),
    }));
  };

  const grantLuckyWheelTicket = async (userId: string) => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/shop/owner/linked-users/${encodeURIComponent(userId)}/lucky-wheel-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ count: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "C?p v-ng quay th?t b?i");
      await fetchLinkedUsers(linkedUsersPage, linkedUsersSearch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "C?p v-ng quay th?t b?i");
    }
    setSubmitting(false);
  };


  if (isLoading) return <div className="min-h-screen bg-[#071326] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-600" /></div>;

  if (!user || !isAdminRole(user.vaiTro)) {
    return (
      <div className="min-h-screen bg-[#071326] text-[#071326]/90 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-[18px] border border-red-400/20 bg-white/60 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
          <h1 className="text-xl font-semibold">B?n kh-ng c- quy?n truy c?p</h1>
          <p className="mt-2 text-slate-600 text-sm">Y-u c?u dang nh?p b?ng t-i kho?n qu?n tr? vi-n.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#071326] text-[#071326]/90 pb-12">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4">
          <BackButton href="/shop" label="C?a H-ng" variant="back" />
        </div>
        <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Qu?n Tr?</h1>
            <p className="text-slate-600 text-sm">Qu?n l- s?n ph?m, khung gi? giao h-ng, game, banner v- t-i kho?n web.</p>
          </div>
          <div className="flex gap-3">
            <a href="/shop" className="flex items-center gap-2 rounded-[14px] bg-white/60 border border-white/50 px-4 py-2 text-sm text-slate-600 hover:text-[#071326]/90 hover:border-[#2F9BE6]/30 transition-all">? V? c?a h-ng</a>
            <button onClick={() => void fetchAll()} className="flex items-center gap-2 rounded-[14px] bg-white/60 border border-white/50 px-4 py-2 text-sm"><RefreshCcw className="h-4 w-4" /> -?ng b?</button>
          </div>
        </div>

        <div className="mb-6 flex gap-2 border-b border-white/50 pb-3">
          {(["S?n Ph?m", "Game", "C?u H-nh", "T-i Kho?n Web"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t as typeof tab)} className={"rounded-[14px] px-4 py-2 text-sm font-medium " + (tab === t ? "bg-[#2F9BE6] text-[#071326]/90" : "bg-white/60 text-slate-600 hover:text-slate-600")}>
              {t}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 rounded-[16px] border border-red-400/20 bg-[#FF4D4F]/10 px-4 py-3 text-sm text-red-600">{error}</div>}

        {/* --- TAB: PRODUCTS --- */}
        {tab === "S?n Ph?m" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border border-white/50 bg-white/60 p-4 rounded-[16px]">
              <div><h2 className="font-semibold text-lg">Danh s-ch m?t h-ng</h2><p className="text-xs text-slate-600">Th-m, s?a, ho?c x-a m?t h-ng.</p></div>
              <button onClick={() => { setProductForm({ name: "", price: "", bulkPrice: "", packQuantity: "", image: "", desc: "", category: "", gameId: "" }); setEditingProduct(null); setShowProductForm(true); }} className="flex items-center gap-2 rounded-[14px] bg-[#2F9BE6] px-4 py-2 text-sm font-medium"><Plus className="h-4 w-4" /> Th-m S?n Ph?m</button>
            </div>

            {showProductForm && (
              <form onSubmit={submitProduct} className="rounded-[16px] border border-white/50 bg-white/60 p-5 space-y-4">
                <h3 className="font-medium">{editingProduct ? "Ch?nh s?a m?t h-ng" : "Th-m m?t h-ng m?i"}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <input required value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} placeholder="T-n m?t h-ng (v- d?: Aura Crate)" className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 outline-none" />
                  <input required value={productForm.category} onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))} placeholder="Danh M?c (v- d?: Chest, Trait, Race...)" className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 outline-none" />
                  <input required type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} placeholder="Gi- (VND)" className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 outline-none" />
                  <input type="number" step="0.01" value={productForm.bulkPrice} onChange={(e) => setProductForm((p) => ({ ...p, bulkPrice: e.target.value }))} placeholder="Gi- s? (t-y ch?n, VND)" className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 outline-none" />
                  <input type="number" step="1" min="1" value={productForm.packQuantity} onChange={(e) => setProductForm((p) => ({ ...p, packQuantity: e.target.value }))} placeholder="S? lu?ng m?i g-i (v- d?: 50, 100, 1000...)" className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 outline-none" />
                  <select value={productForm.gameId} onChange={(e) => setProductForm((p) => ({ ...p, gameId: e.target.value }))} className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 outline-none">
                    <option value="">Ch?n Game</option>
                    {games.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                  </select>
                </div>
                <textarea value={productForm.desc} onChange={(e) => setProductForm((p) => ({ ...p, desc: e.target.value }))} placeholder="M- t? chi ti?t..." rows={3} className="w-full rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 outline-none" />
                <div className="space-y-2">
                  <label className="text-xs text-slate-600">URL ?nh S?n Ph?m</label>
                  <input value={productForm.image} onChange={(e) => setProductForm((p) => ({ ...p, image: e.target.value }))} placeholder="URL ?nh (Cloudinary / ImgBB) ho?c du?ng d?n /products/..." className="w-full rounded-[14px] border border-white/50 bg-[#071326] px-4 py-2 outline-none" />
                  {productForm.image && <img src={imgUrl(productForm.image)} alt="preview" className="mt-2 h-20 w-20 rounded border border-white/50 object-cover" />}
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="rounded-[14px] bg-[#2F9BE6] px-5 py-2.5 text-sm font-medium disabled:opacity-50">Luu</button>
                  <button type="button" onClick={() => setShowProductForm(false)} className="rounded-[14px] bg-[#1E1E1E] px-5 py-2.5 text-sm">H?y</button>
                </div>
              </form>
            )}

            <div className="grid gap-3">
              {productsLoading && <p className="text-slate-500 text-sm">-ang t?i...</p>}
              {products.map((p) => (
                <div key={p._id} className="flex gap-4 items-center justify-between border border-white/50 bg-white/60 p-4 rounded-[16px]">
                  <div className="flex gap-3 items-center min-w-0">
                    <img src={imgUrl(p.image)} alt="" className="h-12 w-12 rounded-[14px] object-cover bg-[#071326]" />
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{p.name}</p>
                  <p className="text-xs text-slate-600">{p.category} - {p.price.toLocaleString('vi-VN')} VND{<span className="text-slate-600 ml-2">(x{p.packQuantity || 1})</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => void toggleBestSeller(p._id)} className={"rounded px-3 py-1.5 text-xs font-semibold " + (bestSellers.includes(p._id) ? "bg-[#2F9BE6] text-[#071326]/90" : "bg-[#1E1E1E] text-slate-600")}>B-n ch?y</button>
                    <button onClick={() => {
                      setProductForm({ name: p.name, price: String(p.price), bulkPrice: p.bulkPrice ? String(p.bulkPrice) : "", packQuantity: p.packQuantity ? String(p.packQuantity) : "1", image: p.image, desc: p.desc || "", category: p.category, gameId: p.gameId || "" });
                      setEditingProduct(p._id); setShowProductForm(true);
                    }} className="p-2 text-slate-600 bg-white/60 rounded-[14px]"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => void deleteProduct(p._id)} className="p-2 text-red-600 bg-white/60 rounded-[14px]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* --- TAB: GAMES --- */}
        {tab === "Game" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border border-white/50 bg-white/60 p-4 rounded-[16px]">
              <div><h2 className="font-semibold text-lg">Danh m?c Game</h2><p className="text-xs text-slate-600">Qu?n l- danh s-ch game.</p></div>
              <button onClick={() => { setEditingGame(null); setGameForm({ name: "", slug: "", image: "", active: true }); setShowGameForm(true); }} className="flex items-center gap-2 rounded-[14px] bg-[#2F9BE6] px-4 py-2 text-sm font-medium"><Plus className="h-4 w-4" /> Th-m Game</button>
            </div>

            {showGameForm && (
              <form onSubmit={submitGame} className="rounded-[16px] border border-white/50 bg-white/60 p-5 space-y-4">
                <h3 className="font-medium">{editingGame ? "Ch?nh s?a Game" : "Th-m Game m?i"}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <input required value={gameForm.name} onChange={(e) => setGameForm((p) => ({ ...p, name: e.target.value }))} placeholder="T-n Game" className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 outline-none" />
                  <input required value={gameForm.slug} onChange={(e) => setGameForm((p) => ({ ...p, slug: e.target.value }))} placeholder="Slug Game" className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 outline-none" />
                  <input value={gameForm.image} onChange={(e) => setGameForm((p) => ({ ...p, image: e.target.value }))} placeholder="URL ?nh (t-y ch?n)" className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 outline-none" />
                </div>
                {gameForm.image.trim() && (
                  <div className="flex items-center gap-3 rounded-[14px] border border-white/50 bg-[#071326] p-3">
                    <img src={imgUrl(gameForm.image)} alt="Game icon preview" className="h-12 w-12 rounded object-cover" />
                    <p className="break-all text-xs text-slate-600">{imgUrl(gameForm.image)}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="rounded-[14px] bg-[#2F9BE6] px-5 py-2.5 text-sm font-medium disabled:opacity-50">Luu</button>
                  <button type="button" onClick={() => setShowGameForm(false)} className="rounded-[14px] bg-[#1E1E1E] px-5 py-2.5 text-sm">H?y</button>
                </div>
              </form>
            )}

            <div className="grid gap-3">
              {gamesLoading && <p className="text-slate-500 text-sm">-ang t?i...</p>}
              {games.map((g) => (
                <div key={g._id} className="flex items-center justify-between border border-white/50 bg-white/60 p-4 rounded-[16px]">
                  <div className="flex items-center gap-3">
                    {g.image && <img src={imgUrl(g.image)} alt="" className="h-10 w-10 rounded object-cover" />}
                    <p className="font-medium text-sm">{g.name} <span className="text-xs text-slate-500">({g.slug})</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setGameForm({ name: g.name, slug: g.slug, image: g.image || "", active: g.active }); setEditingGame(g._id); setShowGameForm(true); }} className="p-2 text-slate-600 bg-white/60 rounded-[14px]"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => void deleteGame(g._id)} className="p-2 text-red-600 bg-white/60 rounded-[14px]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: CONFIG (BANNERS) --- */}
        {tab === "C?u H-nh" && (
          <div className="space-y-6">
            <div className="rounded-[16px] border border-white/50 bg-white/60 p-5 space-y-6">
              <div><h2 className="font-semibold text-lg">Banner C?a H-ng</h2><p className="text-xs text-slate-600">Ch? 1 banner hi?n c-. D-n URL ?nh d? thay th?.</p></div>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  value={newBannerUrl}
                  onChange={(e) => setNewBannerUrl(e.target.value)}
                  placeholder="D-n URL ?nh Banner"
                  className="min-w-[280px] flex-1 rounded border border-white/50 bg-[#071326] p-2 text-sm outline-none"
                />
                <button onClick={() => void handleBannerSave()} disabled={submitting || !newBannerUrl.trim()} className="rounded bg-[#2F9BE6] px-4 py-2 text-sm font-semibold disabled:opacity-50">Luu Banner</button>
              </div>
              {banners[0] ? (
                <div className="relative group overflow-hidden rounded-[14px] border border-white/50">
                  <img src={imgUrl(banners[0])} alt="" className="w-full object-cover" style={{ maxHeight: "360px" }} />
                  <button onClick={() => void deleteBanner(banners[0])} className="absolute top-2 right-2 bg-[#FF4D4F] text-[#071326]/90 rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="rounded-[14px] border border-dashed border-white/50 bg-[#071326] p-8 text-center text-sm text-slate-500">Chua c- banner.</div>
              )}
            </div>

            <div className="rounded-[16px] border border-white/50 bg-white/60 p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">V-ng Quay May M?n</h2>
                  <p className="text-xs text-slate-600">B?t/t?t event v- c?u h-nh c-c - quay. - empty l- ch-c may m?n l?n sau.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={luckyWheel.enabled}
                    onChange={(e) => setLuckyWheel((current) => ({ ...current, enabled: e.target.checked }))}
                  />
                  B?t
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={luckyWheel.title} onChange={(e) => setLuckyWheel((current) => ({ ...current, title: e.target.value }))} className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 text-sm outline-none" placeholder="Ti-u d? event" />
                <input value={luckyWheel.message} onChange={(e) => setLuckyWheel((current) => ({ ...current, message: e.target.value }))} className="rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 text-sm outline-none" placeholder="Th-ng b-o popup" />
              </div>
              <div className="space-y-3">
                {luckyWheel.slices.map((slice, index) => (
                  <div key={index} className="grid gap-2 rounded-[14px] border border-white/50 bg-[#071326] p-3 md:grid-cols-[1fr_140px_120px_auto]">
                    <input value={slice.label} onChange={(e) => updateWheelSlice(index, { label: e.target.value })} className="rounded-[12px] border border-white/50 bg-white/60 px-3 py-2 text-sm outline-none" placeholder="T-n" />
                    <select value={slice.type} onChange={(e) => updateWheelSlice(index, { type: e.target.value as LuckyWheelSlice["type"] })} className="rounded-[12px] border border-white/50 bg-white/60 px-3 py-2 text-sm outline-none">
                      <option value="empty">Tr?ng</option>
                      <option value="discount">Gi?m gi-</option>
                    </select>
                    <input type="number" min="0" max="100" value={slice.discountPercent} onChange={(e) => updateWheelSlice(index, { discountPercent: e.target.value === "" ? "" : Number(e.target.value) })} disabled={slice.type === "empty"} className="rounded-[12px] border border-white/50 bg-white/60 px-3 py-2 text-sm outline-none disabled:opacity-50" placeholder="%" />
                    <button onClick={() => removeWheelSlice(index)} className="rounded-[12px] bg-[#FF4D4F]/15 px-3 py-2 text-sm text-red-600">X-a</button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={addWheelSlice} className="rounded-[14px] bg-[#1E1E1E] px-4 py-2 text-sm">Th-m -</button>
                <button onClick={() => void saveLuckyWheel()} disabled={submitting} className="rounded-[14px] bg-[#2F9BE6] px-4 py-2 text-sm font-semibold disabled:opacity-50">Luu V-ng Quay</button>
              </div>
            </div>
          </div>
        )}

        {tab === "T-i Kho?n Web" && (
          <div className="space-y-6">
            <div className="rounded-[16px] border border-white/50 bg-white/60 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">T-i Kho?n Web</h2>
                  <p className="text-xs text-slate-600">Qu?n l- t-i kho?n web ngu?i d-ng, v- VND, gi? h-ng, v- li-n k?t Discord.</p>
                </div>
                <button onClick={() => void fetchLinkedUsers(linkedUsersPage, linkedUsersSearch)} className="rounded-[14px] border border-white/50 bg-white/70 px-4 py-2 text-sm">
                  L-m M?i
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={linkedUsersSearch}
                  onChange={(e) => setLinkedUsersSearch(e.target.value)}
                  placeholder="T-m theo t-n dang nh?p ho?c email"
                  className="min-w-[280px] flex-1 rounded-[14px] border border-white/50 bg-[#071326] px-4 py-3 text-sm outline-none"
                />
                <button
                  onClick={() => void fetchLinkedUsers(1, linkedUsersSearch)}
                  disabled={linkedUsersLoading}
                  className="rounded-[14px] bg-[#2F9BE6] px-4 py-3 text-sm font-medium disabled:opacity-50"
                >
                  T-m
                </button>
              </div>

              <div className="text-sm text-slate-600">T?ng t-i kho?n: {linkedUsersTotal}</div>

              <div className="grid gap-3">
                {linkedUsersLoading && <p className="text-sm text-slate-500">-ang t?i...</p>}
                {!linkedUsersLoading && linkedUsers.length === 0 && (
                  <div className="rounded-[14px] border border-dashed border-white/50 bg-[#071326] p-6 text-sm text-slate-500">
                    Kh-ng c- d? li?u.
                  </div>
                )}
                {linkedUsers.map((linkedUser) => (
                  <div key={linkedUser._id} className="rounded-[16px] border border-white/50 bg-[#071326] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[#071326]/90">{linkedUser.discordUsername || "Kh-ng r- Discord"}</p>
                        <p className="text-xs text-slate-600">Discord ID: {linkedUser.discordId || "-"}</p>
                        <div className="flex flex-wrap gap-2 pt-1 text-xs">
                          <span className={"rounded-full px-2 py-1 " + (linkedUser.hasAccessToken ? "bg-[#3DDC84]/15 text-green-600" : "bg-[#FF4D4F]/10 text-red-600")}>
                            Access token: {linkedUser.hasAccessToken ? "C-" : "Kh-ng"}
                          </span>
                          <span className={"rounded-full px-2 py-1 " + (linkedUser.hasRefreshToken ? "bg-[#3DDC84]/15 text-green-600" : "bg-[#FF4D4F]/10 text-red-600")}>
                            Refresh token: {linkedUser.hasRefreshToken ? "C-" : "Kh-ng"}
                          </span>
                          <span className="rounded-full bg-[#5865F2]/15 px-2 py-1 text-slate-600">
                            V- quay: {linkedUser.luckyWheelTickets}
                          </span>
                          <span className="rounded-full bg-[#2F9BE6]/15 px-2 py-1 text-slate-600">
                            Admin c?p: {linkedUser.luckyWheelTicketsGrantedByAdmin}
                          </span>
                          <span className="rounded-full bg-white/70 px-2 py-1 text-slate-600">
                            Gi? h-ng: {linkedUser.cartItemsCount} m?c
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void grantLuckyWheelTicket(linkedUser.discordId)}
                          disabled={submitting || !linkedUser.discordId}
                          className="rounded-[14px] bg-[#2F9BE6]/15 px-4 py-2 text-sm text-slate-600 disabled:opacity-50"
                        >
                          C?p v-ng quay
                        </button>
                        <button
                          onClick={() => void clearLinkedUserCart(linkedUser.discordId)}
                          disabled={submitting || !linkedUser.discordId}
                          className="rounded-[14px] bg-[#FF4D4F]/15 px-4 py-2 text-sm text-red-600 disabled:opacity-50"
                        >
                          X-a gi?
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                      <div>C?p nh?t gi? h-ng: {formatDateTime(linkedUser.cartUpdatedAt)}</div>
                      <div>Tham gia: {formatDateTime(linkedUser.joinedAt)}</div>
                      <div>Token h?t h?n: {formatDateTime(linkedUser.tokenExpiresAt)}</div>
                      <div>Thu?ng link d?u: {formatDateTime(linkedUser.luckyWheelFirstLinkAwardedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => void fetchLinkedUsers(Math.max(1, linkedUsersPage - 1), linkedUsersSearch)}
                  disabled={linkedUsersPage <= 1 || linkedUsersLoading}
                  className="rounded-[14px] border border-white/50 bg-white/70 px-4 py-2 text-sm disabled:opacity-40"
                >
                  Trang tru?c
                </button>
                <span className="text-sm text-slate-600">Trang {linkedUsersPage} / {linkedUsersTotalPages}</span>
                <button
                  onClick={() => void fetchLinkedUsers(Math.min(linkedUsersTotalPages, linkedUsersPage + 1), linkedUsersSearch)}
                  disabled={linkedUsersPage >= linkedUsersTotalPages || linkedUsersLoading}
                  className="rounded-[14px] border border-white/50 bg-white/70 px-4 py-2 text-sm disabled:opacity-40"
                >
                  Trang sau
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}





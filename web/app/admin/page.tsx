"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { resolveImageUrl } from "@/lib/imageUrl";
import {
  AlertCircle, Loader2, Plus, Edit2, Trash2, RefreshCcw, ChevronLeft, ChevronRight
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

function toVietnamIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0)).toISOString();
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US");
}

interface Product { _id: string; name: string; price: number; bulkPrice?: number; packQuantity?: number; image: string; desc?: string; category: string; gameId?: string }
interface Game { _id: string; name: string; slug: string; image?: string; active: boolean }
interface Slot { _id: string; ownerTimezone: string; startAt: string; endAt: string; active: boolean; note?: string }
interface LinkedUser {
  _id: string;
  discordId: string;
  discordUsername: string;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  tokenExpiresAt?: string | null;
  scopes?: string[];
  cartItemsCount: number;
  cartUpdatedAt?: string | null;
  joinedAt?: string | null;
  luckyWheelTickets?: number;
  luckyWheelTicketsGrantedByAdmin?: number;
  luckyWheelFirstLinkAwardedAt?: string | null;
}

interface LuckyWheelSlice { label: string; type: "empty" | "discount"; discountPercent: number | "" }
interface LuckyWheelConfig { enabled: boolean; title: string; message: string; slices: LuckyWheelSlice[] }

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function hourToMinutes(value: string): number {
  const [hour, minute] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return -1;
  return hour * 60 + minute;
}

function getVietnamSlotParts(startIso: string, endIso: string): {
  date: string;
  startTime: string;
  endTime: string;
  endDate: string;
  crossesMidnight: boolean;
} {
  const start = toVietnamDateTimeParts(startIso);
  const end = toVietnamDateTimeParts(endIso);
  const endsAtNextMidnight = end.time === "00:00" && end.date === addDaysToDateKey(start.date, 1);
  return {
    date: start.date,
    startTime: start.time,
    endTime: endsAtNextMidnight ? "24:00" : end.time,
    endDate: end.date,
    crossesMidnight: end.date !== start.date,
  };
}

function getNextVietnamHourlySlot(now = new Date()): { date: string; month: string; startTime: string; endTime: string } {
  const vietnam = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const minute = vietnam.getUTCMinutes();
  const second = vietnam.getUTCSeconds();
  const ms = vietnam.getUTCMilliseconds();
  const startHour = vietnam.getUTCHours() + (minute > 0 || second > 0 || ms > 0 ? 1 : 0);
  const start = new Date(Date.UTC(
    vietnam.getUTCFullYear(),
    vietnam.getUTCMonth(),
    vietnam.getUTCDate(),
    startHour,
    0,
    0,
    0
  ));
  const end = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
    start.getUTCHours() + 1,
    0,
    0,
    0
  ));
  const date = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}`;
  const endTime = end.getUTCDate() !== start.getUTCDate() ? "24:00" : `${String(end.getUTCHours()).padStart(2, "0")}:00`;
  return {
    date,
    month: date.slice(0, 7),
    startTime: `${String(start.getUTCHours()).padStart(2, "0")}:00`,
    endTime,
  };
}

export default function AdminPage() {
  const { user, token, isLoading, getOAuthUrl } = useAuth();
  const [tab, setTab] = useState<"sản phẩm" | "khung giờ" | "game" | "cấu hình" | "liên kết">("sản phẩm");
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

  /* --- slots state --- */
  const initialSlot = useMemo(() => getNextVietnamHourlySlot(), []);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotDate, setSlotDate] = useState(initialSlot.date);
  const [slotMonth, setSlotMonth] = useState(initialSlot.month);
  const [slotStartTime, setSlotStartTime] = useState(initialSlot.startTime);
  const [slotEndTime, setSlotEndTime] = useState(initialSlot.endTime);
  const [slotNote, setSlotNote] = useState("");
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [slotEditForm, setSlotEditForm] = useState({ date: "", startTime: "", endTime: "", note: "", active: true });
  const [slotFilter, setSlotFilter] = useState<string>("");

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

  const fetchSlots = async () => {
    if (!token) return;
    setSlotsLoading(true);
    try {
      const res = await fetch("/api/shop/delivery-slots?manage=1", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await res.json();
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch { /* silent */ }
    setSlotsLoading(false);
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
    if (!isLoading && user?.isOwner && token) {
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
        name: productForm.name,
        price: Number(productForm.price),
        bulkPrice: productForm.bulkPrice ? Number(productForm.bulkPrice) : null,
        packQuantity: productForm.packQuantity ? Number(productForm.packQuantity) : 1,
        image: productForm.image,
        desc: productForm.desc,
        category: productForm.category,
        gameId: productForm.gameId || null,
      };
      const url = editingProduct ? `/api/shop/owner/products/${editingProduct}` : "/api/shop/owner/products";
      const method = editingProduct ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Luu that bai");
      setShowProductForm(false);
      setEditingProduct(null);
      setProductForm({ name: "", price: "", bulkPrice: "", packQuantity: "", image: "", desc: "", category: "", gameId: "" });
      await fetchProducts();
    } catch (err) { setError("Luu that bai"); }
    setSubmitting(false);
  };

  const deleteProduct = async (id: string) => {
    if (!token || !confirm("Xóa item?")) return;
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
    if (!token || !confirm("Xóa game?")) return;
    try {
      await fetch(`/api/shop/owner/games/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      await fetchGames();
    } catch { /* silent */ }
  };

  /* --- BULK SLOTS (Vietnamese timezone setup) --- */
  const createSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !slotDate) return;
    if (hourToMinutes(slotEndTime) <= hourToMinutes(slotStartTime)) {
      setError("Gio ket thuc phai sau gio bat dau");
      return;
    }
    if (new Date(toVietnamIso(slotDate, slotEndTime)) <= new Date()) {
      setError("Khung gio nay da qua. Hay chon gio trong tuong lai.");
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/shop/delivery-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ownerTimezone: "Asia/Ho_Chi_Minh",
          date: slotDate,
          ranges: [{ startTime: slotStartTime, endTime: slotEndTime, note: slotNote.trim() }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Tao khung gio that bai");
      if (!Array.isArray(data?.slots) || data.slots.length === 0) {
        throw new Error("No valid slots were created. Check start/end times.");
      }
      setSlotNote("");
      await fetchSlots();
    } catch (err) { setError(err instanceof Error ? err.message : "Tao khung gio that bai"); }
    setSubmitting(false);
  };

  const slotCalendarDays = useMemo(() => buildCalendarDays(slotMonth), [slotMonth]);

  const formatSlotRange = useMemo(
    () => (slot: Slot) => {
      try {
        const start = new Date(slot.startAt);
        const slotParts = getVietnamSlotParts(slot.startAt, slot.endAt);
        const dateText = new Intl.DateTimeFormat("vi-VN", {
          timeZone: slot.ownerTimezone,
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(start);
        const endDateSuffix = slotParts.crossesMidnight && slotParts.endTime !== "24:00" ? ` (${slotParts.endDate})` : "";
        return `${dateText} • ${slotParts.startTime} - ${slotParts.endTime}${endDateSuffix} • Giờ VN (GMT+7)`;
      } catch {
        return `${slot.startAt} - ${slot.endAt}`;
      }
    },
    []
  );

  const filteredSlots = useMemo(() => {
    if (!slotFilter) return slots;
    return slots.filter((s) => {
      const slotDateValue = toVietnamDateTimeParts(s.startAt).date.slice(0, 7);
      return slotDateValue === slotFilter;
    });
  }, [slots, slotFilter]);

  const toggleSlot = async (id: string, active: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/shop/delivery-slots/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Cap nhat khung gio that bai");
      await fetchSlots();
    } catch (err) { setError(err instanceof Error ? err.message : "Cap nhat khung gio that bai"); }
  };

  const deleteSlot = async (id: string) => {
    if (!token || !confirm("Xóa slot?")) return;
    try {
      const res = await fetch(`/api/shop/delivery-slots/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Xoa khung gio that bai");
      await fetchSlots();
    } catch (err) { setError(err instanceof Error ? err.message : "Xoa khung gio that bai"); }
  };

  const startEditSlot = (slot: Slot) => {
    const slotParts = getVietnamSlotParts(slot.startAt, slot.endAt);
    setEditingSlot(slot._id);
    setSlotEditForm({
      date: slotParts.date,
      startTime: slotParts.startTime,
      endTime: slotParts.endTime,
      note: slot.note || "",
      active: slot.active,
    });
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
    void fetchSlots();
    void fetchConfig();
    void fetchLuckyWheel();
    void fetchLinkedUsers(1, linkedUsersSearch);
  }

  const saveSlotEdit = async () => {
    if (!token || !editingSlot || !slotEditForm.date || !slotEditForm.startTime || !slotEditForm.endTime) return;
    if (hourToMinutes(slotEditForm.endTime) <= hourToMinutes(slotEditForm.startTime)) {
      setError("Gio ket thuc phai sau gio bat dau");
      return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/shop/delivery-slots/${editingSlot}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          startAt: toVietnamIso(slotEditForm.date, slotEditForm.startTime),
          endAt: toVietnamIso(slotEditForm.date, slotEditForm.endTime),
          note: slotEditForm.note,
          active: slotEditForm.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Luu khung gio that bai");
      setEditingSlot(null);
      await fetchSlots();
    } catch (err) { setError(err instanceof Error ? err.message : "Luu khung gio that bai"); }
    setSubmitting(false);
  };

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
    if (!token || !confirm("Xóa banner?")) return;
    try {
      await fetch("/api/shop/owner/config/banners", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bannerUrl })
      });
      await fetchConfig();
    } catch { /* silent */ }
  };

  const toggleBestSeller = async (productId: string) => {
    if (!token) return;
    const isBs = bestSellers.includes(productId);
    const updated = isBs ? bestSellers.filter((id) => id !== productId) : [...bestSellers, productId];
    try {
      await fetch("/api/shop/owner/config/best-sellers", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bestSellerIds: updated }),
      });
      setBestSellers(updated);
    } catch { /* silent */ }
  };

  const clearLinkedUserCart = async (discordId: string) => {
    if (!token || !confirm(`Clear saved cart for ${discordId}?`)) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/shop/owner/linked-users/${discordId}/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Clear cart failed");
      await fetchLinkedUsers(linkedUsersPage, linkedUsersSearch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear cart failed");
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

  const grantLuckyWheelTicket = async (discordId: string) => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/shop/owner/linked-users/${discordId}/lucky-wheel-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ count: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Grant spin failed");
      await fetchLinkedUsers(linkedUsersPage, linkedUsersSearch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grant spin failed");
    }
    setSubmitting(false);
  };

  const unlinkUser = async (discordId: string) => {
    if (!token || !confirm(`Xóa liên kết Discord cho ${discordId}? User vẫn ở trong server.`)) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/shop/owner/linked-users/${discordId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unlink failed");
      await fetchLinkedUsers(linkedUsersPage, linkedUsersSearch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlink failed");
    }
    setSubmitting(false);
  };

  if (isLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#2F9BE6]" /></div>;

  if (!user?.isOwner) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-[18px] border border-red-500/20 bg-[#111111] p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[#FF4D4F]" />
          <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
          <p className="mt-2 text-[#B5B5B5]/80 text-sm">Yêu cầu đăng nhập bằng Discord tài khoản owner.</p>
          <a href={getOAuthUrl()} className="mt-4 inline-block bg-[#5865F2] px-6 py-2.5 rounded-[14px] text-sm font-medium">Login with Discord</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-12">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý cửa hàng</h1>
            <p className="text-[#B5B5B5]/80 text-sm">Quản lý sản phẩm, khung giờ giao hàng, game, banner và tài khoản đã liên kết.</p>
          </div>
          <div className="flex gap-3">
            <a href="/shop" className="flex items-center gap-2 rounded-[14px] bg-[#111111] border border-[#1E1E1E] px-4 py-2 text-sm text-[#B5B5B5] hover:text-white hover:border-[#2F9BE6]/30 transition-all">← Về cửa hàng</a>
            <button onClick={() => void fetchAll()} className="flex items-center gap-2 rounded-[14px] bg-[#111111] border border-[#1E1E1E] px-4 py-2 text-sm"><RefreshCcw className="h-4 w-4" /> Đồng bộ</button>
          </div>
        </div>

        <div className="mb-6 flex gap-2 border-b border-[#1E1E1E] pb-3">
          {(["sản phẩm", "khung giờ", "game", "cấu hình", "liên kết"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={"rounded-[14px] px-4 py-2 text-sm font-medium " + (tab === t ? "bg-[#2F9BE6] text-white" : "bg-[#111111] text-[#B5B5B5]/80 hover:text-[#B5B5B5]")}>
              {t}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 rounded-[16px] border border-red-500/20 bg-[#FF4D4F]/10 px-4 py-3 text-sm text-[#FF4D4F]">{error}</div>}

        {/* ─── TAB: PRODUCTS ─── */}
        {tab === "sản phẩm" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border border-[#1E1E1E] bg-[#111111] p-4 rounded-[16px]">
              <div><h2 className="font-semibold text-lg">Danh sách mặt hàng</h2><p className="text-xs text-[#B5B5B5]/80">Thêm, sửa, hoặc xóa mặt hàng.</p></div>
              <button onClick={() => { setProductForm({ name: "", price: "", bulkPrice: "", packQuantity: "", image: "", desc: "", category: "", gameId: "" }); setEditingProduct(null); setShowProductForm(true); }} className="flex items-center gap-2 rounded-[14px] bg-[#2F9BE6] px-4 py-2 text-sm font-medium"><Plus className="h-4 w-4" /> Thêm mặt hàng</button>
            </div>

            {showProductForm && (
              <form onSubmit={submitProduct} className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-5 space-y-4">
                <h3 className="font-medium">{editingProduct ? "Chỉnh sửa mặt hàng" : "Thêm mặt hàng mới"}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <input required value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} placeholder="Tên mặt hàng (ví dụ: Aura Crate)" className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none" />
                  <input required value={productForm.category} onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))} placeholder="Danh mục (ví dụ: Chest, Trait, Race...)" className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none" />
                  <input required type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} placeholder="Giá ($)" className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none" />
                  <input type="number" step="0.01" value={productForm.bulkPrice} onChange={(e) => setProductForm((p) => ({ ...p, bulkPrice: e.target.value }))} placeholder="Giá sỉ (tùy chọn)" className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none" />
                  <input type="number" step="1" min="1" value={productForm.packQuantity} onChange={(e) => setProductForm((p) => ({ ...p, packQuantity: e.target.value }))} placeholder="Số lượng mỗi gói (ví dụ: 50, 100, 1000...)" className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none" />
                  <select value={productForm.gameId} onChange={(e) => setProductForm((p) => ({ ...p, gameId: e.target.value }))} className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none">
                    <option value="">Chọn game</option>
                    {games.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                  </select>
                </div>
                <textarea value={productForm.desc} onChange={(e) => setProductForm((p) => ({ ...p, desc: e.target.value }))} placeholder="Mô tả chi tiết..." rows={3} className="w-full rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none" />
                <div className="space-y-2">
                  <label className="text-xs text-[#B5B5B5]/80">URL Anh san pham</label>
                  <input value={productForm.image} onChange={(e) => setProductForm((p) => ({ ...p, image: e.target.value }))} placeholder="URL ảnh (Cloudinary / ImgBB)" className="w-full rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-2 outline-none" />
                  {productForm.image && <img src={imgUrl(productForm.image)} alt="preview" className="mt-2 h-20 w-20 rounded border border-[#1E1E1E] object-cover" />}
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="rounded-[14px] bg-[#2F9BE6] px-5 py-2.5 text-sm font-medium disabled:opacity-50">Lưu mặt hàng</button>
                  <button type="button" onClick={() => setShowProductForm(false)} className="rounded-[14px] bg-[#1E1E1E] px-5 py-2.5 text-sm">Hủy</button>
                </div>
              </form>
            )}

            <div className="grid gap-3">
              {productsLoading && <p className="text-[#B5B5B5]/60 text-sm">Đang tải...</p>}
              {products.map((p) => (
                <div key={p._id} className="flex gap-4 items-center justify-between border border-[#1E1E1E] bg-[#111111] p-4 rounded-[16px]">
                  <div className="flex gap-3 items-center min-w-0">
                    <img src={imgUrl(p.image)} alt="" className="h-12 w-12 rounded-[14px] object-cover bg-[#050505]" />
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{p.name}</p>
                  <p className="text-xs text-[#B5B5B5]/80">{p.category} • ${p.price.toFixed(2)}{<span className="text-[#2F9BE6] ml-2">(x{p.packQuantity || 1})</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => void toggleBestSeller(p._id)} className={"rounded px-3 py-1.5 text-xs font-semibold " + (bestSellers.includes(p._id) ? "bg-[#2F9BE6] text-white" : "bg-[#1E1E1E] text-[#B5B5B5]/80")}>Bán chạy</button>
                    <button onClick={() => {
                      setProductForm({ name: p.name, price: String(p.price), bulkPrice: p.bulkPrice ? String(p.bulkPrice) : "", packQuantity: p.packQuantity ? String(p.packQuantity) : "1", image: p.image, desc: p.desc || "", category: p.category, gameId: p.gameId || "" });
                      setEditingProduct(p._id); setShowProductForm(true);
                    }} className="p-2 text-[#2F9BE6] bg-[#161616]/50 rounded-[14px]"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => void deleteProduct(p._id)} className="p-2 text-[#FF4D4F] bg-[#161616]/50 rounded-[14px]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: SLOTS ─── */}
        {tab === "khung giờ" && (
          <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
            <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-5 space-y-4 h-fit">
              <div>
                <h2 className="font-semibold text-lg">Tạo khung giờ giao hàng</h2>
                <p className="text-xs text-[#B5B5B5]/80">Chọn ngày và từng giờ theo giờ Việt Nam. Khách sẽ thấy giờ đã tự đổi theo timezone của họ.</p>
              </div>

              <form onSubmit={createSlots} className="space-y-4">
                <div className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <button type="button" onClick={() => setSlotMonth((current) => addMonths(current, -1))} className="rounded-[12px] bg-[#111111] p-2 text-[#B5B5B5] hover:text-white">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="text-sm font-semibold text-white">{getMonthLabel(slotMonth)}</div>
                    <button type="button" onClick={() => setSlotMonth((current) => addMonths(current, 1))} className="rounded-[12px] bg-[#111111] p-2 text-[#B5B5B5] hover:text-white">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[#B5B5B5]/70">
                    {WEEKDAY_LABELS.map((day) => <div key={day}>{day}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {slotCalendarDays.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => {
                          setSlotDate(day.key);
                          setSlotMonth(day.key.slice(0, 7));
                        }}
                        className={"h-10 rounded-[12px] text-sm font-medium transition-all " + (slotDate === day.key
                          ? "bg-[#2F9BE6] text-white"
                          : day.inMonth
                            ? "bg-[#111111] text-[#B5B5B5] hover:bg-[#1E1E1E] hover:text-white"
                            : "bg-transparent text-[#B5B5B5]/30 hover:bg-[#111111]")}
                      >
                        {day.day}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[#B5B5B5]/80">Ngày đã chọn: <span className="font-medium text-white">{slotDate}</span></p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-[#B5B5B5]/60">Từ giờ</label>
                    <select value={slotStartTime} onChange={(e) => setSlotStartTime(e.target.value)} className="w-full rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-3 py-3 text-sm outline-none">
                      {HOUR_OPTIONS.slice(0, -1).map((time) => <option key={time} value={time}>{time}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[#B5B5B5]/60">Đến giờ</label>
                    <select value={slotEndTime} onChange={(e) => setSlotEndTime(e.target.value)} className="w-full rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-3 py-3 text-sm outline-none">
                      {HOUR_OPTIONS.slice(1).map((time) => <option key={time} value={time}>{time}</option>)}
                    </select>
                  </div>
                </div>

                <input
                  placeholder="Ghi chú (tùy chọn)"
                  value={slotNote}
                  onChange={(e) => setSlotNote(e.target.value)}
                  className="w-full rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 text-sm outline-none"
                />
                <button type="submit" disabled={submitting} className="w-full rounded-[14px] bg-[#2F9BE6] px-4 py-3 text-sm font-semibold disabled:opacity-50">
                  {submitting ? "Đang tạo..." : "Tạo khung giờ"}
                </button>
                <div className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] p-3 text-xs text-[#B5B5B5]/80">
                  Slot sẽ tạo: <span className="font-medium text-white">{slotDate}</span>, <span className="font-medium text-white">{slotStartTime} - {slotEndTime}</span> giờ Việt Nam.
                </div>
              </form>
            </div>
            <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-5 space-y-3">
              <h2 className="font-semibold text-lg">Khung giờ đã tạo (giờ Việt Nam)</h2>
              <div className="mb-4 flex items-center gap-3">
                <label className="text-sm text-[#B5B5B5]/80" htmlFor="slot-filter">Lọc theo tháng:</label>
                <input
                  id="slot-filter"
                  type="month"
                  value={slotFilter}
                  onChange={(e) => setSlotFilter(e.target.value)}
                  className="rounded border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm outline-none"
                />
                {slotFilter && (
                  <button type="button" onClick={() => setSlotFilter("")} className="text-xs text-[#B5B5B5]/60 hover:text-white">
                    Xóa lọc
                  </button>
                )}
              </div>
              {slotsLoading && <p className="text-[#B5B5B5]/60 text-sm">Đang tải...</p>}
              {filteredSlots.map((s) => (
                <div key={s._id} className={"border border-[#1E1E1E] bg-[#050505] p-4 rounded-[14px] transition-all " + (s.active ? "" : "opacity-60")}>
                  {editingSlot === s._id ? (
                    <div className="space-y-3 animate-fade-in">
                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="space-y-1"><label className="text-xs text-[#B5B5B5]/60">Ngày</label><input type="date" value={slotEditForm.date} onChange={(e) => setSlotEditForm((p) => ({ ...p, date: e.target.value }))} className="w-full rounded border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm outline-none" /></div>
                        <div className="space-y-1">
                          <label className="text-xs text-[#B5B5B5]/60">Từ giờ</label>
                          <select value={slotEditForm.startTime} onChange={(e) => setSlotEditForm((p) => ({ ...p, startTime: e.target.value }))} className="w-full rounded border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm outline-none">
                            {HOUR_OPTIONS.slice(0, -1).map((time) => <option key={time} value={time}>{time}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-[#B5B5B5]/60">Đến giờ</label>
                          <select value={slotEditForm.endTime} onChange={(e) => setSlotEditForm((p) => ({ ...p, endTime: e.target.value }))} className="w-full rounded border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm outline-none">
                            {HOUR_OPTIONS.slice(1).map((time) => <option key={time} value={time}>{time}</option>)}
                          </select>
                        </div>
                      </div>
                      <input placeholder="Ghi chú (tùy chọn)" value={slotEditForm.note} onChange={(e) => setSlotEditForm((p) => ({ ...p, note: e.target.value }))} className="w-full rounded border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm outline-none" />
                      <label className="flex items-center gap-2 text-sm text-[#B5B5B5]">
                        <input type="checkbox" checked={slotEditForm.active} onChange={(e) => setSlotEditForm((p) => ({ ...p, active: e.target.checked }))} />
                        Active
                      </label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => void saveSlotEdit()} disabled={submitting} className="rounded bg-[#2F9BE6] px-4 py-2 text-xs font-semibold disabled:opacity-50">Lưu</button>
                        <button type="button" onClick={() => setEditingSlot(null)} className="rounded bg-[#1E1E1E] px-4 py-2 text-xs">Hủy</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className={s.active ? "" : "line-through"}>
                        <p className="font-medium text-sm">{formatSlotRange(s)}</p>
                        {s.note && <p className="text-xs text-[#B5B5B5]/80 mt-1">{s.note}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEditSlot(s)} className="p-2 text-[#2F9BE6] bg-[#111111] rounded" title="Sua"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => void toggleSlot(s._id, !s.active)} className={"p-2 rounded " + (s.active ? "text-[#2F9BE6] bg-[#111111]" : "text-[#3DDC84] bg-[#111111]")} title={s.active ? "Tat" : "Bat"}><RefreshCcw className="h-4 w-4" /></button>
                        <button onClick={() => void deleteSlot(s._id)} className="p-2 text-[#FF4D4F] bg-[#111111] rounded" title="Xóa"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: GAMES ─── */}
        {tab === "game" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border border-[#1E1E1E] bg-[#111111] p-4 rounded-[16px]">
              <div><h2 className="font-semibold text-lg">Danh mục game</h2><p className="text-xs text-[#B5B5B5]/80">Quản lý danh sách game.</p></div>
              <button onClick={() => { setEditingGame(null); setGameForm({ name: "", slug: "", image: "", active: true }); setShowGameForm(true); }} className="flex items-center gap-2 rounded-[14px] bg-[#2F9BE6] px-4 py-2 text-sm font-medium"><Plus className="h-4 w-4" /> Thêm game</button>
            </div>

            {showGameForm && (
              <form onSubmit={submitGame} className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-5 space-y-4">
                <h3 className="font-medium">{editingGame ? "Chỉnh sửa game" : "Thêm game mới"}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <input required value={gameForm.name} onChange={(e) => setGameForm((p) => ({ ...p, name: e.target.value }))} placeholder="Tên game" className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none" />
                  <input required value={gameForm.slug} onChange={(e) => setGameForm((p) => ({ ...p, slug: e.target.value }))} placeholder="Slug game" className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none" />
                  <input value={gameForm.image} onChange={(e) => setGameForm((p) => ({ ...p, image: e.target.value }))} placeholder="URL ảnh (tùy chọn)" className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none" />
                </div>
                {gameForm.image.trim() && (
                  <div className="flex items-center gap-3 rounded-[14px] border border-[#1E1E1E] bg-[#050505] p-3">
                    <img src={imgUrl(gameForm.image)} alt="Game icon preview" className="h-12 w-12 rounded object-cover" />
                    <p className="break-all text-xs text-[#B5B5B5]/70">{imgUrl(gameForm.image)}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="rounded-[14px] bg-[#2F9BE6] px-5 py-2.5 text-sm font-medium disabled:opacity-50">Lưu game</button>
                  <button type="button" onClick={() => setShowGameForm(false)} className="rounded-[14px] bg-[#1E1E1E] px-5 py-2.5 text-sm">Hủy</button>
                </div>
              </form>
            )}

            <div className="grid gap-3">
              {gamesLoading && <p className="text-[#B5B5B5]/60 text-sm">Đang tải...</p>}
              {games.map((g) => (
                <div key={g._id} className="flex items-center justify-between border border-[#1E1E1E] bg-[#111111] p-4 rounded-[16px]">
                  <div className="flex items-center gap-3">
                    {g.image && <img src={imgUrl(g.image)} alt="" className="h-10 w-10 rounded object-cover" />}
                    <p className="font-medium text-sm">{g.name} <span className="text-xs text-[#B5B5B5]/60">({g.slug})</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setGameForm({ name: g.name, slug: g.slug, image: g.image || "", active: g.active }); setEditingGame(g._id); setShowGameForm(true); }} className="p-2 text-[#2F9BE6] bg-[#161616]/50 rounded-[14px]"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => void deleteGame(g._id)} className="p-2 text-[#FF4D4F] bg-[#161616]/50 rounded-[14px]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: CONFIG (BANNERS) ─── */}
        {tab === "cấu hình" && (
          <div className="space-y-6">
            <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-5 space-y-6">
              <div><h2 className="font-semibold text-lg">Banner cửa hàng</h2><p className="text-xs text-[#B5B5B5]/80">Chỉ 1 banner hiện có. Dán URL ảnh để thay thế.</p></div>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  value={newBannerUrl}
                  onChange={(e) => setNewBannerUrl(e.target.value)}
                  placeholder="Dán URL ảnh banner"
                  className="min-w-[280px] flex-1 rounded border border-[#1E1E1E] bg-[#050505] p-2 text-sm outline-none"
                />
                <button onClick={() => void handleBannerSave()} disabled={submitting || !newBannerUrl.trim()} className="rounded bg-[#2F9BE6] px-4 py-2 text-sm font-semibold disabled:opacity-50">Lưu banner</button>
              </div>
              {banners[0] ? (
                <div className="relative group overflow-hidden rounded-[14px] border border-[#1E1E1E]">
                  <img src={imgUrl(banners[0])} alt="" className="w-full object-cover" style={{ maxHeight: "360px" }} />
                  <button onClick={() => void deleteBanner(banners[0])} className="absolute top-2 right-2 bg-[#FF4D4F] text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="rounded-[14px] border border-dashed border-[#1E1E1E] bg-[#050505] p-8 text-center text-sm text-[#B5B5B5]/60">Chưa có banner.</div>
              )}
            </div>

            <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">Lucky Wheel</h2>
                  <p className="text-xs text-[#B5B5B5]/80">Bật/tắt event và cấu hình các ô quay. Ô empty là chúc may mắn lần sau.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-[#B5B5B5]">
                  <input
                    type="checkbox"
                    checked={luckyWheel.enabled}
                    onChange={(e) => setLuckyWheel((current) => ({ ...current, enabled: e.target.checked }))}
                  />
                  Enabled
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input value={luckyWheel.title} onChange={(e) => setLuckyWheel((current) => ({ ...current, title: e.target.value }))} className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 text-sm outline-none" placeholder="Event title" />
                <input value={luckyWheel.message} onChange={(e) => setLuckyWheel((current) => ({ ...current, message: e.target.value }))} className="rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 text-sm outline-none" placeholder="Popup message" />
              </div>
              <div className="space-y-3">
                {luckyWheel.slices.map((slice, index) => (
                  <div key={index} className="grid gap-2 rounded-[14px] border border-[#1E1E1E] bg-[#050505] p-3 md:grid-cols-[1fr_140px_120px_auto]">
                    <input value={slice.label} onChange={(e) => updateWheelSlice(index, { label: e.target.value })} className="rounded-[12px] border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm outline-none" placeholder="Label" />
                    <select value={slice.type} onChange={(e) => updateWheelSlice(index, { type: e.target.value as LuckyWheelSlice["type"] })} className="rounded-[12px] border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm outline-none">
                      <option value="empty">Empty</option>
                      <option value="discount">Discount</option>
                    </select>
                    <input type="number" min="0" max="100" value={slice.discountPercent} onChange={(e) => updateWheelSlice(index, { discountPercent: e.target.value === "" ? "" : Number(e.target.value) })} disabled={slice.type === "empty"} className="rounded-[12px] border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm outline-none disabled:opacity-50" placeholder="%" />
                    <button onClick={() => removeWheelSlice(index)} className="rounded-[12px] bg-[#FF4D4F]/15 px-3 py-2 text-sm text-[#FF4D4F]">Remove</button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={addWheelSlice} className="rounded-[14px] bg-[#1E1E1E] px-4 py-2 text-sm">Add slice</button>
                <button onClick={() => void saveLuckyWheel()} disabled={submitting} className="rounded-[14px] bg-[#2F9BE6] px-4 py-2 text-sm font-semibold disabled:opacity-50">Save Lucky Wheel</button>
              </div>
            </div>
          </div>
        )}

        {tab === "liên kết" && (
          <div className="space-y-6">
            <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg">Tài khoản Discord đã liên kết</h2>
                  <p className="text-xs text-[#B5B5B5]/80">Theo dõi token, giỏ hàng, thời gian liên kết. Phục vụ restore sang server mới.</p>
                </div>
                <button onClick={() => void fetchLinkedUsers(linkedUsersPage, linkedUsersSearch)} className="rounded-[14px] border border-[#1E1E1E] bg-[#161616] px-4 py-2 text-sm">
                  Làm mới
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={linkedUsersSearch}
                  onChange={(e) => setLinkedUsersSearch(e.target.value)}
                  placeholder="Tìm theo Discord ID hoặc username"
                  className="min-w-[280px] flex-1 rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 text-sm outline-none"
                />
                <button
                  onClick={() => void fetchLinkedUsers(1, linkedUsersSearch)}
                  disabled={linkedUsersLoading}
                  className="rounded-[14px] bg-[#2F9BE6] px-4 py-3 text-sm font-medium disabled:opacity-50"
                >
                  Tìm
                </button>
              </div>

              <div className="text-sm text-[#B5B5B5]/80">Tổng liên kết: {linkedUsersTotal}</div>

              <div className="grid gap-3">
                {linkedUsersLoading && <p className="text-sm text-[#B5B5B5]/60">Đang tải...</p>}
                {!linkedUsersLoading && linkedUsers.length === 0 && (
                  <div className="rounded-[14px] border border-dashed border-[#1E1E1E] bg-[#050505] p-6 text-sm text-[#B5B5B5]/60">
                    Không có dữ liệu.
                  </div>
                )}
                {linkedUsers.map((linkedUser) => (
                  <div key={linkedUser._id} className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">{linkedUser.discordUsername || "Unknown user"}</p>
                        <p className="text-xs text-[#B5B5B5]/80">Discord ID: {linkedUser.discordId}</p>
                        <div className="flex flex-wrap gap-2 pt-1 text-xs">
                          <span className={"rounded-full px-2 py-1 " + (linkedUser.hasAccessToken ? "bg-[#3DDC84]/15 text-[#3DDC84]" : "bg-[#FF4D4F]/10 text-[#FF4D4F]")}>
                            Access token: {linkedUser.hasAccessToken ? "yes" : "no"}
                          </span>
                          <span className={"rounded-full px-2 py-1 " + (linkedUser.hasRefreshToken ? "bg-[#2F9BE6]/15 text-[#2F9BE6]" : "bg-[#FF4D4F]/10 text-[#FF4D4F]")}>
                            Refresh token: {linkedUser.hasRefreshToken ? "yes" : "no"}
                          </span>
                          <span className="rounded-full bg-[#161616] px-2 py-1 text-[#B5B5B5]">
                            Cart items: {linkedUser.cartItemsCount}
                          </span>
                          <span className="rounded-full bg-[#2F9BE6]/15 px-2 py-1 text-[#49B6FF]">
                            Spins: {linkedUser.luckyWheelTickets || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void grantLuckyWheelTicket(linkedUser.discordId)}
                          disabled={submitting}
                          className="rounded-[14px] bg-[#2F9BE6]/15 px-4 py-2 text-sm text-[#49B6FF] disabled:opacity-50"
                        >
                          Grant spin
                        </button>
                        <button
                          onClick={() => void clearLinkedUserCart(linkedUser.discordId)}
                          disabled={submitting}
                          className="rounded-[14px] bg-[#FF4D4F]/15 px-4 py-2 text-sm text-[#FF4D4F] disabled:opacity-50"
                        >
                          Clear cart
                        </button>
                        <button
                          onClick={() => void unlinkUser(linkedUser.discordId)}
                          disabled={submitting}
                          className="rounded-[14px] bg-[#FF4D4F] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-[#B5B5B5]/80 md:grid-cols-3">
                      <div>Linked at: {formatDateTime(linkedUser.joinedAt)}</div>
                      <div>Token expires: {formatDateTime(linkedUser.tokenExpiresAt)}</div>
                      <div>Cart updated: {formatDateTime(linkedUser.cartUpdatedAt)}</div>
                      <div>First spin award: {formatDateTime(linkedUser.luckyWheelFirstLinkAwardedAt)}</div>
                      <div>Admin granted spins: {linkedUser.luckyWheelTicketsGrantedByAdmin || 0}</div>
                    </div>

                    {Array.isArray(linkedUser.scopes) && linkedUser.scopes.length > 0 && (
                      <p className="mt-2 text-xs text-[#B5B5B5]/70">Scopes: {linkedUser.scopes.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => void fetchLinkedUsers(Math.max(1, linkedUsersPage - 1), linkedUsersSearch)}
                  disabled={linkedUsersPage <= 1 || linkedUsersLoading}
                  className="rounded-[14px] border border-[#1E1E1E] bg-[#161616] px-4 py-2 text-sm disabled:opacity-40"
                >
                  Trang trước
                </button>
                <span className="text-sm text-[#B5B5B5]/80">Trang {linkedUsersPage} / {linkedUsersTotalPages}</span>
                <button
                  onClick={() => void fetchLinkedUsers(Math.min(linkedUsersTotalPages, linkedUsersPage + 1), linkedUsersSearch)}
                  disabled={linkedUsersPage >= linkedUsersTotalPages || linkedUsersLoading}
                  className="rounded-[14px] border border-[#1E1E1E] bg-[#161616] px-4 py-2 text-sm disabled:opacity-40"
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






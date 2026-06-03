"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import Navbar from "../components/Navbar";
import BackButton from "../components/BackButton";
import { useAuthViet } from "../context/AuthVietContext";
import { resolveImageUrl } from "@/lib/imageUrl";
import {
  Search,
  ShoppingCart,
  Package,
  X,
  Minus,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function imgUrl(src: string | undefined | null): string {
  return resolveImageUrl(src, API_BASE);
}

function handleShopImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  const fallbackSrc = image.dataset.fallbackSrc || "/pictures/logo.png";
  if (image.dataset.fallbackApplied === "true") {
    image.style.display = "none";
    return;
  }
  image.dataset.fallbackApplied = "true";
  image.src = fallbackSrc;
}

function formatMoney(value: number | string | undefined | null): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0 VND";
  return n.toLocaleString("vi-VN") + " VND";
}

function formatQtyLabel(quantity: number | undefined | null): string {
  return `(x${Math.max(1, Number(quantity) || 1)})`;
}

const ProductCard = memo(function ProductCard({
  product,
  index,
  onOpen,
  variant = "default",
}: {
  product: Product;
  index: number;
  onOpen: (product: Product) => void;
  variant?: "default" | "bestSeller";
}) {
  const handleOpen = useCallback(() => onOpen(product), [onOpen, product]);

  return (
    <div
      onClick={handleOpen}
      className="group product-card cursor-pointer overflow-hidden rounded-[22px] border border-[#1E1E1E] bg-[#111111] shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-all duration-200 active:scale-[0.98] animate-card-in md:transition-transform md:duration-200 md:hover:scale-[1.03]"
      style={{ animationDelay: `${index * (variant === "bestSeller" ? 0.08 : 0.05)}s` }}
    >
      <div className="aspect-square bg-[#050505] overflow-hidden">
        {product.image ? (
          <img src={imgUrl(product.image)} alt={product.name} loading="lazy" onError={handleShopImageError} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-[#B5B5B5]/50" /></div>
        )}
      </div>
      {variant === "bestSeller" ? (
        <div className="p-3">
          <p className="line-clamp-2 text-sm font-semibold leading-5">{product.name}</p>
          <p className="text-xs text-[#2F9BE6] mt-0.5">{formatQtyLabel(product.packQuantity)}</p>
          {product.desc && <p className="text-xs text-[#B5B5B5] mt-1 line-clamp-2">{product.desc}</p>}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-[#3DDC84]">{formatMoney(product.price)}</span>
            <span className="text-xs text-[#2F9BE6]">Xem</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5">{product.name}</h3>
          <p className="text-xs text-[#2F9BE6] mt-0.5">{formatQtyLabel(product.packQuantity)}</p>
          <p className="text-xs text-[#B5B5B5]/80">{product.category}</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-[#3DDC84]">{formatMoney(product.price)}</span>
            <span className="text-xs text-[#2F9BE6]">Xem</span>
          </div>
        </div>
      )}
    </div>
  );
});

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-[#2F9BE6]" />
    </div>
  );
}

function LogoLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050505]/95 backdrop-blur-sm">
      <style>{`
        @keyframes logoSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes barFill {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>

      <div className="relative mb-4 h-24 w-80 max-w-[80vw] overflow-hidden rounded-[18px] border border-[#1E1E1E] bg-[#0A0A0A]">
        <div className="absolute inset-x-5 bottom-5 h-px bg-[#2F9BE6]/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10" style={{ animation: "logoSpin 2s linear infinite" }}>
          <img src="/pictures/logo.png" alt="Loading" className="h-full w-full rounded-[10px] object-contain" />
        </div>
      </div>

      <div className="relative mb-6 w-80 max-w-[80vw]">
        <div className="h-3 overflow-hidden rounded-full border border-[#2F9BE6]/30 bg-[#111111]">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 animate-[barFill_2.5s_ease-in-out_infinite]" />
        </div>
      </div>

      <p className="px-4 text-center text-sm font-medium text-white">Vui long doi...</p>
    </div>
  );
}

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  bulkPrice?: number;
  packQuantity?: number;
  image?: string;
  desc?: string;
  gameId?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Game {
  _id: string;
  name: string;
  slug: string;
  image?: string;
}

interface CheckoutSummary {
  subtotalAmount: number;
  discountAmount: number;
  discountPercent: number;
  totalAmount: number;
  couponCode?: string;
  items: Array<{ product?: string; _id?: string; name: string; quantity: number; packQuantity?: number; price: number }>;
}

type PriceSort = "none" | "low-high" | "high-low";

export default function CuaHangPage() {
  const { user, token, isLoading: authLoading, soDuVnd, daDangNhap, daLienKetDiscord, getDiscordOAuthUrl, lamMoiVi } = useAuthViet();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [bestSellerIds, setBestSellerIds] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceSort, setPriceSort] = useState<PriceSort>("none");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartClosing, setCartClosing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);
  const [ticketCreating, setTicketCreating] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ channelId: string; url?: string } | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState<string | number>(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const lastActionRef = useRef(0);
  const searchDebounceRef = useRef<number | null>(null);

  const ACTION_COOLDOWN_MS = 450;
  const canAct = () => {
    if (submitting || Date.now() - lastActionRef.current < ACTION_COOLDOWN_MS) return false;
    lastActionRef.current = Date.now();
    return true;
  };

  const saveCart = useCallback((newCart: CartItem[]) => {
    setCart(newCart);
  }, []);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  }, [cart]);

  const cartTotalAfterDiscount = useMemo(() => {
    if (!checkoutSummary) return cartSubtotal;
    return checkoutSummary.totalAmount;
  }, [cartSubtotal, checkoutSummary]);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, gRes, cRes] = await Promise.all([
        fetch("/api/shop/products", { cache: "no-store" }),
        fetch("/api/shop/games?nocache=" + Date.now(), { cache: "no-store" }),
        fetch("/api/shop/config", { cache: "no-store" }),
      ]);
      const pData = await pRes.json();
      const gData = await gRes.json();
      const cData = await cRes.json();
      setProducts(Array.isArray(pData) ? pData : []);
      setGames(Array.isArray(gData) ? gData : []);
      setBestSellerIds(Array.isArray(cData.bestSellerIds) ? cData.bestSellerIds : []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    if (searchInput !== searchQuery) {
      searchDebounceRef.current = window.setTimeout(() => {
        setSearchQuery(searchInput);
      }, 300);
    }
    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput, searchQuery]);

  useEffect(() => {
    if (daDangNhap) {
      setShowLoginPrompt(false);
    }
  }, [daDangNhap, authLoading]);

  const activeSelectedGame = selectedGame && games.some((g) => g._id === selectedGame)
    ? selectedGame
    : null;

  const filtered = useMemo(() => {
    let list = products;
    if (activeSelectedGame) list = list.filter((p) => p.gameId === activeSelectedGame);
    if (searchQuery) list = list.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (priceSort !== "none") {
      list = [...list].sort((a, b) => priceSort === "low-high" ? a.price - b.price : b.price - a.price);
    }
    return list;
  }, [activeSelectedGame, priceSort, products, searchQuery]);

  const bestSellers = useMemo(() => {
    if (bestSellerIds.length === 0) return [];
    const bs: Product[] = [];
    for (const id of bestSellerIds) {
      const p = products.find((x) => x._id === id);
      if (p) bs.push(p);
    }
    return bs;
  }, [products, bestSellerIds]);

  const handleOpenProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setModalQty(1);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalClosing(true);
    setTimeout(() => {
      setModalOpen(false);
      setModalClosing(false);
      setSelectedProduct(null);
      setModalQty(1);
    }, 200);
  }, []);

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct || !canAct()) return;

    const qty = Math.max(1, Number(modalQty) || 1);
    const existingIdx = cart.findIndex((item) => item._id === selectedProduct._id);

    if (existingIdx >= 0) {
      const newCart = [...cart];
      newCart[existingIdx] = { ...newCart[existingIdx], quantity: newCart[existingIdx].quantity + qty };
      saveCart(newCart);
    } else {
      const newItem: CartItem = { ...selectedProduct, quantity: qty };
      saveCart([...cart, newItem]);
    }

    handleCloseModal();
  }, [cart, modalQty, selectedProduct, saveCart, handleCloseModal]);

  const handleUpdateCartQty = useCallback((idx: number, delta: number) => {
    const newCart = [...cart];
    const newQty = Math.max(1, newCart[idx].quantity + delta);
    if (newQty <= 0) {
      newCart.splice(idx, 1);
    } else {
      newCart[idx] = { ...newCart[idx], quantity: newQty };
    }
    saveCart(newCart);
  }, [cart, saveCart]);

  const handleRemoveFromCart = useCallback((idx: number) => {
    const newCart = [...cart];
    newCart.splice(idx, 1);
    saveCart(newCart);
  }, [cart, saveCart]);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim() || cart.length === 0 || !canAct()) return;
    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/shop/coupon-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ product: i._id, quantity: i.quantity })),
          couponCode: couponCode.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCouponError(data?.message || "Ma giam gia khong hop le");
        setCheckoutSummary(null);
        return;
      }

      setCheckoutSummary({
        subtotalAmount: data.subtotalAmount || cartSubtotal,
        discountAmount: data.discountAmount || 0,
        discountPercent: data.discountPercent || 0,
        totalAmount: data.totalAmount || cartSubtotal,
        couponCode: couponCode.trim(),
        items: [],
      });
    } catch {
      setCouponError("Loi he thong");
      setCheckoutSummary(null);
    } finally {
      setCouponLoading(false);
    }
  }, [cart, cartSubtotal, couponCode]);

  const openCheckout = useCallback(() => {
    if (cart.length === 0) return;
    setCheckoutSummary(null);
    setError(null);
    if (!daDangNhap) {
      setShowLoginPrompt(true);
      return;
    }
    setCheckoutConfirmOpen(true);
  }, [cart.length, daDangNhap]);

  const handleConfirmCheckout = useCallback(async () => {
    if (!canAct() || cart.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const itemsPayload = cart.map((i) => ({
        sanPhamId: i._id,
        soLuong: i.quantity,
        tenSanPham: i.name,
        donGiaVnd: i.price,
      }));

      const res = await fetch("/api/don-hang/dat-hang", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: itemsPayload,
          couponCode: checkoutSummary?.couponCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Dat hang that bai");
        return;
      }

      setOrderId(data.orderId || data._id);
      setCheckoutSuccess(true);
      setCheckoutConfirmOpen(false);

      await lamMoiVi();
    } catch {
      setError("Loi he thong");
    } finally {
      setSubmitting(false);
    }
  }, [cart, checkoutSummary, token, lamMoiVi]);

  const handleCreateTicket = useCallback(async () => {
    if (!orderId || !canAct()) return;

    setTicketCreating(true);
    setTicketError(null);

    try {
      const res = await fetch(`/api/don-hang/${orderId}/tao-ticket`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setTicketError(data?.message || "Tao ticket that bai");
        return;
      }

      setTicketResult({
        channelId: data.channelId || "",
        url: data.url,
      });
    } catch {
      setTicketError("Loi he thong");
    } finally {
      setTicketCreating(false);
    }
  }, [orderId, token]);

  const handleCloseCart = useCallback(() => {
    setCartClosing(true);
    setTimeout(() => {
      setCartOpen(false);
      setCartClosing(false);
    }, 200);
  }, []);

  const DISCORD_SERVER_INVITE = "https://discord.gg/shopvn";

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-card-in {
          animation: cardIn 0.4s ease-out forwards;
          opacity: 0;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out forwards;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-once {
          animation: pulse 0.4s ease-out;
        }
      `}</style>

      <Navbar cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} showCart onCartClick={() => setCartOpen(true)} />

      {/* Hero Section */}
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <BackButton href="/" label="Trang Chủ" variant="home" />
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Cua Hang Game</h1>
          <p className="mt-2 text-[#B5B5B5]">Mua kim cuong, the game, voucher voi gia tot nhat</p>
        </div>
      </div>

      {/* Best Sellers Carousel */}
      {bestSellers.length > 0 && (
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-4 text-xl font-semibold text-white">San Pham Ban Chay</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
              {bestSellers.slice(0, 4).map((product, idx) => (
                <ProductCard key={product._id} product={product} index={idx} onOpen={handleOpenProduct} variant="bestSeller" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B5B5B5]" />
              <input
                type="text"
                placeholder="Tim san pham..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#111111] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#B5B5B5] focus:border-[#2F9BE6] focus:outline-none"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3">
              {/* Game Filter Pills */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGame(null)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    !selectedGame
                      ? "bg-[#2F9BE6] text-white"
                      : "border border-[#1E1E1E] bg-[#111111] text-[#B5B5B5] hover:border-[#2F9BE6]"
                  }`}
                >
                  Tat ca
                </button>
                {games.slice(0, 5).map((game) => (
                  <button
                    key={game._id}
                    onClick={() => setSelectedGame(game._id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      selectedGame === game._id
                        ? "bg-[#2F9BE6] text-white"
                        : "border border-[#1E1E1E] bg-[#111111] text-[#B5B5B5] hover:border-[#2F9BE6]"
                    }`}
                  >
                    {game.name}
                  </button>
                ))}
              </div>

              {/* Price Sort */}
              <select
                value={priceSort}
                onChange={(e) => setPriceSort(e.target.value as PriceSort)}
                className="rounded-[12px] border border-[#1E1E1E] bg-[#111111] px-3 py-1.5 text-sm text-white focus:border-[#2F9BE6] focus:outline-none"
              >
                <option value="none">Gia mac dinh</option>
                <option value="low-high">Gia: Thap den Cao</option>
                <option value="high-low">Gia: Cao den Thap</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((product, index) => (
              <ProductCard key={product._id} product={product} index={index} onOpen={handleOpenProduct} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-[#B5B5B5]/50" />
              <p className="mt-4 text-[#B5B5B5]">Khong tim thay san pham</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <>
          <div
            className={`fixed inset-0 z-[90] bg-black/60 ${cartClosing ? "animate-fade-in" : ""}`}
            onClick={handleCloseCart}
          />
          <div
            className={`fixed right-0 top-0 z-[100] h-full w-full max-w-md bg-[#111111] shadow-2xl ${
              cartClosing ? "animate-slide-up" : "animate-fade-in"
            }`}
            style={{ animationFillMode: "forwards" }}
          >
            <div className="flex h-full flex-col">
              {/* Cart Header */}
              <div className="flex items-center justify-between border-b border-[#1E1E1E] p-4">
                <h2 className="text-lg font-semibold text-white">Gio Hang</h2>
                <button onClick={handleCloseCart} className="rounded-lg p-2 hover:bg-[#1E1E1E]">
                  <X className="h-5 w-5 text-[#B5B5B5]" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center">
                    <ShoppingCart className="h-12 w-12 text-[#B5B5B5]/50" />
                    <p className="mt-4 text-[#B5B5B5]">Gio hang trong</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item, idx) => (
                      <div key={item._id} className="flex gap-3 rounded-[12px] border border-[#1E1E1E] bg-[#0A0A0A] p-3">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-[#050505]">
                          {item.image ? (
                            <img src={imgUrl(item.image)} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Package className="h-6 w-6 text-[#B5B5B5]/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="truncate text-sm font-medium text-white">{item.name}</h3>
                          <p className="text-xs text-[#2F9BE6]">{formatQtyLabel(item.packQuantity)}</p>
                          <p className="text-sm font-semibold text-[#3DDC84]">{formatMoney(item.price)}</p>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          <button
                            onClick={() => handleRemoveFromCart(idx)}
                            className="rounded p-1 hover:bg-[#1E1E1E]"
                          >
                            <X className="h-4 w-4 text-[#B5B5B5]" />
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateCartQty(idx, -1)}
                              className="rounded bg-[#1E1E1E] p-1 hover:bg-[#2F9BE6]/20"
                            >
                              <Minus className="h-3 w-3 text-white" />
                            </button>
                            <span className="min-w-[24px] text-center text-sm text-white">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateCartQty(idx, 1)}
                              className="rounded bg-[#1E1E1E] p-1 hover:bg-[#2F9BE6]/20"
                            >
                              <Plus className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="border-t border-[#1E1E1E] p-4 space-y-4">
                  {/* Coupon Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ma giam gia"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 rounded-[12px] border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#B5B5B5] focus:border-[#2F9BE6] focus:outline-none"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="rounded-[12px] bg-[#2F9BE6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F9BE6]/80 disabled:opacity-50"
                    >
                      {couponLoading ? "Dang..." : "Ap dung"}
                    </button>
                  </div>

                  {couponError && (
                    <p className="text-sm text-[#FF4D4F]">{couponError}</p>
                  )}

                  {checkoutSummary && checkoutSummary.discountAmount > 0 && (
                    <div className="rounded-[12px] bg-[#3DDC84]/10 p-3">
                      <p className="text-sm text-[#3DDC84]">
                        Giam gia {checkoutSummary.discountPercent}% ({formatMoney(checkoutSummary.discountAmount)})
                      </p>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B5B5B5]">Tam tinh:</span>
                      <span className="text-white">{formatMoney(cartSubtotal)}</span>
                    </div>
                    {checkoutSummary && checkoutSummary.discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#B5B5B5]">Giam gia:</span>
                        <span className="text-[#3DDC84]">-{formatMoney(checkoutSummary.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-white">Tong cong:</span>
                      <span className="text-[#3DDC84]">{formatMoney(cartTotalAfterDiscount)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={openCheckout}
                    disabled={submitting}
                    className="w-full rounded-[12px] bg-[#3DDC84] py-3 text-base font-semibold text-white hover:bg-[#3DDC84]/80 disabled:opacity-50"
                  >
                    {submitting ? "Dang xu ly..." : "Thanh Toan"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Product Detail Modal */}
      {modalOpen && selectedProduct && (
        <>
          <div
            className={`fixed inset-0 z-[100] bg-black/70 ${modalClosing ? "animate-fade-in" : ""}`}
            onClick={handleCloseModal}
          />
          <div
            className={`fixed left-1/2 top-1/2 z-[110] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-[#1E1E1E] bg-[#111111] p-6 shadow-2xl ${
              modalClosing ? "animate-slide-up" : "animate-fade-in"
            }`}
            style={{ animationFillMode: "forwards" }}
          >
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 rounded-lg p-2 hover:bg-[#1E1E1E]"
            >
              <X className="h-5 w-5 text-[#B5B5B5]" />
            </button>

            <div className="space-y-4">
              {/* Product Image */}
              <div className="aspect-square w-full overflow-hidden rounded-[16px] bg-[#050505]">
                {selectedProduct.image ? (
                  <img src={imgUrl(selectedProduct.image)} alt={selectedProduct.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-16 w-16 text-[#B5B5B5]/50" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedProduct.name}</h2>
                <p className="text-sm text-[#2F9BE6]">{formatQtyLabel(selectedProduct.packQuantity)}</p>
                <p className="text-sm text-[#B5B5B5]">{selectedProduct.category}</p>
                {selectedProduct.desc && (
                  <p className="mt-2 text-sm text-[#B5B5B5]">{selectedProduct.desc}</p>
                )}
              </div>

              {/* Price */}
              <div className="text-2xl font-bold text-[#3DDC84]">{formatMoney(selectedProduct.price)}</div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#B5B5B5]">So luong:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalQty((prev) => Math.max(1, Number(prev) - 1))}
                    className="rounded-lg bg-[#1E1E1E] p-2 hover:bg-[#2F9BE6]/20"
                  >
                    <Minus className="h-4 w-4 text-white" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={modalQty}
                    onChange={(e) => setModalQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-center text-white focus:border-[#2F9BE6] focus:outline-none"
                  />
                  <button
                    onClick={() => setModalQty((prev) => Number(prev) + 1)}
                    className="rounded-lg bg-[#1E1E1E] p-2 hover:bg-[#2F9BE6]/20"
                  >
                    <Plus className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={submitting}
                className="w-full rounded-[12px] bg-[#2F9BE6] py-3 text-base font-semibold text-white hover:bg-[#2F9BE6]/80 disabled:opacity-50"
              >
                Them vao gio hang
              </button>
            </div>
          </div>
        </>
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/70 animate-fade-in" onClick={() => setShowLoginPrompt(false)} />
          <div className="fixed left-1/2 top-1/2 z-[110] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-[#1E1E1E] bg-[#111111] p-6 shadow-2xl animate-slide-up" style={{ animationFillMode: "forwards" }}>
            <button onClick={() => setShowLoginPrompt(false)} className="absolute right-4 top-4 rounded-lg p-2 hover:bg-[#1E1E1E]">
              <X className="h-5 w-5 text-[#B5B5B5]" />
            </button>

            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-[#FF4D4F]" />
              </div>
              <h2 className="text-xl font-semibold text-white">Vui long dang nhap</h2>
              <p className="text-[#B5B5B5]">Ban can dang nhap de mua hang</p>

              <div className="flex flex-col gap-3 pt-4">
                <a
                  href="/dang-nhap"
                  className="w-full rounded-[12px] bg-[#2F9BE6] py-3 text-base font-semibold text-white hover:bg-[#2F9BE6]/80"
                >
                  Dang Nhap
                </a>
                <a
                  href="/dang-ky"
                  className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#0A0A0A] py-3 text-base font-medium text-white hover:border-[#2F9BE6]"
                >
                  Dang Ky
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Checkout Confirm Modal */}
      {checkoutConfirmOpen && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/70 animate-fade-in" onClick={() => !submitting && setCheckoutConfirmOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-[110] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-[#1E1E1E] bg-[#111111] p-6 shadow-2xl animate-slide-up" style={{ animationFillMode: "forwards" }}>
            <button
              onClick={() => !submitting && setCheckoutConfirmOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-2 hover:bg-[#1E1E1E]"
              disabled={submitting}
            >
              <X className="h-5 w-5 text-[#B5B5B5]" />
            </button>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Xac Nhan Dat Hang</h2>

              {/* Order Summary */}
              <div className="rounded-[12px] border border-[#1E1E1E] bg-[#0A0A0A] p-4 space-y-2">
                {cart.map((item) => (
                  <div key={item._id} className="flex justify-between text-sm">
                    <span className="text-[#B5B5B5]">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="text-white">{formatMoney(Number(item.price) * item.quantity)}</span>
                  </div>
                ))}
                <div className="border-t border-[#1E1E1E] pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#B5B5B5]">Tam tinh:</span>
                    <span className="text-white">{formatMoney(cartSubtotal)}</span>
                  </div>
                  {checkoutSummary && checkoutSummary.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B5B5B5]">Giam gia:</span>
                      <span className="text-[#3DDC84]">-{formatMoney(checkoutSummary.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-white">Tong cong:</span>
                    <span className="text-[#3DDC84]">{formatMoney(cartTotalAfterDiscount)}</span>
                  </div>
                </div>
              </div>

              {/* Wallet Balance */}
              <div className="rounded-[12px] border border-[#1E1E1E] bg-[#0A0A0A] p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#B5B5B5]">So du vi:</span>
                  <span className="text-white">{formatMoney(soDuVnd)}</span>
                </div>
              </div>

              {/* Error if insufficient balance */}
              {soDuVnd < cartTotalAfterDiscount && (
                <div className="rounded-[12px] bg-[#FF4D4F]/10 p-4">
                  <div className="flex items-center gap-2 text-[#FF4D4F]">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">So du khong du. Vui long nap them tien.</span>
                  </div>
                  <a
                    href="/nap-tien"
                    className="mt-3 inline-block w-full rounded-[12px] bg-[#2F9BE6] py-2 text-center text-sm font-medium text-white hover:bg-[#2F9BE6]/80"
                  >
                    Nap Tien
                  </a>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="rounded-[12px] bg-[#FF4D4F]/10 p-3">
                  <p className="text-sm text-[#FF4D4F]">{error}</p>
                </div>
              )}

              {/* Confirm Button */}
              {soDuVnd >= cartTotalAfterDiscount && (
                <button
                  onClick={handleConfirmCheckout}
                  disabled={submitting}
                  className="w-full rounded-[12px] bg-[#3DDC84] py-3 text-base font-semibold text-white hover:bg-[#3DDC84]/80 disabled:opacity-50"
                >
                  {submitting ? "Dang xu ly..." : "Xac Nhan Thanh Toan"}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Checkout Success Modal */}
      {checkoutSuccess && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/70 animate-fade-in" onClick={() => setCheckoutSuccess(false)} />
          <div className="fixed left-1/2 top-1/2 z-[110] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-[#1E1E1E] bg-[#111111] p-6 shadow-2xl animate-slide-up" style={{ animationFillMode: "forwards" }}>
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-[#3DDC84]" />
              </div>
              <h2 className="text-xl font-semibold text-white">Dat Hang Thanh Cong</h2>
              <p className="text-[#B5B5B5]">Don hang #{orderId} da duoc tao</p>

              {/* Create Delivery Ticket Section */}
              <div className="mt-6 space-y-3 rounded-[12px] border border-[#1E1E1E] bg-[#0A0A0A] p-4 text-left">
                <h3 className="font-semibold text-white">Tao Ticket Giao Hang</h3>

                {!daLienKetDiscord ? (
                  <a
                    href={getDiscordOAuthUrl()}
                    className="block rounded-[12px] bg-[#5865F2] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[#5865F2]/80"
                  >
                    Lien Ket Discord
                  </a>
                ) : (
                  <>
                    <a
                      href={DISCORD_SERVER_INVITE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-[12px] bg-[#5865F2] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[#5865F2]/80"
                    >
                      Tham Gia Server Discord
                    </a>

                    {ticketResult ? (
                      <div className="rounded-[12px] bg-[#3DDC84]/10 p-3">
                        <p className="text-sm text-[#3DDC84]">Ticket da duoc tao!</p>
                        {ticketResult.url && (
                          <a
                            href={ticketResult.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block text-sm text-[#2F9BE6] hover:underline"
                          >
                            Mo ticket
                          </a>
                        )}
                      </div>
                    ) : ticketError ? (
                      <p className="text-sm text-[#FF4D4F]">{ticketError}</p>
                    ) : (
                      <button
                        onClick={handleCreateTicket}
                        disabled={ticketCreating}
                        className="w-full rounded-[12px] bg-[#2F9BE6] py-2 text-sm font-medium text-white hover:bg-[#2F9BE6]/80 disabled:opacity-50"
                      >
                        {ticketCreating ? "Dang tao..." : "Tao Ticket"}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Done Button */}
              <button
                onClick={() => {
                  setCheckoutSuccess(false);
                  setCart([]);
                  setOrderId(null);
                  setTicketResult(null);
                }}
                className="w-full rounded-[12px] bg-[#1E1E1E] py-3 text-base font-medium text-white hover:bg-[#2F9BE6]/20"
              >
                Hoan Tat
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
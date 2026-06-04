"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { resolveImageUrl } from "@/lib/imageUrl";
import { getDeviceFingerprintHash } from "@/lib/fingerprint";
import {
  Search,
  ShoppingCart,
  Package,
  X,
  Minus,
  Plus,
  User,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Copy,
  CreditCard,
  QrCode,
  AlertCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const VISITOR_NOTICE_DISMISSED_KEY = "visitorNoticeDismissed";
const LUCKY_WHEEL_NOTICE_KEY = "luckyWheelNoticeDismissed";

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

function buildCartCouponKey(code: string, items: CartItem[]): string {
  return `${code.trim().toUpperCase()}|${items.map((item) => `${item._id}:${item.quantity}:${Number(item.price || 0)}`).join(",")}`;
}

function formatMoney(value: number | string | undefined | null): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0 VND";
  return `${n.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} VND`;
}

function formatQtyLabel(quantity: number | undefined | null): string {
  return `(x${Math.max(1, Number(quantity) || 1)})`;
}

function formatPurchasedQtyLabel(item: { packQuantity?: number; quantity?: number }): string {
  const packQty = Math.max(1, Number(item.packQuantity) || 1);
  const orderQty = Math.max(1, Number(item.quantity) || 1);
  return `(x${packQty * orderQty})`;
}

function formatProductNameWithQty(name: string, quantity: number | undefined | null): string {
  return `${name} ${formatQtyLabel(quantity)}`;
}

function formatPurchasedProductName(item: { name: string; packQuantity?: number; quantity?: number }): string {
  return `${item.name} ${formatPurchasedQtyLabel(item)}`;
}

function DiscordIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20.32 4.37A19.8 19.8 0 0 0 15.36 2.8a13.7 13.7 0 0 0-.64 1.32 18.4 18.4 0 0 0-5.44 0 12.9 12.9 0 0 0-.65-1.32 19.7 19.7 0 0 0-4.95 1.57C.55 9.03-.32 13.58.1 18.07a19.9 19.9 0 0 0 6.08 3.08 14.5 14.5 0 0 0 1.3-2.1 12.8 12.8 0 0 1-2.05-.98c.17-.13.34-.26.5-.4a14.1 14.1 0 0 0 12.14 0l.5.4c-.65.39-1.33.72-2.05.98.38.74.82 1.44 1.3 2.1a19.8 19.8 0 0 0 6.08-3.08c.5-5.2-.86-9.7-3.58-13.7ZM8.02 15.31c-1.18 0-2.15-1.08-2.15-2.41 0-1.34.95-2.42 2.15-2.42s2.17 1.1 2.15 2.42c0 1.33-.95 2.41-2.15 2.41Zm7.96 0c-1.18 0-2.15-1.08-2.15-2.41 0-1.34.95-2.42 2.15-2.42s2.17 1.1 2.15 2.42c0 1.33-.95 2.41-2.15 2.41Z" />
    </svg>
  );
}

function RobloxIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M7.1 2 22 6.1 17.9 22 2 17.9 6.1 2h1Zm3.72 7.2-1.62 5.98 5.98 1.62 1.62-5.98-5.98-1.62Zm1.28 2.6 2.1.57-.57 2.1-2.1-.57.57-2.1Z" />
    </svg>
  );
}

interface Product { _id: string; name: string; category: string; price: number; bulkPrice?: number; packQuantity?: number; image?: string; desc?: string; gameId?: string }
interface CartItem extends Product { quantity: number }
interface Game { _id: string; name: string; slug: string; image?: string }
interface Purchase { username: string; items: string; price?: number }
interface TicketResult { channelId: string; guildId?: string; url?: string }
interface LuckyWheelSlice { label: string; type: "empty" | "discount"; discountPercent: number }
interface LuckyWheelCoupon { couponCode: string; discountPercent: number }
interface LuckyWheelConfig { enabled: boolean; title: string; message: string; slices: LuckyWheelSlice[]; tickets: number; latestCoupon?: LuckyWheelCoupon | null }
interface LuckyWheelResult { result: "empty" | "discount"; message: string; couponCode?: string; discountPercent?: number; tickets: number; prizeIndex?: number; sliceCount?: number }
interface CheckoutSummary {
  subtotalAmount: number;
  discountAmount: number;
  discountPercent: number;
  couponDiscountPercent?: number;
  referralDiscountPercent?: number;
  totalAmount: number;
  couponCode?: string;
  items: Array<{ product?: string; _id?: string; name: string; quantity: number; packQuantity?: number; price: number }>;
}

type Step = "shop" | "roblox" | "ticket";
type PriceSort = "none" | "low-high" | "high-low";
type PaymentGuide = "paypal_ff" | "ltc";

const BEST_SELLERS_PER_PAGE = 4;
const PENDING_CHECKOUT_KEY = "pendingCheckout";
const PAYPAL_EMAIL = "nguyenquanghuy111106@gmail.com";
const LTC_ADDRESS = "ltc1ququ7e6ryccpnu7jgy0l4vukgc3mventxyulyge";
const WHEEL_SPIN_DURATION_MS = 4200;
const WELCOME_VOUCHER_CODE = "WELCOME20";

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
      className="group product-card cursor-pointer overflow-hidden rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_8px_32px_rgba(30,144,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-500 active:scale-[0.98] animate-card-in md:transition-transform md:duration-300 md:hover:scale-[1.02] md:hover:border-white/20 md:hover:shadow-[0_20px_60px_rgba(30,144,255,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
      style={{ animationDelay: `${index * (variant === "bestSeller" ? 0.08 : 0.05)}s` }}
    >
      <div className="aspect-square bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 overflow-hidden">
        {product.image ? (
          <img src={imgUrl(product.image)} alt={product.name} loading="lazy" onError={handleShopImageError} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-blue-300/50" /></div>
        )}
      </div>
      {variant === "bestSeller" ? (
        <div className="p-4">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-white/90">{product.name}</p>
          <p className="text-xs text-blue-300/80 mt-0.5">{formatQtyLabel(product.packQuantity)}</p>
          {product.desc && <p className="text-xs text-white/50 mt-1 line-clamp-2">{product.desc}</p>}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-blue-300">{formatMoney(product.price)}</span>
            <span className="text-xs text-cyan-300/80 font-medium">Xem</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2 p-4 sm:p-5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white/90">{product.name}</h3>
          <p className="text-xs text-blue-300/80 mt-0.5">{formatQtyLabel(product.packQuantity)}</p>
          <p className="text-xs text-white/40">{product.category}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-bold text-blue-300">{formatMoney(product.price)}</span>
            <span className="text-xs text-cyan-300/80 font-medium">Xem</span>
          </div>
        </div>
      )}
    </div>
  );
});

function LogoLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-sky-950 via-blue-950/80 to-cyan-950">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 via-cyan-400/30 to-blue-300/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-2xl"></div>
        <Loader2 className="h-12 w-12 animate-spin text-blue-300/80" />
      </div>
      <p className="mt-4 text-sm font-medium text-blue-200/80">Đang tải cửa hàng...</p>
    </div>
  );
}

export default function ShopPage() {
  const { user, token, isLoading: authLoading, getOAuthUrl } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [banners, setBanners] = useState<string[]>([]);
  const [bestSellerIds, setBestSellerIds] = useState<string[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartClosing, setCartClosing] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>("shop");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [priceSort, setPriceSort] = useState<PriceSort>("none");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState<CheckoutSummary | null>(null);
  const [couponPreviewKey, setCouponPreviewKey] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralPreviewOwner, setReferralPreviewOwner] = useState("");
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralApplying, setReferralApplying] = useState(false);
  const [myReferralCode, setMyReferralCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartToolsOpen, setCartToolsOpen] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const [robloxUsernameInput, setRobloxUsernameInput] = useState("");
  const [robloxSearchResult, setRobloxSearchResult] = useState<null | { userId: string; username: string; displayName: string; avatar: string }>(null);
  const [selectedPaymentGuide, setSelectedPaymentGuide] = useState<PaymentGuide>("paypal_ff");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = useState("");
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null);
  const [showVisitorNotice, setShowVisitorNotice] = useState(false);
  const [showLuckyWheelNotice, setShowLuckyWheelNotice] = useState(false);
  const [luckyWheel, setLuckyWheel] = useState<LuckyWheelConfig | null>(null);
  const [luckyWheelLoading, setLuckyWheelLoading] = useState(false);
  const [luckyWheelResult, setLuckyWheelResult] = useState<LuckyWheelResult | null>(null);
  const [copiedLuckyCode, setCopiedLuckyCode] = useState(false);
  const [copiedWelcomeCode, setCopiedWelcomeCode] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState<string | number>(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [welcomeVoucherVisible, setWelcomeVoucherVisible] = useState(true);
  const [bestSellerPage, setBestSellerPage] = useState(0);

  const remoteCartHydratedRef = useRef(false);
  const skipNextRemoteCartSyncRef = useRef(false);
  const checkoutInFlightRef = useRef(false);
  const ticketInFlightRef = useRef(false);
  const lastActionRef = useRef(0);
  const searchDebounceRef = useRef<number | null>(null);
  const luckyWheelResultTimeoutRef = useRef<number | null>(null);

  const ACTION_COOLDOWN_MS = 450;
  const canAct = () => {
    if (submitting || Date.now() - lastActionRef.current < ACTION_COOLDOWN_MS) return false;
    lastActionRef.current = Date.now();
    return true;
  };

  const saveCart = useCallback((newCart: CartItem[], options?: { skipRemoteSync?: boolean }) => {
    if (options?.skipRemoteSync) skipNextRemoteCartSyncRef.current = true;
    const nextCouponKey = buildCartCouponKey(couponCode, newCart);
    if (!couponPreviewKey || couponPreviewKey !== nextCouponKey) {
      setCouponPreview(null);
      setCouponPreviewKey("");
      setCouponMessage("");
    }
    setCart(newCart);
  }, [couponCode, couponPreviewKey]);

  const syncCartToAccount = useCallback(async (nextCart: CartItem[]) => {
    if (!token) return;
    await fetch("/api/shop/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cartItems: nextCart.map((i) => ({ product: i._id, quantity: i.quantity })) }),
    });
  }, [token]);

  const fetchRemoteCart = useCallback(async (signal?: AbortSignal): Promise<CartItem[]> => {
    if (!token) return [];
    const res = await fetch("/api/shop/cart", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load cart");
    return Array.isArray(data?.items) ? (data.items as CartItem[]) : [];
  }, [token]);

  const loadRecentPurchases = useCallback(async () => {
    const res = await fetch("/api/shop/recent-purchases?limit=7", { cache: "no-store" });
    const data = await res.json();
    setRecentPurchases(Array.isArray(data) ? data.slice(0, 7) : []);
  }, []);

  const loadLuckyWheel = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/shop/lucky-wheel", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load lucky wheel");
    setLuckyWheel({
      enabled: Boolean(data.enabled),
      title: data.title || "Lucky Wheel Event",
      message: data.message || "We are running a limited lucky wheel event.",
      slices: Array.isArray(data.slices) ? data.slices : [],
      tickets: Math.max(0, Number(data.tickets || 0)),
      latestCoupon: data.latestCoupon || null,
    });
    if (data?.latestCoupon?.couponCode) {
      setLuckyWheelResult({
        result: "discount",
        message: `${Number(data.latestCoupon.discountPercent || 0)}% discount unlocked.`,
        couponCode: data.latestCoupon.couponCode,
        discountPercent: Number(data.latestCoupon.discountPercent || 0),
        tickets: Math.max(0, Number(data.tickets || 0)),
      });
      setCopiedLuckyCode(false);
    } else {
      setLuckyWheelResult(null);
      setCopiedLuckyCode(false);
    }
    if (data?.enabled && typeof window !== "undefined" && window.localStorage.getItem(LUCKY_WHEEL_NOTICE_KEY) !== "1") {
      setShowLuckyWheelNotice(true);
    }
  }, [token]);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, gRes, cRes, rRes] = await Promise.all([
        fetch("/api/shop/products", { cache: "no-store" }),
        fetch("/api/shop/games?nocache=" + Date.now(), { cache: "no-store" }),
        fetch("/api/shop/config", { cache: "no-store" }),
        fetch("/api/shop/recent-purchases?limit=7", { cache: "no-store" }),
      ]);
      const pData = await pRes.json();
      const gData = await gRes.json();
      const cData = await cRes.json();
      const rData = await rRes.json();
      setProducts(Array.isArray(pData) ? pData : []);
      setGames(Array.isArray(gData) ? gData : []);
      setBanners(Array.isArray(cData.banners) ? cData.banners : []);
      setBestSellerIds(Array.isArray(cData.bestSellerIds) ? cData.bestSellerIds : []);
      setRecentPurchases(Array.isArray(rData) ? rData.slice(0, 7) : []);
    } catch {
      setProducts([]);
      setGames([]);
      setBanners([]);
      setBestSellerIds([]);
      setRecentPurchases([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadRecentPurchases().catch(() => {});
    }, 60000);
    return () => window.clearInterval(interval);
  }, [loadRecentPurchases]);

  const loadMyReferral = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/shop/my-referral-code', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const data = await res.json();
    if (res.ok) setMyReferralCode(String(data?.referralCode || ''));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    queueMicrotask(() => {
      void loadMyReferral().catch(() => {});
    });
  }, [token, loadMyReferral]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const fingerprintHash = await getDeviceFingerprintHash();
        if (!fingerprintHash) return;
        await fetch('/api/shop/fingerprint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fingerprintHash })
        });
      } catch {}
    })();
  }, [token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    if (ref && ref.trim()) {
      window.localStorage.setItem('pendingReferralCode', ref.trim());
    }
    const pending = window.localStorage.getItem('pendingReferralCode');
    if (pending) {
      queueMicrotask(() => setReferralCode((current) => current || pending));
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const timeoutId = window.setTimeout(() => {
      void loadLuckyWheel().catch(() => {});
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [authLoading, loadLuckyWheel]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(VISITOR_NOTICE_DISMISSED_KEY) === "1") return;
    void fetch("/api/shop/visitor-notice", { method: "POST", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (typeof window !== "undefined" && window.localStorage.getItem(VISITOR_NOTICE_DISMISSED_KEY) === "1") return;
        if (data?.show) setShowVisitorNotice(true);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    let list = products.filter((product) => {
      const gameOk = !selectedGame || product.gameId === selectedGame;
      if (!gameOk) return false;
      if (!needle) return true;
      return `${product.name} ${product.category} ${product.desc || ""}`.toLowerCase().includes(needle);
    });
    if (priceSort === "low-high") list = [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (priceSort === "high-low") list = [...list].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    return list;
  }, [products, selectedGame, searchQuery, priceSort]);

  const bestSellers = useMemo(() => {
    const bs: Product[] = [];
    for (const id of bestSellerIds) {
      const p = products.find((product) => product._id === id);
      if (p) bs.push(p);
    }
    return bs;
  }, [products, bestSellerIds]);

  const persistPendingCheckout = useCallback((nextOrderId: string, nextCart = cart, nextSummary = checkoutSummary) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({
      orderId: nextOrderId,
      cart: nextCart,
      checkoutSummary: nextSummary,
    }));
  }, [cart, checkoutSummary]);

  const clearPendingCheckout = useCallback(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
  }, []);

  const dismissVisitorNotice = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VISITOR_NOTICE_DISMISSED_KEY, "1");
    }
    setShowVisitorNotice(false);
  }, []);

  const dismissLuckyWheelNotice = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LUCKY_WHEEL_NOTICE_KEY, "1");
    }
    setShowLuckyWheelNotice(false);
  }, []);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const checkoutItems = checkoutSummary?.items?.length ? checkoutSummary.items : cart;
  const checkoutTotal = Number.isFinite(Number(checkoutSummary?.totalAmount)) ? Number(checkoutSummary?.totalAmount) : cartTotal;
  const cartCouponKey = useMemo(() => buildCartCouponKey(couponCode, cart), [cart, couponCode]);
  const activeCouponPreview = couponPreview && couponPreviewKey === cartCouponKey ? couponPreview : null;
  const activeCartDiscountAmount = Number(activeCouponPreview?.discountAmount || 0);
  const activeCartCouponPercent = Number(activeCouponPreview?.couponDiscountPercent || 0);
  const activeCartReferralPercent = Number(activeCouponPreview?.referralDiscountPercent || 0);
  const activeCartDiscountPercent = Number(activeCouponPreview?.discountPercent || 0);
  const activeCartPayableTotal = Number.isFinite(Number(activeCouponPreview?.totalAmount)) ? Number(activeCouponPreview?.totalAmount) : cartTotal;

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchInput(value);
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => setSearchQuery(value), 300);
  }, []);

  const openCart = useCallback(() => {
    setCartClosing(false);
    setCartOpen(true);
  }, []);

  const openProductModal = useCallback((p: Product) => {
    setSelectedProduct(p);
    setModalQty(1);
    setModalClosing(false);
    setModalOpen(true);
  }, []);

  const closeProductModal = () => {
    setModalClosing(true);
    setTimeout(() => {
      setModalOpen(false);
      setSelectedProduct(null);
      setModalClosing(false);
    }, 250);
  };

  const closeCart = () => {
    setCartClosing(true);
    setTimeout(() => {
      setCartOpen(false);
      setCartClosing(false);
    }, 250);
  };

  const addToCartFromModal = () => {
    if (!canAct()) return;
    if (!selectedProduct || submitting) return;
    const finalQty = Math.max(1, typeof modalQty === "number" ? modalQty : parseInt(modalQty) || 1);
    const updatedCart = [...cart];
    const exIndex = updatedCart.findIndex((i) => i._id === selectedProduct._id);
    if (exIndex > -1) {
      updatedCart[exIndex].quantity += finalQty;
    } else {
      updatedCart.push({ ...selectedProduct, quantity: finalQty });
    }
    saveCart(updatedCart);
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 300);
    closeProductModal();
  };

  const updateQty = (id: string, d: number) => {
    if (submitting) return;
    const updated = cart.map((i) => (i._id === id ? { ...i, quantity: Math.max(1, i.quantity + d) } : i));
    saveCart(updated);
  };

  const removeItem = (id: string) => {
    if (submitting) return;
    const updated = cart.filter((i) => i._id !== id);
    saveCart(updated);
  };

  const clearCartState = () => {
    saveCart([], { skipRemoteSync: true });
    setCouponCode("");
    setCouponPreview(null);
    setCouponPreviewKey("");
    setCouponMessage("");
    if (token) {
      void fetch("/api/shop/cart", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  const previewCouponFor = async (code: string, items: CartItem[]) => {
    const normalizedCode = code.trim();
    if (!normalizedCode || items.length === 0) return null;
    setCouponLoading(true);
    setCouponMessage("");
    try {
      const res = await fetch("/api/shop/coupon/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          couponCode: normalizedCode,
          referralCode: referralApplied ? referralCode.trim() : "",
          cartItems: items.map((i) => ({ product: i._id, name: i.name, quantity: i.quantity, price: i.price })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Mã giảm giá không hợp lệ");
      const nextPreview: CheckoutSummary = {
        subtotalAmount: Number(data.subtotalAmount || items.reduce((sum, item) => sum + item.price * item.quantity, 0)),
        discountAmount: Number(data.discountAmount || 0),
        discountPercent: Number(data.discountPercent || 0),
        couponDiscountPercent: Number(data.couponDiscountPercent || 0),
        referralDiscountPercent: Number(data.referralDiscountPercent || 0),
        totalAmount: Number(data.totalAmount || items.reduce((sum, item) => sum + item.price * item.quantity, 0)),
        couponCode: data.couponCode || normalizedCode,
        items: Array.isArray(data.items) ? data.items : items,
      };
      setCouponPreview(nextPreview);
      setCouponPreviewKey(buildCartCouponKey(normalizedCode, items));
      setCouponMessage(nextPreview.discountPercent > 0 ? `Đã áp dụng giảm ${nextPreview.discountPercent}%` : "Đã kiểm tra mã giảm giá.");
      return nextPreview;
    } catch (e) {
      setCouponPreview(null);
      setCouponPreviewKey("");
      setCouponMessage(e instanceof Error ? e.message : "Mã giảm giá không hợp lệ");
      throw e;
    } finally {
      setCouponLoading(false);
    }
  };

  const previewCoupon = async () => {
    const code = couponCode.trim();
    return previewCouponFor(code, cart);
  };

  const previewReferralCode = async () => {
    if (!token || !referralCode.trim()) return;
    const res = await fetch('/api/shop/referral/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ referralCode: referralCode.trim() })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Xem trước mã mời thất bại');

    const inviterName = String(data.referrerUsername || data.referrerDiscordId || 'Không rõ');
    setReferralPreviewOwner(inviterName);

    const confirmed = window.confirm(
      `Chủ mã mời:\n${inviterName}\n\n` +
      `Bạn sẽ được giảm 5% cho đơn này.\n` +
      `Người mời nhận coupon 50% sau đơn hàng đầu tiên hoàn tất.\n\n` +
      `Xác nhận áp dụng?`
    );
    if (!confirmed) return;

    setReferralApplying(true);
    const applyRes = await fetch('/api/shop/referral/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ referralCode: referralCode.trim() })
    });
    const applyData = await applyRes.json();
    setReferralApplying(false);
    if (!applyRes.ok) throw new Error(applyData?.error || 'Áp dụng mã mời thất bại');
    setReferralApplied(true);
    alert(`✅ Áp dụng mã mời thành công!\n\nNgười mời: ${inviterName}\nGiảm giá của bạn: 5%`);
  };

  const doCheckout = async () => {
    if (!canAct()) return;
    if (cart.length === 0 || submitting) return;
    if (checkoutInFlightRef.current) return;
    checkoutInFlightRef.current = true;
    setSubmitting(true); setCheckoutLoading(true); setError(null);
    try {
      const codeForCheckout = couponCode.trim();
      if (codeForCheckout && (!couponPreview || couponPreviewKey !== cartCouponKey)) {
        await previewCouponFor(codeForCheckout, cart);
      }

      if (referralCode.trim() && !referralApplied) {
        throw new Error('Hãy bấm Áp dụng cho mã mời trước khi thanh toán.');
      }

      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          couponCode: codeForCheckout,
          referralCode: referralApplied ? referralCode.trim() : "",
          cartItems: cart.map((i) => ({ product: i._id, name: i.name, quantity: i.quantity, price: i.price })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Thanh toán thất bại");
      const nextSummary: CheckoutSummary = {
        subtotalAmount: Number(data.subtotalAmount || 0),
        discountAmount: Number(data.discountAmount || 0),
        discountPercent: Number(data.discountPercent || 0),
        couponDiscountPercent: Number(data.couponDiscountPercent || 0),
        referralDiscountPercent: Number(data.referralDiscountPercent || 0),
        totalAmount: Number(data.totalAmount || 0),
        couponCode: data.couponCode || "",
        items: Array.isArray(data.items) ? data.items : cart,
      };
      setOrderId(data.orderId);
      setCheckoutSummary(nextSummary);
      persistPendingCheckout(data.orderId, cart, nextSummary);
      setStep("roblox");
      if (nextSummary.couponCode === WELCOME_VOUCHER_CODE) {
        setWelcomeVoucherVisible(false);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Thanh toán thất bại"); }
    finally { setSubmitting(false); setCheckoutLoading(false); checkoutInFlightRef.current = false; }
  };

  const lookupRobloxUsername = async () => {
    if (!robloxUsernameInput.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/shop/roblox/search?username=${encodeURIComponent(robloxUsernameInput.trim())}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Tìm Roblox thất bại");
      setRobloxSearchResult({
        userId: String(data.robloxUserId || ""),
        username: String(data.robloxUsername || ""),
        displayName: String(data.robloxDisplayName || ""),
        avatar: String(data.robloxAvatar || ""),
      });
    } catch (e) { setError(e instanceof Error ? e.message : "Tìm Roblox thất bại"); setRobloxSearchResult(null); }
    finally { setSubmitting(false); }
  };

  const linkRobloxUsername = async () => {
    if (!token) {
      setError("Vui lòng đăng nhập Discord trước.");
      return;
    }
    if (!robloxSearchResult || !orderId) return;
    setSubmitting(true); setError(null);
    try {
      const payload = {
        robloxUsername: robloxSearchResult.username,
        robloxUserId: robloxSearchResult.userId,
        robloxDisplayName: robloxSearchResult.displayName,
      };
      const res = await fetch(`/api/shop/orders/${orderId}?action=link-roblox`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Liên kết Roblox thất bại");
      setStep("ticket");
    } catch (e) { setError(e instanceof Error ? e.message : "Liên kết Roblox thất bại"); }
    finally { setSubmitting(false); }
  };

  const copyPaymentValue = async (value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
  };

  const selectPaymentGuide = (method: PaymentGuide) => {
    setSelectedPaymentGuide(method);
    setPaymentProofFile(null);
    if (paymentProofPreviewUrl) URL.revokeObjectURL(paymentProofPreviewUrl);
    setPaymentProofPreviewUrl("");
  };

  const selectPaymentProofFile = (file: File | null) => {
    if (paymentProofPreviewUrl) URL.revokeObjectURL(paymentProofPreviewUrl);
    setPaymentProofFile(file);
    setPaymentProofPreviewUrl(file ? URL.createObjectURL(file) : "");
  };

  const createTicket = async (method: PaymentGuide = selectedPaymentGuide) => {
    if (!canAct()) return;
    if (!orderId || !token || submitting) return;
    if (ticketInFlightRef.current) return;
    if (!paymentProofFile) {
      setError("Hãy tải ảnh thanh toán trước khi tạo ticket.");
      return;
    }
    const action = method === "ltc" ? "create-ticket-ltc" : "create-ticket-paypal-ff";
    ticketInFlightRef.current = true;
    setSubmitting(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("method", method);
      formData.append("paymentProof", paymentProofFile);
      const res = await fetch(`/api/shop/orders/${orderId}?action=${action}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Tạo ticket thất bại");
      const ticketUrl = data?.guildId && data?.channelId
        ? `https://discord.com/channels/${data.guildId}/${data.channelId}`
        : data?.panelUrl || "";
      setTicketResult({ channelId: data.channelId, guildId: data.guildId, url: ticketUrl });
      clearPendingCheckout();
      clearCartState();
      if (ticketUrl) window.location.href = ticketUrl;
    } catch (e) { setError(e instanceof Error ? e.message : "Tạo ticket thất bại"); }
    finally { setSubmitting(false); ticketInFlightRef.current = false; }
  };

  const spinLuckyWheel = async () => {
    if (!token) {
      window.location.href = getOAuthUrl("/shop");
      return;
    }
    setLuckyWheelLoading(true);
    setError(null);
    setLuckyWheelResult(null);
    setCopiedLuckyCode(false);
    try {
      const res = await fetch("/api/shop/lucky-wheel/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Quay vòng quay thất bại");
      const sliceCount = Math.max(1, Number(data.sliceCount || luckyWheel?.slices.length || 1));
      const prizeIndex = Math.max(0, Math.min(sliceCount - 1, Number(data.prizeIndex ?? data.prize?.index ?? 0)));
      setWheelRotation((current) => {
        const sliceAngle = 360 / sliceCount;
        const targetCenter = prizeIndex * sliceAngle + sliceAngle / 2;
        const normalizedCurrent = ((current % 360) + 360) % 360;
        const desired = (360 - targetCenter) % 360;
        const delta = (desired - normalizedCurrent + 360) % 360;
        return current + 1440 + delta;
      });
      const nextLuckyWheelResult: LuckyWheelResult = {
        result: data.result === "discount" ? "discount" : "empty",
        message: data.message || (data.result === "discount" ? "Đã mở khóa mã giảm giá." : "Chúc bạn may mắn lần sau."),
        couponCode: data.couponCode || "",
        discountPercent: Number(data.discountPercent || data.prize?.discountPercent || 0),
        tickets: Math.max(0, Number(data.tickets || 0)),
        prizeIndex,
        sliceCount,
      };
      if (luckyWheelResultTimeoutRef.current) window.clearTimeout(luckyWheelResultTimeoutRef.current);
      luckyWheelResultTimeoutRef.current = window.setTimeout(() => {
        setLuckyWheelResult(nextLuckyWheelResult);
        setLuckyWheelLoading(false);
        luckyWheelResultTimeoutRef.current = null;
      }, WHEEL_SPIN_DURATION_MS);
      setLuckyWheel((current) => current ? {
        ...current,
        tickets: Math.max(0, Number(data.tickets || 0)),
        latestCoupon: data.couponCode ? { couponCode: data.couponCode, discountPercent: Number(data.discountPercent || 0) } : null,
      } : current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quay vòng quay thất bại");
      setLuckyWheelLoading(false);
    }
  };

  const copyLuckyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedLuckyCode(true);
    } catch {
      setCopiedLuckyCode(false);
    }
  };

  const wheelSlices = useMemo(
    () => (luckyWheel?.slices?.length ? luckyWheel.slices : [{ label: "Better luck next time", type: "empty" as const, discountPercent: 0 }]),
    [luckyWheel]
  );

  const bestSellerPageProducts = useMemo(() => {
    if (!bestSellers.length) return [];
    const start = bestSellerPage * BEST_SELLERS_PER_PAGE;
    return bestSellers.slice(start, start + BEST_SELLERS_PER_PAGE);
  }, [bestSellerPage, bestSellers]);

  const maxBestSellerPage = Math.max(0, Math.ceil(bestSellers.length / BEST_SELLERS_PER_PAGE) - 1);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchQuery(searchInput);
  };

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-sky-950 via-blue-950/90 to-cyan-950/80 relative overflow-hidden">
          {/* Glow orbs for depth */}
          <div className="glow-orb glow-orb-1"></div>
          <div className="glow-orb glow-orb-2"></div>
          <div className="glow-orb glow-orb-3"></div>
          <Navbar showCart={step === "shop"} cartCount={cartCount} onCartClick={openCart} /><LogoLoader /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-950 via-blue-950/90 to-cyan-950/80 text-white relative overflow-hidden">
          {/* Glow orbs for depth */}
          <div className="glow-orb glow-orb-1"></div>
          <div className="glow-orb glow-orb-2"></div>
          <div className="glow-orb glow-orb-3"></div>
      <Navbar cartCount={cartCount} showCart={step === "shop" && cartCount > 0} onCartClick={openCart} />

      {welcomeVoucherVisible && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="relative overflow-hidden rounded-[20px] border border-[#3DDC84]/30 bg-gradient-to-r from-[#3DDC84]/10 to-[#2F9BE6]/10 p-4 animate-section-enter">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[#3DDC84]/20 p-2">
                  <Package className="h-5 w-5 text-[#3DDC84]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Chào mừng! Giảm 20% cho đơn hàng đầu tiên</h3>
                  <p className="text-xs text-[#B5B5B5]">Đơn tối thiểu: 5.000 VND • Dùng mã này khi thanh toán</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-[12px] border border-[#1E1E1E] bg-[#050505] px-3 py-2 font-mono text-sm font-semibold text-[#3DDC84]">
                  {WELCOME_VOUCHER_CODE}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(WELCOME_VOUCHER_CODE);
                    setCopiedWelcomeCode(true);
                    setTimeout(() => setCopiedWelcomeCode(false), 2000);
                  }}
                  className="rounded-[12px] bg-[#1E1E1E] px-3 py-2 text-white hover:bg-[#2A2A2A]"
                >
                  {copiedWelcomeCode ? <CheckCircle2 className="h-4 w-4 text-[#3DDC84]" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setWelcomeVoucherVisible(false)}
                  className="rounded-[12px] bg-[#1E1E1E] p-2 text-white hover:bg-[#2A2A2A]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {checkoutLoading && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-3 rounded-[18px] border border-[#1E1E1E] bg-[#111111]/95 px-6 py-5 shadow-2xl animate-bounce-in">
            <Loader2 className="h-8 w-8 animate-spin text-[#2F9BE6]" />
            <p className="text-sm font-medium text-white">Đang xử lý thanh toán...</p>
          </div>
        </div>
      )}

      {showVisitorNotice && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-[20px] border border-[#1E1E1E] bg-[#111111] p-5 shadow-2xl animate-bounce-in">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Bạn mới đến?</h2>
                <p className="mt-2 text-sm leading-6 text-[#B5B5B5]">Nếu bạn là người mới, hãy xem vouch trước khi đặt hàng.</p>
              </div>
              <button type="button" onClick={dismissVisitorNotice} className="rounded-full bg-[#1E1E1E] p-2 text-white hover:bg-[#2A2A2A]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => { dismissVisitorNotice(); window.location.href = "/proofs"; }} className="rounded-[14px] bg-[#2F9BE6] px-4 py-3 text-sm font-medium text-white primary-hover-glow">
                Xem vouch
              </button>
              <button type="button" onClick={dismissVisitorNotice} className="rounded-[14px] bg-[#1E1E1E] px-4 py-3 text-sm font-medium text-white">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showLuckyWheelNotice && luckyWheel?.enabled && (
        <div className="fixed inset-0 z-[181] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-[20px] border border-[#2F9BE6]/30 bg-[#111111] p-5 shadow-2xl animate-bounce-in">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{luckyWheel.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#B5B5B5]">{luckyWheel.message}</p>
              </div>
              <button type="button" onClick={dismissLuckyWheelNotice} className="rounded-full bg-[#1E1E1E] p-2 text-white hover:bg-[#2A2A2A]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={dismissLuckyWheelNotice} className="rounded-[14px] bg-[#2F9BE6] px-4 py-3 text-sm font-medium text-white primary-hover-glow">
                Xem sự kiện
              </button>
              <button type="button" onClick={dismissLuckyWheelNotice} className="rounded-[14px] bg-[#1E1E1E] px-4 py-3 text-sm font-medium text-white">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "shop" && cartCount > 0 && (
        <button onClick={openCart} className={"hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 rounded-full bg-[#2F9BE6] px-5 py-3 text-base font-medium shadow-2xl transition-transform hover:scale-105 active:scale-95 cart-pulse primary-hover-glow " + (cartPulse ? "animate-pulse-glow" : "")}>
          <ShoppingCart className="h-5 w-5" /> Giỏ hàng ({cartCount})
        </button>
      )}

      {(cartOpen || cartClosing) && (
        <div className={"fixed inset-0 z-[70] flex items-end sm:items-stretch bg-black/60 backdrop-blur-sm " + (cartClosing ? "animate-fade-out" : "animate-fade-in")} onClick={closeCart}>
          <div className={"w-full h-[100dvh] sm:my-4 sm:mr-4 sm:ml-auto sm:h-[calc(100%-2rem)] sm:max-w-md bg-[#111111] border-t sm:border border-[#1E1E1E] flex flex-col rounded-none sm:rounded-[24px] " + (cartClosing ? "animate-cart-slide-out" : "animate-cart-slide-in")} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#1E1E1E] px-4 py-4 sticky top-0 bg-[#111111] z-10">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-[#2A2A2A] absolute top-2 left-1/2 -translate-x-1/2 sm:hidden" />
              <h2 className="text-base sm:text-lg font-semibold">Giỏ hàng ({cartCount})</h2>
              <button onClick={closeCart} className="rounded-full bg-[#161616] p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {cart.map((item) => (
                <div key={item._id} className="flex gap-3 rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-3 sm:p-3">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 overflow-hidden rounded-[12px] sm:rounded-[14px] bg-[#111111]">
                    {item.image ? <img src={imgUrl(item.image)} alt="" loading="lazy" onError={handleShopImageError} className="h-full w-full object-cover" /> : <Package className="h-full w-full p-3 text-[#B5B5B5]/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium leading-5">{formatPurchasedProductName(item)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button onClick={() => updateQty(item._id, -1)} className="rounded bg-[#161616] p-1"><Minus className="h-3 w-3" /></button>
                      <span className="text-sm">{item.quantity}</span>
                      <button onClick={() => updateQty(item._id, 1)} className="rounded bg-[#161616] p-1"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-sm font-medium text-[#3DDC84]">{formatMoney(item.price * item.quantity)}</span>
                    <button onClick={() => removeItem(item._id)} className="text-xs text-[#FF4D4F]">Xóa</button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-[#1E1E1E] px-4 py-4 space-y-3 bg-[#111111]">
                <div className="rounded-[12px] border border-[#1E1E1E] bg-[#050505] p-2">
                  <button type="button" onClick={() => setCartToolsOpen((v) => !v)} className="flex w-full items-center justify-between rounded-[10px] border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm font-semibold">
                    <span>Mã giảm giá</span>
                    <span className="text-xs text-[#B5B5B5]">{cartToolsOpen ? 'Ẩn' : 'Hiện'}</span>
                  </button>
                  <div className={"mt-2 space-y-2 " + (cartToolsOpen ? '' : 'hidden sm:block')}>
                    <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2">
                      <label htmlFor="cart-referral" className="text-[10px] font-bold uppercase tracking-wider text-[#49B6FF]">Mã mời</label>
                      <input
                        id="cart-referral"
                        value={referralCode}
                        onChange={(event) => {
                          setReferralCode(event.target.value);
                          setReferralApplied(false);
                        }}
                        onBlur={() => { try { window.localStorage.setItem('pendingReferralCode', referralCode.trim()); } catch {} }}
                        placeholder="REF-123456"
                        className="min-w-0 rounded-[10px] border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-[#49B6FF]"
                      />
                      <button
                        type="button"
                        onClick={() => void previewReferralCode().catch((e) => setError(e instanceof Error ? e.message : 'Áp dụng mã mời thất bại'))}
                        disabled={!token || !referralCode.trim() || referralApplying || referralApplied}
                        className="rounded-[9px] bg-[#1E1E1E] px-3 py-2 text-xs font-bold text-[#49B6FF] disabled:opacity-50"
                      >
                        {referralApplying ? '...' : (referralApplied ? 'Đã áp dụng' : 'Áp dụng')}
                      </button>
                    </div>
                    {token && myReferralCode && (
                      <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2 text-[11px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B5B5B5]">Mã của bạn</span>
                        <span className="min-w-0 truncate font-mono font-semibold text-[#49B6FF]">{myReferralCode}</span>
                        <button type="button" onClick={() => void navigator.clipboard.writeText(myReferralCode)} className="rounded-[8px] bg-[#1E1E1E] p-1.5 text-white" title="Copy">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {referralPreviewOwner && (
                      <div className="flex items-center justify-between gap-2 pl-[84px] text-[11px] text-[#B5B5B5]">
                        <span className="min-w-0 truncate">Chủ mã mời: {referralPreviewOwner}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2">
                      <label htmlFor="cart-coupon" className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A]">Coupon</label>
                      <input
                        id="cart-coupon"
                        value={couponCode}
                        onChange={(event) => {
                          setCouponCode(event.target.value);
                          setCouponPreview(null);
                          setCouponPreviewKey('');
                          setCouponMessage('');
                        }}
                        placeholder="Code"
                        className="min-w-0 rounded-[10px] border border-[#1E1E1E] bg-[#111111] px-3 py-2 text-sm text-white outline-none focus:border-[#2F9BE6]"
                      />
                      <button
                        type="button"
                        onClick={() => void previewCoupon()}
                        disabled={couponLoading || !couponCode.trim()}
                        className="rounded-[9px] bg-[#1E1E1E] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {couponLoading ? '...' : 'Áp dụng'}
                      </button>
                    </div>
                    {couponMessage && (
                      <p className={'pl-[84px] text-xs ' + (activeCouponPreview ? 'text-[#3DDC84]' : 'text-[#FFB3B3]')}>{couponMessage}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-[#B5B5B5]">Tạm tính</span><span>{formatMoney(cartTotal)}</span></div>
                  {activeCartDiscountAmount > 0 && (
                    <>
                      {activeCartCouponPercent > 0 && (
                        <div className="flex justify-between text-[#3DDC84]"><span>Mã giảm giá ({activeCartCouponPercent}%)</span><span>-{formatMoney(cartTotal * activeCartCouponPercent / 100)}</span></div>
                      )}
                      {activeCartReferralPercent > 0 && (
                        <div className="flex justify-between text-[#3DDC84]"><span>Mã mời ({activeCartReferralPercent}%)</span><span>-{formatMoney(cartTotal * activeCartReferralPercent / 100)}</span></div>
                      )}
                      <div className="flex justify-between text-[#3DDC84]"><span>Tổng giảm ({activeCartDiscountPercent}%)</span><span>-{formatMoney(activeCartDiscountAmount)}</span></div>
                    </>
                  )}
                  <div className="flex justify-between border-t border-[#1E1E1E] pt-2 text-lg font-semibold"><span>Tổng cộng</span><span className="text-[#3DDC84]">{formatMoney(activeCartPayableTotal)}</span></div>
                </div>
                <button onClick={() => { closeCart(); void doCheckout(); }} disabled={submitting} className="w-full rounded-[14px] bg-[#2F9BE6] py-3 font-medium transition-all hover:bg-[#49B6FF] primary-hover-glow disabled:opacity-50">{submitting ? 'Đang xử lý...' : 'Thanh toán'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {(modalOpen || modalClosing) && selectedProduct && (
        <div className={"fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-0 " + (modalClosing ? "animate-fade-out" : "animate-fade-in")} onClick={closeProductModal}>
          <div className={"motion-panel relative mx-3 w-full max-w-[340px] md:max-w-[408px] max-h-[82dvh] overflow-hidden rounded-[20px] border border-[#1E1E1E] bg-[#0A0A0A] shadow-2xl " + (modalClosing ? "animate-modal-zoom-out" : "animate-modal-zoom-in")} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5">
              <h3 className="text-sm font-semibold text-white">Chi tiết sản phẩm</h3>
              <button onClick={closeProductModal} className="rounded-full bg-[#1E1E1E] p-2 active:scale-90"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[calc(82dvh-96px)] overflow-y-auto px-4 py-3">
            <div className="space-y-3">
              <div className="mx-auto aspect-square w-full max-w-[120px] md:max-w-[138px] overflow-hidden rounded-[14px] bg-[#050505]">
                {selectedProduct.image ? <img src={imgUrl(selectedProduct.image)} alt="" loading="lazy" onError={handleShopImageError} className="h-full w-full object-contain" /> : <Package className="h-full w-full p-8 text-[#B5B5B5]/50" />}
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold leading-tight">{formatProductNameWithQty(selectedProduct.name, selectedProduct.packQuantity)}</h2>
                {<p className="text-xs text-[#2F9BE6]">Pack {formatQtyLabel(selectedProduct.packQuantity)}</p>}
                <div className="flex items-baseline gap-1.5"><span className="text-xl font-bold text-[#3DDC84]">{formatMoney(selectedProduct.price)}</span></div>
                {selectedProduct.bulkPrice && (
                  <p className="text-[10px] leading-4 text-[#2F9BE6]">Giá sỉ: {formatMoney(selectedProduct.bulkPrice)}</p>
                )}
              </div>
            </div>
            {selectedProduct.desc && (
              <div className="mt-2 rounded-[12px] bg-[#0D0D0D] p-3">
                <p className="whitespace-pre-wrap text-[11px] leading-4 text-[#9A9A9A]">{selectedProduct.desc}</p>
              </div>
            )}
            <div className="mt-2">
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setModalQty(Math.max(1, (typeof modalQty === "number" ? modalQty : parseInt(modalQty) || 1) - 1))} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] active:scale-90"><Minus className="h-3.5 w-3.5" /></button>
                <input type="text" value={modalQty} onChange={(e) => { const val = e.target.value; if (val === "") { setModalQty(""); } else { const parsed = parseInt(val); if (!isNaN(parsed)) { setModalQty(Math.max(1, parsed)); } } }} className="w-14 rounded-[14px] border-2 border-[#2A2A2A] bg-[#0A0A0A] py-1.5 text-center text-base font-bold outline-none focus:border-[#2F9BE6]" />
                <button onClick={() => setModalQty((typeof modalQty === "number" ? modalQty : parseInt(modalQty) || 1) + 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] active:scale-90"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            </div>
            <div className="border-t border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3">
              <button onClick={addToCartFromModal} className="w-full rounded-full bg-gradient-to-r from-[#2F9BE6] to-[#49B6FF] py-3.5 text-sm font-semibold text-white active:scale-95 primary-hover-glow">Thêm vào giỏ</button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-[20px] border border-[#FF4D4F]/30 bg-[#111111] p-6 shadow-2xl animate-bounce-in">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex-shrink-0 rounded-full bg-[#FF4D4F]/10 p-3">
                <AlertCircle className="h-6 w-6 text-[#FF4D4F]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-2">Lỗi</h3>
                <p className="text-sm text-[#B5B5B5] leading-relaxed break-words">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="w-full rounded-[14px] bg-[#FF4D4F] px-4 py-3 text-sm font-medium text-white hover:bg-[#FF6B6B] transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-4 sm:py-6 animate-page-enter">
        {step !== "shop" && (
          <div className="mx-auto max-w-2xl space-y-6 animate-page-enter">
            <button onClick={() => (() => { setStep("shop"); setOrderId(null); setCheckoutSummary(null); selectPaymentProofFile(null); clearPendingCheckout(); })()} className="flex items-center gap-2 text-sm text-[#B5B5B5] hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Quay lại cửa hàng
            </button>
            <div className="flex gap-2">{(["roblox", "ticket"] as const).map((s) => (
              <div key={s} className={"h-2 flex-1 rounded-full transition-colors " + (step === s ? "bg-[#49B6FF]" : (["roblox", "ticket"].indexOf(step) > ["roblox", "ticket"].indexOf(s) ? "bg-[#3DDC84]" : "bg-[#161616]"))} />
            ))}</div>
            <div className="motion-panel rounded-[24px] border border-[#1E1E1E] bg-[#111111] p-4 sm:p-6 space-y-4 animate-section-enter">
              <div className="border-b border-[#1E1E1E] pb-3">
                <p className="text-sm text-[#B5B5B5]">Đơn hàng {orderId}</p>
                <div className="mt-2 space-y-1">{checkoutItems.map((i) => (
                  <div key={String(i._id || ("product" in i ? i.product : "") || i.name)} className="flex justify-between text-sm"><span>{formatPurchasedProductName(i)}</span><span className="text-[#B5B5B5]">{formatMoney(Number(i.price || 0) * Number(i.quantity || 1))}</span></div>
                ))}
                  {Number(checkoutSummary?.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-[#3DDC84]"><span>Giảm giá ({checkoutSummary?.discountPercent || 0}%)</span><span>-{formatMoney(checkoutSummary?.discountAmount || 0)}</span></div>
                  )}
                  <div className="flex justify-between border-t border-[#1E1E1E] pt-2 font-semibold"><span>Tổng cộng</span><span className="text-[#3DDC84]">{formatMoney(checkoutTotal)}</span></div>
                </div>
              </div>
              {step === "roblox" && (
                <div className="space-y-4">
                  <div className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white"><DiscordIcon className="h-5 w-5 text-[#5865F2]" />Đăng nhập Discord</h3>
                    {token && user ? (
                      <div className="rounded-[14px] border border-[#3DDC84]/25 bg-[#3DDC84]/10 px-4 py-3 text-sm text-[#3DDC84]">
                        Đã đăng nhập với {user.discordUsername}
                      </div>
                    ) : (
                      <a
                        href={getOAuthUrl("/shop")}
                        className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#5865F2] py-3 text-center font-medium text-white transition-all hover:bg-[#6875ff]"
                      >
                        <DiscordIcon className="h-5 w-5" />
                        Đăng nhập bằng Discord
                      </a>
                    )}
                  </div>
                  {!robloxSearchResult ? (
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-lg font-semibold"><RobloxIcon className="h-5 w-5 text-white" />Nhập username Roblox</h3>
                      <div className="flex flex-col gap-3">
                        <input
                          value={robloxUsernameInput}
                          onChange={(e) => setRobloxUsernameInput(e.target.value)}
                          placeholder="Nhập username Roblox..."
                          className="w-full rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none focus:border-[#2F9BE6]"
                        />
                        <button
                          onClick={() => void lookupRobloxUsername()}
                          disabled={submitting || !robloxUsernameInput.trim() || robloxUsernameInput.length < 3}
                          className="w-full rounded-[14px] bg-[#2F9BE6] py-3 font-medium transition-all hover:bg-[#49B6FF] primary-hover-glow disabled:opacity-50"
                        >
                          {submitting ? "Đang tìm..." : "Tìm tài khoản"}
                        </button>
                      </div>
                      <p className="text-xs text-[#B5B5B5]/80">Nhập ít nhất 3 ký tự để tìm kiếm</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-lg font-semibold"><RobloxIcon className="h-5 w-5 text-white" />Xác nhận tài khoản Roblox</h3>
                      <p className="text-sm text-[#B5B5B5]">Đây có đúng là tài khoản Roblox của bạn không?</p>
                      <div className="flex items-center gap-4 rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-[#161616]">
                          {robloxSearchResult.avatar ? (
                            <img src={robloxSearchResult.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-full w-full p-3 text-[#B5B5B5]/60" />
                          )}
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-[#B5B5B5]">Tên hiển thị</p>
                          <p className="text-lg font-semibold text-white">{robloxSearchResult.displayName}</p>
                          <p className="text-sm text-[#2F9BE6]">@{robloxSearchResult.username}</p>
                          <a
                            href={`https://www.roblox.com/users/${robloxSearchResult.userId}/profile`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs text-[#B5B5B5] hover:text-white"
                          >
                            Xem profile
                          </a>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => { setRobloxSearchResult(null); setRobloxUsernameInput(""); }}
                          className="rounded-[14px] bg-[#1E1E1E] py-3 font-medium transition-colors hover:bg-[#1E1E1E]"
                        >
                          Nhập lại
                        </button>
                        <button
                          onClick={() => void linkRobloxUsername()}
                          disabled={submitting || !token}
                          className="rounded-[14px] bg-[#3DDC84] py-3 font-medium transition-colors hover:bg-[#3DDC84]/90 primary-hover-glow disabled:opacity-50"
                        >
                          {token ? "Xác nhận" : "Đăng nhập trước"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {step === "ticket" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Chọn phương thức thanh toán</h3>
                  {!ticketResult ? (
                    <div className="space-y-4">
                      <div className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4 text-sm text-[#B5B5B5]">
                        <p className="font-medium text-white">Bước giao hàng đã được gỡ bỏ.</p>
                        <p className="mt-1">Sau khi liên kết Roblox, bạn có thể tạo ticket thanh toán ngay.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => selectPaymentGuide("paypal_ff")}
                          className={"flex items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-sm font-medium transition-all " + (selectedPaymentGuide === "paypal_ff" ? "border-[#2F9BE6] bg-[#49B6FF]/10 text-white" : "border-[#1E1E1E] bg-[#050505] text-[#B5B5B5] hover:text-white")}
                        >
                          <CreditCard className="h-4 w-4" />
                          PayPal
                        </button>
                        <button
                          type="button"
                          onClick={() => selectPaymentGuide("ltc")}
                          className={"flex items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-sm font-medium transition-all " + (selectedPaymentGuide === "ltc" ? "border-[#2F9BE6] bg-[#49B6FF]/10 text-white" : "border-[#1E1E1E] bg-[#050505] text-[#B5B5B5] hover:text-white")}
                        >
                          <QrCode className="h-4 w-4" />
                          Litecoin
                        </button>
                      </div>
                      <div className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4">
                        <p className="text-sm font-semibold text-white">{selectedPaymentGuide === "ltc" ? "Thanh toán bằng Litecoin" : "Thanh toán bằng PayPal Friends & Family"}</p>
                        {selectedPaymentGuide === "ltc" ? (
                          <div className="mt-3 space-y-3">
                            <div className="rounded-[12px] border border-[#1E1E1E] bg-[#111111] px-4 py-3 font-mono text-xs break-all">{LTC_ADDRESS}</div>
                            <button type="button" onClick={() => void copyPaymentValue(LTC_ADDRESS)} className="rounded-[12px] bg-[#1E1E1E] px-4 py-2 text-sm">Sao chép địa chỉ</button>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-3">
                            <div className="rounded-[12px] border border-[#1E1E1E] bg-[#111111] px-4 py-3 font-mono text-sm break-all">{PAYPAL_EMAIL}</div>
                            <button type="button" onClick={() => void copyPaymentValue(PAYPAL_EMAIL)} className="rounded-[12px] bg-[#1E1E1E] px-4 py-2 text-sm">Sao chép email PayPal</button>
                          </div>
                        )}
                      </div>
                      <div className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4">
                        <label className="mb-2 block text-sm font-medium text-white">Ảnh chứng minh thanh toán</label>
                        <input type="file" accept="image/*" onChange={(e) => selectPaymentProofFile(e.target.files?.[0] || null)} className="block w-full text-sm text-[#B5B5B5]" />
                        {paymentProofPreviewUrl && <img src={paymentProofPreviewUrl} alt="preview" className="mt-3 max-h-56 rounded-[12px] border border-[#1E1E1E] object-contain" />}
                      </div>
                      <button onClick={() => void createTicket()} disabled={submitting || !paymentProofFile} className="w-full rounded-[14px] bg-[#2F9BE6] py-3 font-medium primary-hover-glow disabled:opacity-50">{submitting ? "Đang tạo ticket..." : "Tạo ticket thanh toán"}</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-[16px] border border-[#3DDC84]/30 bg-[#3DDC84]/10 p-4 text-sm text-[#3DDC84]">
                        Ticket đã được tạo thành công.
                      </div>
                      {ticketResult.url ? (
                        <a href={ticketResult.url} className="block w-full rounded-[14px] bg-[#2F9BE6] py-3 text-center font-medium text-white primary-hover-glow">Mở ticket Discord</a>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "shop" && (
          <>
            <div className="px-4 py-8 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl">
                <h1 className="text-3xl font-bold text-white sm:text-4xl">Cửa hàng game</h1>
                <p className="mt-2 text-[#B5B5B5]">Mua vật phẩm, voucher với giá tốt nhất</p>
              </div>
            </div>

            {bestSellers.length > 0 && (
              <div className="px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-white">Sản phẩm bán chạy</h2>
                    {bestSellers.length > BEST_SELLERS_PER_PAGE && (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setBestSellerPage((current) => Math.max(0, current - 1))} disabled={bestSellerPage <= 0} className="rounded-[12px] bg-[#111111] px-3 py-2 text-xs text-[#B5B5B5] disabled:opacity-40">Trước</button>
                        <button type="button" onClick={() => setBestSellerPage((current) => Math.min(maxBestSellerPage, current + 1))} disabled={bestSellerPage >= maxBestSellerPage} className="rounded-[12px] bg-[#111111] px-3 py-2 text-xs text-[#B5B5B5] disabled:opacity-40">Sau</button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
                    {bestSellerPageProducts.map((product, idx) => (
                      <ProductCard key={product._id} product={product} index={idx} onOpen={openProductModal} variant="bestSeller" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="px-4 py-4 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B5B5B5]" />
                    <input
                      type="text"
                      placeholder="Tìm sản phẩm..."
                      value={searchInput}
                      onChange={handleSearchChange}
                      className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#111111] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#B5B5B5] focus:border-[#2F9BE6] focus:outline-none"
                    />
                  </form>

                  <div className="flex flex-wrap gap-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setSelectedGame(null)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${!selectedGame ? "bg-[#2F9BE6] text-white" : "border border-[#1E1E1E] bg-[#111111] text-[#B5B5B5] hover:border-[#2F9BE6]"}`}>
                        Tất cả
                      </button>
                      {games.slice(0, 5).map((game) => (
                        <button key={game._id} onClick={() => setSelectedGame(game._id)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${selectedGame === game._id ? "bg-[#2F9BE6] text-white" : "border border-[#1E1E1E] bg-[#111111] text-[#B5B5B5] hover:border-[#2F9BE6]"}`}>
                          {game.name}
                        </button>
                      ))}
                    </div>

                    <select value={priceSort} onChange={(e) => setPriceSort(e.target.value as PriceSort)} className="rounded-[12px] border border-[#1E1E1E] bg-[#111111] px-3 py-1.5 text-sm text-white focus:border-[#2F9BE6] focus:outline-none">
                      <option value="none">Giá mặc định</option>
                      <option value="low-high">Giá: Thấp đến Cao</option>
                      <option value="high-low">Giá: Cao đến Thấp</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-7xl">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {filtered.map((product, index) => (
                    <ProductCard key={product._id} product={product} index={index} onOpen={openProductModal} />
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div className="py-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-[#B5B5B5]/50" />
                    <p className="mt-4 text-[#B5B5B5]">Không tìm thấy sản phẩm</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

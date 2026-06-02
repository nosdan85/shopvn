"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { ALL_TIMEZONES, detectUserTimezone, filterTimezones, getTimezonesGroupedByCountry, type CountryGroup } from "@/lib/timezones";
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
  MapPin,
  Loader2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ChevronDown,
  Copy,
  CreditCard,
  QrCode,
  AlertCircle,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const VISITOR_NOTICE_DISMISSED_KEY = "visitorNoticeDismissed";
const LUCKY_WHEEL_NOTICE_KEY = "luckyWheelNoticeDismissed";
const SAILOR_PIECE_MOBILE_ICON = "https://res-console.cloudinary.com/dphai9vy2/thumbnails/v1/image/upload/v1779780557/c2FpbG9yX3BpZWNfeG9pZnNh/drilldown";

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

function maskName(name: string): string {
  if (!name || name.length <= 2) return "***";
  return name[0] + "*".repeat(Math.min(name.length - 1, 4));
}

function buildCartCouponKey(code: string, items: CartItem[]): string {
  return `${code.trim().toUpperCase()}|${items.map((item) => `${item._id}:${item.quantity}:${Number(item.price || 0)}`).join(",")}`;
}

function formatMoney(value: number | string | undefined | null): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isSailorPieceGame(game: Game): boolean {
  const text = `${game.name || ""} ${game.slug || ""}`.toLowerCase();
  return text.includes("sailor") && text.includes("piece");
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

function formatSlotNote(note?: string): string {
  const map: Record<string, string> = {
    "Ca s�ng": "Morning shift",
    "Ca trua": "Midday shift",
    "Ca chi?u": "Afternoon shift",
    "Ca t?i": "Evening shift",
  };
  return map[String(note || "").trim()] || String(note || "");
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
interface Slot {
  id: string;
  ownerStartText: string;
  ownerEndText: string;
  customerStartText: string;
  customerEndText: string;
  customerDateKey: string;
  customerDateLabel: string;
  customerTimeLabel: string;
  customerSegments?: SlotSegment[];
  startAt: string;
  endAt: string;
  note?: string;
}
interface SlotSegment {
  id: string;
  slotId: string;
  customerStartAt?: string;
  customerEndAt?: string;
  customerDateKey: string;
  customerDateLabel: string;
  customerTimeLabel: string;
}
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

type Step = "shop" | "roblox" | "delivery" | "ticket";
type PriceSort = "none" | "low-high" | "high-low";
type PaymentGuide = "paypal_ff" | "ltc";

const BEST_SELLERS_PER_PAGE = 4;
const PENDING_CHECKOUT_KEY = "pendingCheckout";
const PAYPAL_EMAIL = "nguyenquanghuy111106@gmail.com";
const LTC_ADDRESS = "ltc1ququ7e6ryccpnu7jgy0l4vukgc3mventxyulyge";
const WHEEL_SPIN_DURATION_MS = 4200;
const WHEEL_SLICE_COLORS = [
  "#E11D48", "#2563EB", "#16A34A", "#F59E0B", "#7C3AED", "#0891B2", "#DB2777", "#65A30D", "#EA580C", "#4F46E5",
  "#DC2626", "#0D9488", "#9333EA", "#CA8A04", "#0284C7", "#C026D3", "#059669", "#D97706", "#4338CA", "#BE123C",
  "#1D4ED8", "#15803D", "#B45309", "#6D28D9", "#0E7490", "#BE185D", "#4D7C0F", "#C2410C", "#3730A3", "#991B1B",
  "#0369A1", "#047857", "#A16207", "#581C87", "#155E75", "#9D174D", "#3F6212", "#9A3412", "#312E81", "#B91C1C",
  "#0F766E", "#A21CAF", "#854D0E", "#1E40AF", "#166534", "#22C55E", "#86198F", "#6366F1", "#A3A3A3", "#F97316",
];
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

function getDateKeyInTimezone(timezone: string, value = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {}
  return value.toISOString().slice(0, 10);
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

function formatHourChoice(value: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
}

function buildHourChoices(segment: SlotSegment, timezone: string): Array<{ value: string; label: string }> {
  const start = new Date(segment.customerStartAt || "");
  const end = new Date(segment.customerEndAt || "");
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return [];

  const hourMs = 60 * 60 * 1000;
  const values: string[] = [];
  for (let value = start.getTime(), index = 0; value < end.getTime() && index < 48; value += hourMs, index += 1) {
    values.push(new Date(value).toISOString());
  }
  values.push(end.toISOString());
  return Array.from(new Set(values)).map((value) => ({
    value,
    label: formatHourChoice(value, timezone),
  }));
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
            <span className="text-xs text-[#2F9BE6]">View</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5">{product.name}</h3>
          <p className="text-xs text-[#2F9BE6] mt-0.5">{formatQtyLabel(product.packQuantity)}</p>
          <p className="text-xs text-[#B5B5B5]/80">{product.category}</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-[#3DDC84]">{formatMoney(product.price)}</span>
            <span className="text-xs text-[#2F9BE6]">View</span>
          </div>
        </div>
      )}
    </div>
  );
});

function LogoLoader() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050505]/95 backdrop-blur-sm">
      <style>{`
        @keyframes duelOne {
          0%, 100% { transform: translateX(-78px) translateY(0) rotate(-5deg); }
          24% { transform: translateX(-38px) translateY(-4px) rotate(9deg); }
          36% { transform: translateX(-22px) translateY(0) rotate(-10deg); }
          54% { transform: translateX(-62px) translateY(2px) rotate(-5deg); }
          72% { transform: translateX(-86px) translateY(-7px) rotate(-18deg); }
        }
        @keyframes duelTwo {
          0%, 100% { transform: translateX(78px) scaleX(-1) translateY(0) rotate(-5deg); }
          24% { transform: translateX(82px) scaleX(-1) translateY(-6px) rotate(-16deg); }
          42% { transform: translateX(34px) scaleX(-1) translateY(0) rotate(10deg); }
          54% { transform: translateX(20px) scaleX(-1) translateY(0) rotate(-12deg); }
          78% { transform: translateX(62px) scaleX(-1) translateY(2px) rotate(-5deg); }
        }
        @keyframes staffSwingLeft {
          0%, 18%, 100% { transform: rotate(-62deg); }
          30%, 40% { transform: rotate(52deg); }
          58%, 76% { transform: rotate(-35deg); }
        }
        @keyframes staffSwingRight {
          0%, 34%, 100% { transform: rotate(-55deg); }
          46%, 58% { transform: rotate(55deg); }
          72% { transform: rotate(-35deg); }
        }
        @keyframes hitSpark {
          0%, 22%, 34%, 44%, 56%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.4) rotate(0deg); }
          28%, 50% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(18deg); }
        }
        @keyframes actionLine {
          0%, 18%, 60%, 100% { opacity: 0; transform: translateX(-18px) scaleX(0.4); }
          30%, 50% { opacity: 1; transform: translateX(8px) scaleX(1); }
        }
        @keyframes barFill {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
        @keyframes logoSync {
          0% { left: 0%; transform: translate(-50%, -50%) rotate(0deg); }
          50% { left: 100%; transform: translate(-50%, -50%) rotate(360deg); }
          100% { left: 0%; transform: translate(-50%, -50%) rotate(720deg); }
        }
      `}</style>

      <div className="relative mb-4 h-24 w-80 max-w-[80vw] overflow-hidden rounded-[18px] border border-[#1E1E1E] bg-[#0A0A0A]">
        <div className="absolute inset-x-5 bottom-5 h-px bg-[#2F9BE6]/25" />
        <div className="absolute left-1/2 top-9 h-8 w-8" style={{ animation: "hitSpark 1.6s ease-in-out infinite" }}>
          <div className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 bg-[#F7D154]" />
          <div className="absolute left-1/2 top-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-[#F7D154]" />
          <div className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#F7D154]" />
          <div className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-[#F7D154]" />
        </div>
        <div className="absolute left-[40%] top-7 h-0.5 w-10 bg-[#49B6FF]/70" style={{ animation: "actionLine 1.6s ease-in-out infinite" }} />
        <div className="absolute right-[40%] top-12 h-0.5 w-10 bg-[#49B6FF]/70" style={{ animation: "actionLine 1.6s ease-in-out infinite reverse" }} />
        {["left", "right"].map((side) => (
          <div
            key={side}
            className="absolute bottom-5 left-1/2 h-14 w-12"
            style={{ animation: `${side === "left" ? "duelOne" : "duelTwo"} 1.6s ease-in-out infinite` }}
          >
            <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white" />
            <div className="absolute left-1/2 top-4 h-6 w-0.5 -translate-x-1/2 bg-white" />
            <div className="absolute left-[23px] top-7 h-6 w-0.5 origin-top rotate-[36deg] bg-white" />
            <div className="absolute left-[23px] top-7 h-6 w-0.5 origin-top -rotate-[36deg] bg-white" />
            <div className="absolute left-[23px] top-[18px] h-9 w-0.5 origin-top rounded-full bg-[#49B6FF]" style={{ animation: `${side === "left" ? "staffSwingLeft" : "staffSwingRight"} 1.6s ease-in-out infinite` }} />
          </div>
        ))}
      </div>

      <div className="relative mb-6 w-80 max-w-[80vw]">
        {/* Bar */}
        <div className="h-3 overflow-hidden rounded-full border border-[#2F9BE6]/30 bg-[#111111]">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 animate-[barFill_2.5s_ease-in-out_infinite]" />
        </div>

        {/* Rolling Logo */}
        <div className="pointer-events-none absolute top-1/2 h-10 w-10 animate-[logoSync_2.5s_ease-in-out_infinite]">
          <img src="/pictures/logo.png" alt="Loading" className="h-full w-full rounded-[10px] object-contain" />
        </div>
      </div>

      <p className="px-4 text-center text-sm font-medium text-white">This may take a little while. Please wait.</p>
    </div>
  );
}
export default function ShopPage() {
  const { user, token, isLoading: authLoading, getOAuthUrl } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [banners, setBanners] = useState<string[]>([]);
  const [bestSellerIds, setBestSellerIds] = useState<string[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceSort, setPriceSort] = useState<PriceSort>("none");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartClosing, setCartClosing] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const [step, setStep] = useState<Step>("shop");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [myReferralCode, setMyReferralCode] = useState<string>("");
  const [referralPreviewOwner, setReferralPreviewOwner] = useState<string>("");
  const [referralApplying, setReferralApplying] = useState(false);
  const [referralApplied, setReferralApplied] = useState(false);
  const [cartToolsOpen, setCartToolsOpen] = useState(false);
  const [couponPreview, setCouponPreview] = useState<CheckoutSummary | null>(null);
  const [couponPreviewKey, setCouponPreviewKey] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [robloxUsernameInput, setRobloxUsernameInput] = useState("");
  const [customerTz, setCustomerTz] = useState(detectUserTimezone());
  const [tzSearch, setTzSearch] = useState("");
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotDate, setSelectedSlotDate] = useState("");
  const [deliveryMonth, setDeliveryMonth] = useState("");
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);
  const [pickedSlotHours, setPickedSlotHours] = useState<string[]>([]);
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null);
  const [selectedPaymentGuide, setSelectedPaymentGuide] = useState<PaymentGuide>("paypal_ff");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = useState("");
  const [copiedPaymentValue, setCopiedPaymentValue] = useState<string | null>(null);
  const [showVisitorNotice, setShowVisitorNotice] = useState(false);
  const [showLuckyWheelNotice, setShowLuckyWheelNotice] = useState(false);
  const [luckyWheel, setLuckyWheel] = useState<LuckyWheelConfig | null>(null);
  const [luckyWheelLoading, setLuckyWheelLoading] = useState(false);
  const [luckyWheelResult, setLuckyWheelResult] = useState<LuckyWheelResult | null>(null);
  const [copiedLuckyCode, setCopiedLuckyCode] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [mobileShopView, setMobileShopView] = useState<"items" | "wheel">("items");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState<string | number>(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [robloxSearchResult, setRobloxSearchResult] = useState<null | { userId: string; username: string; displayName: string; avatar: string }>(null);
  const [bestSellerPage, setBestSellerPage] = useState(0);
  const [welcomeVoucherVisible, setWelcomeVoucherVisible] = useState(true);
  const [copiedWelcomeCode, setCopiedWelcomeCode] = useState(false);
  const WELCOME_VOUCHER_CODE = "WELCOME20";
  const remoteCartHydratedRef = useRef(false);
  const skipNextRemoteCartSyncRef = useRef(false);
  const checkoutInFlightRef = useRef(false);
  const ticketInFlightRef = useRef(false);
  const lastActionRef = useRef(0);
  const searchDebounceRef = useRef<number | null>(null);
  const resumeHandledRef = useRef(false);
  const latestLuckyWheelTokenRef = useRef<string | null>(null);
  const luckyWheelRequestRef = useRef(0);
  const luckyWheelResultTimeoutRef = useRef<number | null>(null);

  const ACTION_COOLDOWN_MS = 450;
  const canAct = () => { if (submitting || Date.now() - lastActionRef.current < ACTION_COOLDOWN_MS) return false; lastActionRef.current = Date.now(); return true; };

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
    const requestId = luckyWheelRequestRef.current + 1;
    luckyWheelRequestRef.current = requestId;
    const requestToken = token || null;
    const res = await fetch("/api/shop/lucky-wheel", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load lucky wheel");
    if (signal?.aborted || requestId !== luckyWheelRequestRef.current || requestToken !== latestLuckyWheelTokenRef.current) return;
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
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadRecentPurchases().catch(() => {});
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadRecentPurchases]);

  useEffect(() => {
    latestLuckyWheelTokenRef.current = token || null;
  }, [token]);

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
        setShowVisitorNotice(Boolean(data?.show));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
      if (luckyWheelResultTimeoutRef.current) window.clearTimeout(luckyWheelResultTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (paymentProofPreviewUrl) URL.revokeObjectURL(paymentProofPreviewUrl);
    };
  }, [paymentProofPreviewUrl]);

  useEffect(() => {
    if (!token || !user?.discordId) {
      remoteCartHydratedRef.current = false;
      return;
    }
    if (typeof window !== "undefined" && window.sessionStorage.getItem(PENDING_CHECKOUT_KEY)) {
      remoteCartHydratedRef.current = true;
      return;
    }

    const controller = new AbortController();
    remoteCartHydratedRef.current = false;
    void (async () => {
      try {
        const remoteItems = await fetchRemoteCart(controller.signal);
        if (controller.signal.aborted) return;
        saveCart(remoteItems, { skipRemoteSync: true });
      } catch {
        if (controller.signal.aborted) return;
      } finally {
        if (!controller.signal.aborted) remoteCartHydratedRef.current = true;
      }
    })();

    return () => {
      controller.abort();
    };
  }, [fetchRemoteCart, saveCart, token, user?.discordId]);

  useEffect(() => {
    if (authLoading || token) return;
    queueMicrotask(() => { saveCart([], { skipRemoteSync: true }); remoteCartHydratedRef.current = false; });
  }, [authLoading, saveCart, token]);

  useEffect(() => {
    if (!token || !user?.discordId) return;

    const syncRemoteCart = () => {
      void fetchRemoteCart()
        .then((remoteItems) => saveCart(remoteItems, { skipRemoteSync: true }))
        .catch(() => {});
    };

    const syncVisibleRemoteCart = () => {
      if (document.visibilityState === "visible") syncRemoteCart();
    };

    window.addEventListener("focus", syncRemoteCart);
    const intervalId = window.setInterval(syncVisibleRemoteCart, 30000);

    return () => {
      window.removeEventListener("focus", syncRemoteCart);
      window.clearInterval(intervalId);
    };
  }, [fetchRemoteCart, saveCart, token, user?.discordId]);

  useEffect(() => {
    if (!token || !user?.discordId || !remoteCartHydratedRef.current) return;
    if (skipNextRemoteCartSyncRef.current) {
      skipNextRemoteCartSyncRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void syncCartToAccount(cart).catch(() => {});
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [cart, syncCartToAccount, token, user?.discordId]);

  useEffect(() => {
    if (resumeHandledRef.current || typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return;

    try {
      const pending = JSON.parse(raw) as { orderId?: string; cart?: CartItem[]; customerTz?: string; checkoutSummary?: CheckoutSummary };
      if (!pending?.orderId) return;
      resumeHandledRef.current = true;
      queueMicrotask(() => {
        setOrderId(String(pending.orderId));
        setStep("roblox");
        setCart(Array.isArray(pending.cart) ? pending.cart : []);
        setCheckoutSummary(pending.checkoutSummary || null);
        if (pending.customerTz) {
          setCustomerTz(String(pending.customerTz));
        }
      });
    } catch {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    }
  }, [token]);

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

  const timezoneOptions = useMemo(() => {
    const detected = customerTz && !ALL_TIMEZONES.some((tz) => tz.value === customerTz)
      ? [{ value: customerTz, label: "Detected timezone", country: "Your device", currency: "USD", currencySymbol: "$", currencyCode: "USD" }]
      : [];
    return [...detected, ...filterTimezones(tzSearch)];
  }, [customerTz, tzSearch]);

  const timezoneCountryGroups = useMemo<CountryGroup[]>(() => {
    const optionsByValue = new Set(timezoneOptions.map((tz) => tz.value));
    const groups = getTimezonesGroupedByCountry()
      .map((group) => ({ ...group, zones: group.zones.filter((zone) => optionsByValue.has(zone.value)) }))
      .filter((group) => group.zones.length > 0);
    const detected = timezoneOptions.find((tz) => tz.country === "Your device");
    return detected ? [{ country: detected.country, flag: "TZ", zones: [detected] }, ...groups] : groups;
  }, [timezoneOptions]);

  const selectedTimezoneLabel = useMemo(() => {
    const found = ALL_TIMEZONES.find((tz) => tz.value === customerTz);
    return found ? `${found.country} - ${found.label}` : `Detected - ${customerTz}`;
  }, [customerTz]);

  const persistPendingCheckout = useCallback((nextOrderId: string, nextCart = cart, nextTz = customerTz, nextSummary = checkoutSummary) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({
      orderId: nextOrderId,
      cart: nextCart,
      customerTz: nextTz,
      checkoutSummary: nextSummary,
    }));
  }, [cart, checkoutSummary, customerTz]);

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

  const scrollToLuckyWheel = useCallback(() => {
    dismissLuckyWheelNotice();
    setMobileShopView("wheel");
    requestAnimationFrame(() => {
      document.getElementById("lucky-wheel-event")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [dismissLuckyWheelNotice]);

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
      if (!res.ok) throw new Error(data?.error || "Spin failed");
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
        message: data.message || (data.result === "discount" ? "Discount unlocked." : "Better luck next time."),
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
      setError(e instanceof Error ? e.message : "Spin failed");
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
  const wheelGradient = useMemo(() => {
    const count = Math.max(1, wheelSlices.length);
    return `conic-gradient(from 0deg, ${wheelSlices.map((slice, index) => {
      const start = (index / count) * 100;
      const end = ((index + 1) / count) * 100;
      const color = WHEEL_SLICE_COLORS[index % WHEEL_SLICE_COLORS.length];
      return `${color} ${start}% ${end}%`;
    }).join(", ")})`;
  }, [wheelSlices]);

  const fetchSlotsForTimezone = useCallback(async (tzValue: string) => {
    const res = await fetch(`/api/shop/delivery-slots?timezone=${encodeURIComponent(tzValue)}`, { cache: "no-store" });
    const data = await res.json();
    const nextSlots = Array.isArray(data?.slots) ? data.slots : [];
    const todayKey = getDateKeyInTimezone(tzValue);
    setSlots(nextSlots);
    setPickedSlot(null);
    setPickedSlotHours([]);
    setSelectedSlotDate((current) => {
      if (current && nextSlots.some((slot: Slot) => slot.customerDateKey === current || slot.customerSegments?.some((segment) => segment.customerDateKey === current))) return current;
      const firstDate = String(nextSlots[0]?.customerSegments?.[0]?.customerDateKey || nextSlots[0]?.customerDateKey || todayKey);
      setDeliveryMonth(firstDate.slice(0, 7));
      return firstDate;
    });
    return nextSlots;
  }, []);

  const selectTimezone = (tzValue: string) => {
    setCustomerTz(tzValue);
    setTzSearch("");
    setExpandedCountry(null);
    setPickedSlot(null);
    setPickedSlotHours([]);
    void fetchSlotsForTimezone(tzValue).catch(() => {});
  };

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const slotSegments = useMemo(() => {
    return slots.flatMap((slot) => {
      const segments = Array.isArray(slot.customerSegments) && slot.customerSegments.length > 0
        ? slot.customerSegments
        : [{
            id: `${slot.id}:${slot.customerDateKey}:0`,
            slotId: slot.id,
            customerStartAt: slot.startAt,
            customerEndAt: slot.endAt,
            customerDateKey: slot.customerDateKey,
            customerDateLabel: slot.customerDateLabel,
            customerTimeLabel: slot.customerTimeLabel || `${slot.customerStartText} - ${slot.customerEndText}`,
          }];
      return segments.map((segment) => ({
        ...segment,
        note: slot.note,
      }));
    });
  }, [slots]);

  const slotDates = useMemo(() => {
    const seen = new Set<string>();
    return slotSegments.filter((segment) => {
      if (!segment.customerDateKey || seen.has(segment.customerDateKey)) return false;
      seen.add(segment.customerDateKey);
      return true;
    }).map((segment) => ({
      key: segment.customerDateKey,
      label: segment.customerDateLabel || segment.customerDateKey,
    }));
  }, [slotSegments]);
  const slotDateSet = useMemo(() => new Set(slotDates.map((date) => date.key)), [slotDates]);
  const fallbackDeliveryDate = useMemo(() => getDateKeyInTimezone(customerTz), [customerTz]);
  const deliveryMonthKey = deliveryMonth || selectedSlotDate.slice(0, 7) || fallbackDeliveryDate.slice(0, 7);
  const deliveryCalendarDays = useMemo(() => buildCalendarDays(deliveryMonthKey), [deliveryMonthKey]);
  const visibleSlotSegments = useMemo(
    () => slotSegments.filter((segment) => !selectedSlotDate || segment.customerDateKey === selectedSlotDate),
    [selectedSlotDate, slotSegments]
  );
  const hasPickedTwoHours = pickedSlotHours.length === 2;
  const checkoutItems = checkoutSummary?.items?.length ? checkoutSummary.items : cart;
  const checkoutTotal = Number.isFinite(Number(checkoutSummary?.totalAmount)) ? Number(checkoutSummary?.totalAmount) : cartTotal;
  const cartCouponKey = useMemo(
    () => buildCartCouponKey(couponCode, cart),
    [cart, couponCode]
  );
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

  const previewCoupon = async () => {
    const code = couponCode.trim();
    return previewCouponFor(code, cart);
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
      if (!res.ok) throw new Error(data?.error || "Coupon is invalid");
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
      setCouponMessage(nextPreview.discountPercent > 0 ? `${nextPreview.discountPercent}% discount applied.` : "Coupon checked.");
      return nextPreview;
    } catch (e) {
      setCouponPreview(null);
      setCouponPreviewKey("");
      setCouponMessage(e instanceof Error ? e.message : "Coupon is invalid");
      throw e;
    } finally {
      setCouponLoading(false);
    }
  };

  const previewReferralCode = async () => {
    if (!token || !referralCode.trim()) return;
    const res = await fetch('/api/shop/referral/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ referralCode: referralCode.trim() })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Invite preview failed');

    const inviterName = String(data.referrerUsername || data.referrerDiscordId || 'Unknown');
    setReferralPreviewOwner(inviterName);

    // Show custom confirmation dialog
    const confirmed = window.confirm(
      `Invite Code Owner:\n${inviterName}\n\n` +
      `You will get 5% discount on this order.\n` +
      `Inviter gets 50% coupon after your first completed order.\n\n` +
      `Confirm apply?`
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
    if (!applyRes.ok) throw new Error(applyData?.error || 'Invite apply failed');
    setReferralApplied(true);

    // Show success message
    alert(`✅ Invite code applied successfully!\n\nInviter: ${inviterName}\nYour discount: 5%`);

    if (applyData?.selfCouponCode) {
      setCouponCode(String(applyData.selfCouponCode));
      setCouponMessage('Invite applied: 5% discount will be applied at checkout.');
    }
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

      // Check if user typed invite code but didn't apply
      if (referralCode.trim() && !referralApplied) {
        throw new Error('Please click Apply button for the invite code before checkout.');
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
      if (!res.ok) throw new Error(data?.error || "Checkout failed");
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
      persistPendingCheckout(data.orderId, cart, customerTz, nextSummary);
      setStep("roblox");

      // Hide welcome banner if welcome voucher was used
      if (nextSummary.couponCode === WELCOME_VOUCHER_CODE) {
        setWelcomeVoucherVisible(false);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout failed"); }
    finally { setSubmitting(false); setCheckoutLoading(false); checkoutInFlightRef.current = false; }
  };

  const lookupRobloxUsername = async () => {
    if (!robloxUsernameInput.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/shop/roblox/search?username=${encodeURIComponent(robloxUsernameInput.trim())}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Roblox lookup failed");
      setRobloxSearchResult({
        userId: String(data.robloxUserId || ""),
        username: String(data.robloxUsername || ""),
        displayName: String(data.robloxDisplayName || ""),
        avatar: String(data.robloxAvatar || ""),
      });
    } catch (e) { setError(e instanceof Error ? e.message : "Roblox lookup failed"); setRobloxSearchResult(null); }
    finally { setSubmitting(false); }
  };

  const linkRobloxUsername = async () => {
    if (!token) {
      setError("Please login with Discord first.");
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
      if (!res.ok) throw new Error(data?.error || "Link failed");

      await fetchSlotsForTimezone(customerTz);
      setStep("delivery");
    } catch (e) { setError(e instanceof Error ? e.message : "Link failed"); }
    finally { setSubmitting(false); }
  };

  const confirmSlot = async () => {
    if (!pickedSlot || pickedSlotHours.length !== 2 || !orderId || !token) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/shop/orders/${orderId}?action=delivery-slot`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          slotId: pickedSlot,
          customerTimezone: customerTz,
          customerStartAt: pickedSlotHours[0],
          customerEndAt: pickedSlotHours[1],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setStep("ticket");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  const toggleSlotHour = (segmentId: string, value: string) => {
    if (pickedSlot !== segmentId) {
      setPickedSlot(segmentId);
      setPickedSlotHours([value]);
      return;
    }
    setPickedSlotHours((currentHours) => {
      if (currentHours.includes(value)) return currentHours.filter((item) => item !== value);
      if (currentHours.length >= 2) return [value];
      return [...currentHours, value];
    });
  };

  const copyPaymentValue = async (value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedPaymentValue(value);
    window.setTimeout(() => setCopiedPaymentValue((current) => current === value ? null : current), 1600);
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
      setError("Upload your payment screenshot before creating a ticket.");
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
      if (!res.ok) throw new Error(data?.error || "Failed");
      const ticketUrl = data?.guildId && data?.channelId
        ? `https://discord.com/channels/${data.guildId}/${data.channelId}`
        : data?.panelUrl || "";
      setTicketResult({ channelId: data.channelId, guildId: data.guildId, url: ticketUrl });
      clearPendingCheckout();
      clearCartState();
      if (ticketUrl) window.location.href = ticketUrl;
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setSubmitting(false); ticketInFlightRef.current = false; }
  };

  if (loading) return <div className="min-h-screen bg-[#050505]"><Navbar showCart={step === "shop"} cartCount={cartCount} onCartClick={openCart} /><LogoLoader /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
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
                  <h3 className="text-sm font-semibold text-white">Welcome! Get 20% OFF your first order</h3>
                  <p className="text-xs text-[#B5B5B5]">Minimum order: $5 • Use code at checkout</p>
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
            <p className="text-sm font-medium text-white">Processing checkout...</p>
          </div>
        </div>
      )}

      {showVisitorNotice && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-[20px] border border-[#1E1E1E] bg-[#111111] p-5 shadow-2xl animate-bounce-in">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">New here?</h2>
                <p className="mt-2 text-sm leading-6 text-[#B5B5B5]">If you are new, please check our vouches before ordering.</p>
              </div>
              <button
                type="button"
                onClick={dismissVisitorNotice}
                className="rounded-full bg-[#1E1E1E] p-2 text-white hover:bg-[#2A2A2A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  dismissVisitorNotice();
                  window.location.href = "/proofs";
                }}
                className="rounded-[14px] bg-[#2F9BE6] px-4 py-3 text-sm font-medium text-white primary-hover-glow"
              >
                View Proofs
              </button>
              <button
                type="button"
                onClick={dismissVisitorNotice}
                className="rounded-[14px] bg-[#1E1E1E] px-4 py-3 text-sm font-medium text-white"
              >
                Close
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
              <button type="button" onClick={scrollToLuckyWheel} className="rounded-[14px] bg-[#2F9BE6] px-4 py-3 text-sm font-medium text-white primary-hover-glow">
                Go to event
              </button>
              <button type="button" onClick={dismissLuckyWheelNotice} className="rounded-[14px] bg-[#1E1E1E] px-4 py-3 text-sm font-medium text-white">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "shop" && cartCount > 0 && (
        <button onClick={openCart} className={"hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 rounded-full bg-[#2F9BE6] px-5 py-3 text-base font-medium shadow-2xl transition-transform hover:scale-105 active:scale-95 cart-pulse primary-hover-glow " + (cartPulse ? "animate-pulse-glow" : "")}>
          <ShoppingCart className="h-5 w-5" /> Cart ({cartCount})
        </button>
      )}

      {(cartOpen || cartClosing) && (
        <div className={"fixed inset-0 z-[70] flex items-end sm:items-stretch bg-black/60 backdrop-blur-sm " + (cartClosing ? "animate-fade-out" : "animate-fade-in")} onClick={closeCart}>
          <div className={"w-full h-[100dvh] sm:my-4 sm:mr-4 sm:ml-auto sm:h-[calc(100%-2rem)] sm:max-w-md bg-[#111111] border-t sm:border border-[#1E1E1E] flex flex-col rounded-none sm:rounded-[24px] " + (cartClosing ? "animate-cart-slide-out" : "animate-cart-slide-in")} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#1E1E1E] px-4 py-4 sticky top-0 bg-[#111111] z-10">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-[#2A2A2A] absolute top-2 left-1/2 -translate-x-1/2 sm:hidden" />
              <h2 className="text-base sm:text-lg font-semibold">Cart ({cartCount})</h2>
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
                    <button onClick={() => removeItem(item._id)} className="text-xs text-[#FF4D4F]">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-[#1E1E1E] px-4 py-4 space-y-3 bg-[#111111]">
                <div className="rounded-[12px] border border-[#1E1E1E] bg-[#050505] p-2">
                  <button type="button" onClick={() => setCartToolsOpen((v) => !v)} className="flex w-full items-center justify-between rounded-[10px] border border-[#1E1E1E] bg-[#0A0A0A] px-3 py-2 text-sm font-semibold">
                    <span>Codes</span>
                    <span className="text-xs text-[#B5B5B5]">{cartToolsOpen ? 'Hide' : 'Show'}</span>
                  </button>
                  <div className={"mt-2 space-y-2 " + (cartToolsOpen ? '' : 'hidden sm:block')}>
                    <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2">
                      <label htmlFor="cart-referral" className="text-[10px] font-bold uppercase tracking-wider text-[#49B6FF]">Referral</label>
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
                        onClick={() => void previewReferralCode().catch((e) => setError(e instanceof Error ? e.message : 'Referral apply failed'))}
                        disabled={!token || !referralCode.trim() || referralApplying || referralApplied}
                        className="rounded-[9px] bg-[#1E1E1E] px-3 py-2 text-xs font-bold text-[#49B6FF] disabled:opacity-50"
                      >
                        {referralApplying ? '...' : (referralApplied ? 'Applied' : 'Apply')}
                      </button>
                    </div>
                    {token && myReferralCode && (
                      <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2 text-[11px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B5B5B5]">Your invite</span>
                        <span className="min-w-0 truncate font-mono font-semibold text-[#49B6FF]">{myReferralCode}</span>
                        <button type="button" onClick={() => void navigator.clipboard.writeText(myReferralCode)} className="rounded-[8px] bg-[#1E1E1E] p-1.5 text-white" title="Copy">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {referralPreviewOwner && (
                      <div className="flex items-center justify-between gap-2 pl-[84px] text-[11px] text-[#B5B5B5]">
                        <span className="min-w-0 truncate">Owner: {referralPreviewOwner}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2">
                      <label htmlFor="cart-coupon" className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A]">Discount</label>
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
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponMessage && (
                      <p className={'pl-[84px] text-xs ' + (activeCouponPreview ? 'text-[#3DDC84]' : 'text-[#FFB3B3]')}>{couponMessage}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-[#B5B5B5]">Subtotal</span><span>{formatMoney(cartTotal)}</span></div>
                  {activeCartDiscountAmount > 0 && (
                    <>
                      {activeCartCouponPercent > 0 && (
                        <div className="flex justify-between text-[#3DDC84]"><span>Coupon ({activeCartCouponPercent}%)</span><span>-{formatMoney(cartTotal * activeCartCouponPercent / 100)}</span></div>
                      )}
                      {activeCartReferralPercent > 0 && (
                        <div className="flex justify-between text-[#3DDC84]"><span>Referral ({activeCartReferralPercent}%)</span><span>-{formatMoney(cartTotal * activeCartReferralPercent / 100)}</span></div>
                      )}
                      <div className="flex justify-between text-[#3DDC84]"><span>Total Discount ({activeCartDiscountPercent}%)</span><span>-{formatMoney(activeCartDiscountAmount)}</span></div>
                    </>
                  )}
                  <div className="flex justify-between border-t border-[#1E1E1E] pt-2 text-lg font-semibold"><span>Total</span><span className="text-[#3DDC84]">{formatMoney(activeCartPayableTotal)}</span></div>
                </div>
                <button onClick={() => { closeCart(); void doCheckout(); }} disabled={submitting} className="w-full rounded-[14px] bg-[#2F9BE6] py-3 font-medium transition-all hover:bg-[#49B6FF] primary-hover-glow disabled:opacity-50">{submitting ? 'Processing...' : 'Checkout'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {(modalOpen || modalClosing) && selectedProduct && (
        <div className={"fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-0 " + (modalClosing ? "animate-fade-out" : "animate-fade-in")} onClick={closeProductModal}>
          <div className={"motion-panel relative mx-3 w-full max-w-[340px] md:max-w-[408px] max-h-[82dvh] overflow-hidden rounded-[20px] border border-[#1E1E1E] bg-[#0A0A0A] shadow-2xl " + (modalClosing ? "animate-modal-zoom-out" : "animate-modal-zoom-in")} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#1E1E1E] bg-[#0A0A0A] px-4 py-2.5">
              <h3 className="text-sm font-semibold text-white">Product Details</h3>
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
                
                <div className="flex items-baseline gap-1.5"><span className="text-xl font-bold text-[#3DDC84]">{formatMoney(selectedProduct.price)}</span><span className="text-[10px] text-[#B5B5B5]">USD</span></div>
                {selectedProduct.bulkPrice && (
                  <p className="text-[10px] leading-4 text-[#2F9BE6]">Bulk: {formatMoney(selectedProduct.bulkPrice)}</p>
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
                <input type="text" value={modalQty} onChange={(e) => { const val = e.target.value; if (val === "") { setModalQty(""); } else { const parsed = parseInt(val); if (!isNaN(parsed)) { setModalQty(Math.max(1, parsed)); } } }} className="w-14 rounded-[14px] border-2 border-[#2A2A2A] bg-[#0A0A0A] py-1.5 text-center text-base font-bold outline-none focus:border-[#2F9BE6]"
                />
                <button onClick={() => setModalQty((typeof modalQty === "number" ? modalQty : parseInt(modalQty) || 1) + 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] active:scale-90"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            </div>
            <div className="border-t border-[#1E1E1E] bg-[#0A0A0A] px-4 py-3">
              <button onClick={addToCartFromModal} className="w-full rounded-full bg-gradient-to-r from-[#2F9BE6] to-[#49B6FF] py-3.5 text-sm font-semibold text-white active:scale-95 primary-hover-glow">Add to Cart</button>
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
                <h3 className="text-lg font-semibold text-white mb-2">Error</h3>
                <p className="text-sm text-[#B5B5B5] leading-relaxed break-words">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="w-full rounded-[14px] bg-[#FF4D4F] px-4 py-3 text-sm font-medium text-white hover:bg-[#FF6B6B] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-4 sm:py-6 animate-page-enter">

        {step !== "shop" && (
          <div className="mx-auto max-w-2xl space-y-6 animate-page-enter">
            <button onClick={() => (() => { setStep("shop"); setOrderId(null); setCheckoutSummary(null); selectPaymentProofFile(null); clearPendingCheckout(); })()} className="flex items-center gap-2 text-sm text-[#B5B5B5] hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Shop
            </button>
            <div className="flex gap-2">{(["roblox", "delivery", "ticket"] as const).map((s) => (
              <div key={s} className={"h-2 flex-1 rounded-full transition-colors " + (step === s ? "bg-[#49B6FF]" : (["roblox", "delivery", "ticket"].indexOf(step) > ["roblox", "delivery", "ticket"].indexOf(s) ? "bg-[#3DDC84]" : "bg-[#161616]"))} />
            ))}</div>
            <div className="motion-panel rounded-[24px] border border-[#1E1E1E] bg-[#111111] p-4 sm:p-6 space-y-4 animate-section-enter">
              <div className="border-b border-[#1E1E1E] pb-3">
                <p className="text-sm text-[#B5B5B5]">Order {orderId}</p>
                <div className="mt-2 space-y-1">{checkoutItems.map((i) => (
                  <div key={String(i._id || ("product" in i ? i.product : "") || i.name)} className="flex justify-between text-sm"><span>{formatPurchasedProductName(i)}</span><span className="text-[#B5B5B5]">{formatMoney(Number(i.price || 0) * Number(i.quantity || 1))}</span></div>
                ))}
                  {Number(checkoutSummary?.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-[#3DDC84]"><span>Discount ({checkoutSummary?.discountPercent || 0}%)</span><span>-{formatMoney(checkoutSummary?.discountAmount || 0)}</span></div>
                  )}
                  <div className="flex justify-between border-t border-[#1E1E1E] pt-2 font-semibold"><span>Total</span><span className="text-[#3DDC84]">{formatMoney(checkoutTotal)}</span></div>
                </div>
              </div>
              {step === "roblox" && (
                <div className="space-y-4">
                  <div className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white"><DiscordIcon className="h-5 w-5 text-[#5865F2]" />Discord Login</h3>
                    {token && user ? (
                      <div className="rounded-[14px] border border-[#3DDC84]/25 bg-[#3DDC84]/10 px-4 py-3 text-sm text-[#3DDC84]">
                        Logged in as {user.discordUsername}
                      </div>
                    ) : (
                      <a
                        href={getOAuthUrl("/shop")}
                        className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#5865F2] py-3 text-center font-medium text-white transition-all hover:bg-[#6875ff]"
                      >
                        <DiscordIcon className="h-5 w-5" />
                        Login with Discord
                      </a>
                    )}
                  </div>
                  {!robloxSearchResult ? (
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-lg font-semibold"><RobloxIcon className="h-5 w-5 text-white" />Enter Roblox Username</h3>
                      <div className="flex flex-col gap-3">
                        <input
                          value={robloxUsernameInput}
                          onChange={(e) => setRobloxUsernameInput(e.target.value)}
                          placeholder="Enter Roblox username..."
                          className="w-full rounded-[14px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 outline-none focus:border-[#2F9BE6]"
                        />
                        <button
                          onClick={() => void lookupRobloxUsername()}
                          disabled={submitting || !robloxUsernameInput.trim() || robloxUsernameInput.length < 3}
                          className="w-full rounded-[14px] bg-[#2F9BE6] py-3 font-medium transition-all hover:bg-[#49B6FF] primary-hover-glow disabled:opacity-50"
                        >
                          {submitting ? "Searching..." : "Lookup Account"}
                        </button>
                      </div>
                      <p className="text-xs text-[#B5B5B5]/80">Enter at least 3 characters to search</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-lg font-semibold"><RobloxIcon className="h-5 w-5 text-white" />Verify Roblox Account</h3>
                      <p className="text-sm text-[#B5B5B5]">Is this your Roblox account?</p>
                      <div className="flex items-center gap-4 rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-[#161616]">
                          {robloxSearchResult.avatar ? (
                            <img src={robloxSearchResult.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-full w-full p-3 text-[#B5B5B5]/60" />
                          )}
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-[#B5B5B5]">Display Name</p>
                          <p className="text-lg font-semibold text-white">{robloxSearchResult.displayName}</p>
                          <p className="text-sm text-[#2F9BE6]">@{robloxSearchResult.username}</p>
                          <a
                            href={`https://www.roblox.com/users/${robloxSearchResult.userId}/profile`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs text-[#B5B5B5] hover:text-white"
                          >
                            View Profile
                          </a>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => { setRobloxSearchResult(null); setRobloxUsernameInput(""); }}
                          className="rounded-[14px] bg-[#1E1E1E] py-3 font-medium transition-colors hover:bg-[#1E1E1E]"
                        >
                          Re-enter
                        </button>
                        <button
                          onClick={() => void linkRobloxUsername()}
                          disabled={submitting || !token}
                          className="rounded-[14px] bg-[#3DDC84] py-3 font-medium transition-colors hover:bg-[#3DDC84]/90 primary-hover-glow disabled:opacity-50"
                        >
                          {token ? "Confirm" : "Login first"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {step === "delivery" && (
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-semibold"><MapPin className="h-5 w-5" />Delivery Time</h3>
                  <div className="space-y-3 rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[#B5B5B5]/80">Your timezone</p>
                        <p className="text-sm font-medium text-[#B5B5B5]">{selectedTimezoneLabel}</p>
                        <p className="text-xs text-[#B5B5B5]/80">{customerTz}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const detected = detectUserTimezone();
                          selectTimezone(detected);
                        }}
                        className="rounded-[14px] bg-[#161616] px-3 py-2 text-xs font-medium text-[#B5B5B5] hover:bg-[#1E1E1E]"
                      >
                        Auto detect
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B5B5B5]/80" />
                      <input
                        value={tzSearch}
                        onChange={(e) => setTzSearch(e.target.value)}
                        placeholder="Search country or timezone..."
                        className="w-full rounded-[14px] border border-[#1E1E1E] bg-[#111111] py-3 pl-9 pr-3 text-sm outline-none focus:border-[#2F9BE6]"
                      />
                    </div>
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {timezoneCountryGroups.map((group) => {
                        const isExpanded = expandedCountry === group.country;
                        const hasMultiple = group.zones.length > 1;
                        const isAnySelected = group.zones.some((zone) => zone.value === customerTz);

                        return (
                          <div key={group.country} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (hasMultiple) {
                                  setExpandedCountry(isExpanded ? null : group.country);
                                  return;
                                }
                                selectTimezone(group.zones[0].value);
                              }}
                              className={"w-full rounded-[14px] border p-3 text-left transition-all " + (!hasMultiple && isAnySelected ? "border-[#2F9BE6] bg-[#49B6FF]/10" : "border-[#1E1E1E] bg-[#111111] hover:border-[#1E1E1E]")}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-white">{group.flag} {group.country}</span>
                                {hasMultiple ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-[#B5B5B5]/80"><span>{group.zones.length} zones</span><ChevronDown className={"h-3 w-3 transition-transform " + (isExpanded ? "rotate-180" : "")} /></span>
                                ) : (
                                  <span className="text-xs text-[#B5B5B5]/80">{group.zones[0].value.split("/").pop()?.replaceAll("_", " ")}</span>
                                )}
                              </div>
                              {!hasMultiple && <p className="mt-1 text-xs text-[#B5B5B5]">{group.zones[0].label}</p>}
                            </button>
                            {hasMultiple && isExpanded && (
                              <div className="ml-4 space-y-1 border-l-2 border-[#1E1E1E] pl-3">
                                {group.zones.map((tz) => (
                                  <button
                                    key={tz.value}
                                    type="button"
                                    onClick={() => selectTimezone(tz.value)}
                                    className={"w-full rounded-[14px] border p-2 text-left transition-all " + (customerTz === tz.value ? "border-[#2F9BE6] bg-[#49B6FF]/10" : "border-[#1E1E1E] bg-[#050505] hover:border-[#1E1E1E]")}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-sm text-[#B5B5B5]">{tz.label}</span>
                                      <span className="text-xs text-[#B5B5B5]/80">{tz.value.split("/").pop()?.replaceAll("_", " ")}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-3 rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <button type="button" onClick={() => setDeliveryMonth((current) => addMonths(current || deliveryMonthKey, -1))} className="rounded-[12px] bg-[#111111] p-2 text-[#B5B5B5] hover:text-white">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <p className="text-sm font-semibold text-white">{getMonthLabel(deliveryMonthKey)}</p>
                        <button type="button" onClick={() => setDeliveryMonth((current) => addMonths(current || deliveryMonthKey, 1))} className="rounded-[12px] bg-[#111111] p-2 text-[#B5B5B5] hover:text-white">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[#B5B5B5]/70">
                        {WEEKDAY_LABELS.map((day) => <div key={day}>{day}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {deliveryCalendarDays.map((day) => {
                          const hasSlots = slotDateSet.has(day.key);
                          return (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => {
                                if (!day.inMonth) return;
                                setSelectedSlotDate(day.key);
                                setPickedSlot(null);
                                setPickedSlotHours([]);
                              }}
                              disabled={!day.inMonth}
                              className={"relative h-10 rounded-[12px] text-sm font-medium transition-all " + (selectedSlotDate === day.key
                                ? "bg-[#2F9BE6] text-white"
                                : hasSlots
                                  ? "bg-[#111111] text-white hover:bg-[#1E1E1E]"
                                  : day.inMonth
                                    ? "bg-[#080808] text-[#B5B5B5] hover:bg-[#111111]"
                                    : "bg-transparent text-[#B5B5B5]/20")}
                            >
                              {day.day}
                              {hasSlots && selectedSlotDate !== day.key && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#3DDC84]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-sm text-[#B5B5B5]">Please select exactly 2 hours.</p>
                    {visibleSlotSegments.length === 0 && <p className="text-sm text-[#B5B5B5]">No available times for this date.</p>}
                    {visibleSlotSegments.map((s) => {
                      const hourChoices = buildHourChoices(s, customerTz);
                      const isPickedSegment = pickedSlot === s.id;
                      return (
                        <div key={s.id} className={"w-full rounded-[16px] border p-4 text-left transition-all " + (isPickedSegment ? "border-[#2F9BE6] bg-[#49B6FF]/10" : "border-[#1E1E1E] bg-[#050505]")}>
                          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#2F9BE6]" /><span className="text-sm font-medium">{s.customerTimeLabel}</span></div>
                          {s.note && <p className="mt-1 pl-6 text-xs text-[#2F9BE6]">{formatSlotNote(s.note)}</p>}
                          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {hourChoices.map((choice) => {
                              const selected = isPickedSegment && pickedSlotHours.includes(choice.value);
                              return (
                                <button
                                  key={choice.value}
                                  type="button"
                                  onClick={() => toggleSlotHour(s.id, choice.value)}
                                  className={"rounded-[12px] border px-3 py-2 text-sm font-medium transition-all " + (selected
                                    ? "border-[#2F9BE6] bg-[#2F9BE6] text-white"
                                    : "border-[#1E1E1E] bg-[#111111] text-[#B5B5B5] hover:text-white")}
                                >
                                  {choice.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => void confirmSlot()} disabled={!pickedSlot || !hasPickedTwoHours || submitting} className="w-full rounded-[14px] bg-[#2F9BE6] py-3 font-medium primary-hover-glow disabled:opacity-50">{submitting ? "Saving..." : "Confirm time"}</button>
                </div>
              )}
              {step === "ticket" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Select Payment Method</h3>
                  {!ticketResult ? (
                    <div className="space-y-4">
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
                          Litecoin (Recommended)
                        </button>
                      </div>

                      <div className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4 space-y-4">
                        {selectedPaymentGuide === "paypal_ff" ? (
                          <>
                            <div className="space-y-1">
                              <h4 className="text-base font-semibold text-white">PayPal Payment Guide</h4>
                              <p className="text-sm text-[#B5B5B5]">Payment Method: <span className="font-semibold text-white">Friends and Family</span></p>
                              <p className="text-sm text-[#B5B5B5]">Payment Amount: <span className="font-semibold text-[#3DDC84]">{formatMoney(checkoutTotal)}</span></p>
                            </div>
                            <div>
                              <p className="mb-2 text-sm text-[#B5B5B5]">Send to</p>
                              <div className="flex gap-2">
                                <div className="min-w-0 flex-1 break-all rounded-[14px] border border-[#1E1E1E] bg-[#111111] px-3 py-3 font-mono text-sm text-white">{PAYPAL_EMAIL}</div>
                                <button type="button" onClick={() => void copyPaymentValue(PAYPAL_EMAIL)} className="rounded-[14px] bg-[#1E1E1E] px-3 text-white">
                                  {copiedPaymentValue === PAYPAL_EMAIL ? <CheckCircle2 className="h-4 w-4 text-[#3DDC84]" /> : <Copy className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm leading-6 text-[#B5B5B5]">
                              <p><span className="font-semibold text-white">1.</span> Select <span className="font-semibold text-white">Friends and Family</span> as the payment method.</p>
                              <p><span className="font-semibold text-white">2.</span> Send <span className="font-semibold text-white">{formatMoney(checkoutTotal)}</span> to the PayPal email address above.</p>
                              <p><span className="font-semibold text-white">3.</span> After completing the payment, click the <span className="font-semibold text-white">Create Ticket</span> button below.</p>
                              <p><span className="font-semibold text-white">4.</span> Upload your payment screenshot below, then create the ticket.</p>
                            </div>
                            <div className="rounded-[14px] border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3 text-sm text-[#FFB3B3]">
                              Payments sent using Goods and Services instead of Friends and Family are not eligible for a refund.
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <h4 className="text-base font-semibold text-white">LTC Payment Guide</h4>
                              <p className="text-sm text-[#B5B5B5]">Payment Method: <span className="font-semibold text-white">Litecoin (LTC)</span></p>
                              <p className="text-sm text-[#B5B5B5]">Payment Amount: <span className="font-semibold text-[#3DDC84]">{formatMoney(checkoutTotal)}</span></p>
                            </div>
                            <div>
                              <p className="mb-2 text-sm text-[#B5B5B5]">Payment Address</p>
                              <div className="flex gap-2">
                                <div className="min-w-0 flex-1 break-all rounded-[14px] border border-[#1E1E1E] bg-[#111111] px-3 py-3 font-mono text-sm text-white">{LTC_ADDRESS}</div>
                                <button type="button" onClick={() => void copyPaymentValue(LTC_ADDRESS)} className="rounded-[14px] bg-[#1E1E1E] px-3 text-white">
                                  {copiedPaymentValue === LTC_ADDRESS ? <CheckCircle2 className="h-4 w-4 text-[#3DDC84]" /> : <Copy className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            <img src="/pictures/payments/ltc.png" alt="Litecoin QR code" className="h-44 w-44 rounded-[14px] border border-[#1E1E1E] bg-white p-2" />
                            <div className="space-y-2 text-sm leading-6 text-[#B5B5B5]">
                              <p><span className="font-semibold text-white">1.</span> Select <span className="font-semibold text-white">Litecoin (LTC)</span> as the payment method.</p>
                              <p><span className="font-semibold text-white">2.</span> Send <span className="font-semibold text-white">{formatMoney(checkoutTotal)}</span> worth of LTC to the wallet address above, or scan the QR code.</p>
                              <p><span className="font-semibold text-white">3.</span> After completing the payment, click the <span className="font-semibold text-white">Create Ticket</span> button below.</p>
                              <p><span className="font-semibold text-white">4.</span> Upload your payment screenshot below, then create the ticket.</p>
                            </div>
                            <div className="rounded-[14px] border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3 text-sm text-[#FFB3B3]">
                              Please double-check the wallet address before sending. Crypto payments are non-refundable once confirmed on the blockchain.
                            </div>
                          </>
                        )}
                      </div>
                      <div className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4">
                        <label className="block text-sm font-semibold text-white" htmlFor="payment-proof-upload">Payment screenshot</label>
                        <input
                          id="payment-proof-upload"
                          type="file"
                          accept="image/*"
                          onChange={(event) => selectPaymentProofFile(event.target.files?.[0] || null)}
                          className="mt-3 w-full rounded-[14px] border border-[#1E1E1E] bg-[#111111] px-3 py-3 text-sm text-[#B5B5B5] file:mr-3 file:rounded-[10px] file:border-0 file:bg-[#2F9BE6] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                        />
                        {paymentProofFile && <p className="mt-2 text-xs text-[#3DDC84]">{paymentProofFile.name}</p>}
                        {paymentProofPreviewUrl && <img src={paymentProofPreviewUrl} alt="Payment proof preview" className="mt-3 max-h-48 rounded-[12px] border border-[#1E1E1E] object-contain" />}
                      </div>
                      <button onClick={() => void createTicket(selectedPaymentGuide)} disabled={submitting || !paymentProofFile} className="w-full rounded-[14px] bg-[#3DDC84] py-3 font-medium primary-hover-glow disabled:opacity-50">
                        {submitting ? "Creating..." : selectedPaymentGuide === "ltc" ? "Create LTC Ticket" : "Create PayPal Ticket"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-[16px] border border-[#3DDC84]/30 bg-[#3DDC84]/10 p-4"><CheckCircle2 className="h-5 w-5 text-[#3DDC84]" /><span className="text-sm">Ticket created!</span></div>
                      <button onClick={() => { (() => { setStep("shop"); setOrderId(null); setCheckoutSummary(null); clearPendingCheckout(); })(); clearCartState(); setOrderId(null); setRobloxUsernameInput(""); setPickedSlot(null); setTicketResult(null); selectPaymentProofFile(null); }} className="w-full rounded-[14px] bg-[#161616] py-3 text-sm">Continue Shopping</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "shop" && (
          <div className="space-y-8">
            <div className="motion-panel overflow-hidden rounded-[20px] border border-[#1E1E1E] bg-[#111111]/70 py-3 animate-section-enter">
              <div className="flex animate-[scroll_30s_linear_infinite] whitespace-nowrap">
                {[...recentPurchases, ...recentPurchases].map((p, i) => (
                  <span key={i} className="mx-4 inline-flex items-center gap-2 text-sm text-[#B5B5B5] sm:mx-6">
                    <span className="text-[#2F9BE6] font-medium">{maskName(p.username)}</span>
                    <span className="text-[#B5B5B5]/80">purchased</span>
                    <span className="text-[#3DDC84]">{p.items}</span>
                    {p.price && <span className="text-[#B5B5B5]">@ {formatMoney(p.price)}</span>}
                  </span>
                ))}
              </div>
              <style>{`@keyframes scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
            </div>

            {luckyWheel?.enabled && (
              <div className="grid grid-cols-2 gap-2 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileShopView("items")}
                  className={"rounded-[14px] px-4 py-3 text-sm font-semibold " + (mobileShopView === "items" ? "bg-[#2F9BE6] text-white" : "bg-[#111111] text-[#B5B5B5]")}
                >
                  Items
                </button>
                <button
                  type="button"
                  onClick={() => setMobileShopView("wheel")}
                  className={"rounded-[14px] px-4 py-3 text-sm font-semibold " + (mobileShopView === "wheel" ? "bg-[#2F9BE6] text-white" : "bg-[#111111] text-[#B5B5B5]")}
                >
                  Lucky Wheel
                </button>
              </div>
            )}

            {luckyWheel?.enabled && (
              <section id="lucky-wheel-event" className={"motion-panel rounded-[20px] border border-[#2F9BE6]/30 bg-[#111111] p-5 animate-section-enter " + (mobileShopView === "wheel" ? "block" : "hidden md:block")}>
                <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                  <div className="relative mx-auto aspect-square w-full max-w-[320px] rounded-full border-4 border-[#2F9BE6]/50 bg-[#050505] p-4 shadow-[0_0_46px_rgba(47,155,230,0.2)]">
                    <div
                      className="relative h-full w-full rounded-full border border-[#1E1E1E] transition-transform duration-[4200ms] ease-out"
                      style={{ background: wheelGradient, transform: `rotate(${wheelRotation}deg)` }}
                    >
                      {wheelSlices.map((slice, index) => {
                        const count = Math.max(1, wheelSlices.length);
                        const angle = (index + 0.5) * (360 / count);
                        const cssAngle = angle - 90;
                        const wheelLabel = slice.type === "discount" ? `${slice.discountPercent}% OFF` : "TRY AGAIN";
                        return (
                          <div
                            key={`${slice.label}-${index}`}
                            className="absolute left-1/2 top-1/2 h-0 w-0 origin-left"
                            style={{ transform: `rotate(${cssAngle}deg) translateX(92px)` }}
                          >
                            <span
                              className="absolute left-1/2 top-1/2 w-[92px] text-center text-[10px] font-black uppercase leading-none text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)] transition-transform duration-[4200ms] ease-out"
                              style={{ transform: `translate(-50%, -50%) rotate(${-cssAngle - wheelRotation}deg)` }}
                            >
                              {wheelLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute left-1/2 top-1 z-10 h-0 w-0 -translate-x-1/2 border-l-[11px] border-r-[11px] border-t-[34px] border-l-transparent border-r-transparent border-t-[#F7D154] drop-shadow-[0_3px_8px_rgba(247,209,84,0.5)]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full border border-[#1E1E1E] bg-[#050505] px-5 py-3 text-center text-sm font-semibold text-white shadow-lg">
                        SPIN
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{luckyWheel.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#B5B5B5]">{luckyWheel.message}</p>
                    </div>
                    <div className="rounded-[16px] border border-[#1E1E1E] bg-[#050505] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-[#B5B5B5]">Your spin tickets</p>
                          <p className="text-2xl font-bold text-[#3DDC84]">{token ? luckyWheel.tickets : 0}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void spinLuckyWheel()}
                          disabled={luckyWheelLoading || (token ? luckyWheel.tickets <= 0 : false)}
                          className="rounded-[14px] bg-[#2F9BE6] px-5 py-3 text-sm font-semibold text-white primary-hover-glow disabled:opacity-50"
                        >
                          {!token ? "Login to spin" : luckyWheelLoading ? "Spinning..." : "Spin now"}
                        </button>
                      </div>
                      {luckyWheelResult && (
                        <div className="mt-4 rounded-[14px] border border-[#1E1E1E] bg-[#111111] p-4">
                          <p className={luckyWheelResult.result === "discount" ? "text-[#3DDC84]" : "text-[#B5B5B5]"}>
                            {luckyWheelResult.result === "discount"
                              ? `${luckyWheelResult.discountPercent}% discount unlocked.`
                              : "Better luck next time."}
                          </p>
                          {luckyWheelResult.couponCode && (
                            <div className="mt-3 flex gap-2">
                              <div className="min-w-0 flex-1 break-all rounded-[12px] border border-[#1E1E1E] bg-[#050505] px-3 py-2 font-mono text-sm text-white">{luckyWheelResult.couponCode}</div>
                              <button type="button" onClick={() => void copyLuckyCoupon(luckyWheelResult.couponCode || "")} className="inline-flex items-center gap-2 rounded-[12px] bg-[#1E1E1E] px-4 text-sm font-semibold text-white">
                                {copiedLuckyCode ? <CheckCircle2 className="h-4 w-4 text-[#3DDC84]" /> : <Copy className="h-4 w-4" />}
                                {copiedLuckyCode ? "Copied" : "Copy code"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className={luckyWheel?.enabled && mobileShopView === "wheel" ? "hidden md:block" : ""}>
            <div className="relative animate-section-enter mb-6">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B5B5B5]" />
              <input value={searchInput} onChange={handleSearchChange} placeholder="Search items..." className="w-full rounded-[20px] border border-[#1E1E1E] bg-[#111111] py-4 pl-11 pr-4 text-base outline-none transition-colors focus:border-[#2F9BE6]" />
            </div>

            <div className="mb-6 flex items-center gap-2 animate-section-enter">
              <span className="text-sm text-[#B5B5B5]/80">Price</span>
              {([
                ["none", "Default"],
                ["low-high", "Low to High"],
                ["high-low", "High to Low"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriceSort(value)}
                  className={"rounded-full px-4 py-2 text-sm font-medium transition-all " + (priceSort === value ? "bg-[#2F9BE6] text-white" : "bg-[#111111] text-[#B5B5B5] hover:text-white")}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 animate-section-enter scrollbar-hide">
              <button onClick={() => setSelectedGame(null)} className={"shrink-0 rounded-full px-5 py-3 text-sm font-medium transition-all " + (!activeSelectedGame ? "bg-[#2F9BE6] text-white shadow-lg" : "bg-[#111111] text-[#B5B5B5] active:bg-[#161616]")}>
                All Games
              </button>
              {games.map((g) => (
                <button key={g._id} onClick={() => setSelectedGame(g._id)} className={"flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all " + (activeSelectedGame === g._id ? "bg-[#2F9BE6] text-white shadow-lg" : "bg-[#111111] text-[#B5B5B5] active:bg-[#161616]")}>
                  {g.image && (
                    <>
                      <img src={imgUrl(g.image)} alt="" data-fallback-src="/pictures/logo.png" onError={handleShopImageError} className={(isSailorPieceGame(g) ? "hidden sm:block " : "") + "h-5 w-5 rounded object-cover"} />
                      {isSailorPieceGame(g) && <img src={SAILOR_PIECE_MOBILE_ICON} alt="" data-fallback-src="/pictures/logo.png" onError={handleShopImageError} className="h-5 w-5 rounded object-cover sm:hidden" />}
                    </>
                  )}
                  {g.name}
                </button>
              ))}
            </div>

            {banners.length > 0 && (
              <div className="motion-panel overflow-hidden rounded-[24px] border border-[#1E1E1E] animate-section-enter mb-8">
                <img src={imgUrl(banners[0])} alt="" onError={handleShopImageError} className="w-full max-w-full h-auto object-cover max-h-[220px] sm:max-h-[320px] md:max-h-[400px]" />
              </div>
            )}

            {bestSellers.length > 0 && !activeSelectedGame && !searchQuery && (
              <div className="animate-section-enter">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-[#2F9BE6]">Best Sellers</h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBestSellerPage((page) => Math.max(0, page - 1))}
                      disabled={bestSellerPage === 0}
                      className="rounded-[14px] border border-[#1E1E1E] bg-[#111111] p-2 text-[#B5B5B5] hover:border-[#2F9BE6]/40 hover:bg-[#161616] disabled:opacity-40"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBestSellerPage((page) => Math.min(Math.max(0, Math.ceil(bestSellers.length / BEST_SELLERS_PER_PAGE) - 1), page + 1))}
                      disabled={bestSellerPage >= Math.ceil(bestSellers.length / BEST_SELLERS_PER_PAGE) - 1}
                      className="rounded-[14px] border border-[#1E1E1E] bg-[#111111] p-2 text-[#B5B5B5] hover:border-[#2F9BE6]/40 hover:bg-[#161616] disabled:opacity-40"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {bestSellers
                    .slice(bestSellerPage * BEST_SELLERS_PER_PAGE, (bestSellerPage + 1) * BEST_SELLERS_PER_PAGE)
                    .map((p, idx) => (
                      <ProductCard key={p._id} product={p} index={idx} onOpen={openProductModal} variant="bestSeller" />
                    ))}
                </div>
              </div>
            )}

            <div className="animate-section-enter">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">{activeSelectedGame ? games.find((g) => g._id === activeSelectedGame)?.name || "Items" : "All Items"}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filtered.map((p, idx) => (
                  <ProductCard key={p._id} product={p} index={idx} onOpen={openProductModal} />
                ))}
              </div>
              {filtered.length === 0 && <div className="py-20 text-center text-[#B5B5B5]"><Package className="mx-auto mb-4 h-16 w-16 opacity-30" /><p>No items found.</p></div>}
            </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


























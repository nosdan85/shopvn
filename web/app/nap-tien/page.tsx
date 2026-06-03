"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthViet } from "../context/AuthVietContext";
import BackButton from "../components/BackButton";
import {
  Banknote,
  Smartphone,
  RefreshCw,
  Copy,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";

interface GiaoDich {
  _id: string;
  loai: string;
  phuongThuc: string;
  soTien: number;
  trangThai: string;
  ngayTao: string;
  maGiaoDich?: string;
  ghiChu?: string;
}

interface MenhGiaThe {
  giaTri: number;
  nhaMang: string;
}

interface ThongTinChuyenKhoan {
  maGiaoDich: string;
  nganHang: string;
  soTaiKhoan: string;
  tenChuTaiKhoan: string;
  soTien: number;
  noiDung: string;
  qrCode?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function formatVND(amount: number | string | undefined | null): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("vi-VN");
}

export default function NapTienPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, soDuVnd, layThongTin } = useAuthViet();

  const [activeTab, setActiveTab] = useState<"chuyen-khoan" | "the-cao">("chuyen-khoan");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Bank transfer state
  const [chuyenKhoanSoTien, setChuyenKhoanSoTien] = useState<string>("");
  const [chuyenKhoanResult, setChuyenKhoanResult] = useState<ThongTinChuyenKhoan | null>(null);
  const [chuyenKhoanPolling, setChuyenKhoanPolling] = useState(false);
  const [copiedMaGD, setCopiedMaGD] = useState(false);
  const pollingRef = useRef<number | null>(null);

  // Card charging state
  const [nhaMang, setNhaMang] = useState<string>("");
  const [menhGia, setMenhGia] = useState<string>("");
  const [serialThe, setSerialThe] = useState<string>("");
  const [maThe, setMaThe] = useState<string>("");
  const [theCaoResult, setTheCaoResult] = useState<{ success?: boolean; message?: string; soTien?: number } | null>(null);
  const [menhGiaList, setMenhGiaList] = useState<MenhGiaThe[]>([]);

  // History state
  const [lichSu, setLichSu] = useState<GiaoDich[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadMenhGia = useCallback(async () => {
    try {
      const res = await fetch("/api/vi/nap-tien/the-cao/menh-gia", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setMenhGiaList(data);
      }
    } catch {
      // Silent fail
    }
  }, []);

  const loadLichSu = useCallback(async () => {
    if (!token) return;
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/vi/vi/lich-su", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setLichSu(data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingHistory(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading || !token) return;
    loadMenhGia();
    loadLichSu();
  }, [authLoading, token, loadMenhGia, loadLichSu]);

  // Polling for bank transfer status
  const pollChuyenKhoanStatus = useCallback(
    async (maGiaoDich: string) => {
      if (!token) return;
      try {
        const res = await fetch(`/api/vi/nap-tien/chuyen-khoan/${maGiaoDich}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) {
          const status = String(data.trangThai || "").toLowerCase();
          if (status === "success" || status === "hoan-thanh" || status === "completed" || status === "da-xu-ly") {
            setChuyenKhoanPolling(false);
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setSuccessMsg("Giao dich thanh cong! " + formatVND(data.soTien) + " VND da cong vao vi");
            layThongTin();
            loadLichSu();
          } else if (status === "failed" || status === "rejected" || status === "bi-tuz-choi") {
            setChuyenKhoanPolling(false);
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setError("Giao dich bi tu choi hoac that bai");
          }
        }
      } catch {
        // Continue polling
      }
    },
    [token, layThongTin, loadLichSu]
  );

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleAmountClick = (amount: number) => {
    setChuyenKhoanSoTien(String(amount));
    setError(null);
    setSuccessMsg(null);
    setChuyenKhoanResult(null);
    setTheCaoResult(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setChuyenKhoanSoTien(val);
    setError(null);
    setSuccessMsg(null);
    setChuyenKhoanResult(null);
    setTheCaoResult(null);
  };

  const handleChuyenKhoanSubmit = async () => {
    if (!token) return;
    const soTien = parseInt(chuyenKhoanSoTien) || 0;
    if (soTien < 10000) {
      setError("Toi thieu 10,000 VND");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    setChuyenKhoanResult(null);

    try {
      const res = await fetch("/api/vi/nap-tien/chuyen-khoan/tao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ soTienVnd: soTien }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Tao giao dich that bai");
      }
      setChuyenKhoanResult({
        maGiaoDich: data.maGiaoDich || "",
        nganHang: data.nganHang || "MB Bank",
        soTaiKhoan: data.soTaiKhoan || "",
        tenChuTaiKhoan: data.tenChuTaiKhoan || "",
        soTien: data.soTien || soTien,
        noiDung: data.noiDung || data.maGiaoDich || "",
        qrCode: data.qrCode || "",
      });

      // Start polling
      setChuyenKhoanPolling(true);
      const maGD = data.maGiaoDich;
      if (maGD) {
        pollingRef.current = window.setInterval(() => {
          pollChuyenKhoanStatus(maGD);
        }, 5000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tao giao dich that bai");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyReferenceCode = async () => {
    if (!chuyenKhoanResult?.noiDung) return;
    try {
      await navigator.clipboard.writeText(chuyenKhoanResult.noiDung);
      setCopiedMaGD(true);
      setTimeout(() => setCopiedMaGD(false), 2000);
    } catch {
      // Silent fail
    }
  };

  const handleKiemTraChuyenKhoan = async () => {
    if (!chuyenKhoanResult?.maGiaoDich || !token) return;
    setChuyenKhoanPolling(true);
    pollingRef.current = window.setInterval(() => {
      pollChuyenKhoanStatus(chuyenKhoanResult.maGiaoDich);
    }, 5000);
  };

  const handleTheCaoSubmit = async () => {
    if (!token) return;
    if (!nhaMang || !menhGia || !serialThe || !maThe) {
      setError("Vui long dien day du thong tin the");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    setTheCaoResult(null);

    try {
      const res = await fetch("/api/vi/nap-tien/the-cao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nhaMang,
          menhGia: parseInt(menhGia),
          serial: serialThe.trim(),
          maThe: maThe.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.message) {
          setTheCaoResult({ success: false, message: data.message });
        } else {
          throw new Error(data.message || "Nap the that bai");
        }
        return;
      }
      setTheCaoResult({
        success: true,
        message: data.message || "Nap the thanh cong!",
        soTien: data.soTien || parseInt(menhGia),
      });
      if (data.success || data.soTien) {
        layThongTin();
        loadLichSu();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nap the that bai");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === "success" || s === "hoan-thanh" || s === "completed" || s === "da-xu-ly") {
      return "bg-[#3DDC84]/20 text-[#3DDC84]";
    }
    if (s === "pending" || s === "cho-xu-ly" || s === "dang-doi") {
      return "bg-[#F59E0B]/20 text-[#F59E0B]";
    }
    if (s === "failed" || s === "rejected" || s === "that-bai" || s === "bi-tu-choi") {
      return "bg-[#FF4D4F]/20 text-[#FF4D4F]";
    }
    return "bg-[#B5B5B5]/20 text-[#B5B5B5]";
  };

  const getLoaiLabel = (loai: string, phuongThuc: string) => {
    if (loai === "nap-tien") {
      if (phuongThuc === "chuyen-khoan") return "Chuyen Khoan";
      if (phuongThuc === "the-cao") return "The Cao";
    }
    return loai || phuongThuc || "-";
  };

  const formatNgay = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const refreshBalance = async () => {
    await layThongTin();
    await loadLichSu();
  };

  const handleLoginRedirect = () => {
    router.push("/dang-nhap");
  };

  const amountButtons = [10000, 20000, 50000, 100000, 200000, 500000];
  const supportedMenhGia = menhGiaList.filter(
    (mg) => mg.nhaMang === nhaMang || !nhaMang
  );

  // Auth guard
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2F9BE6]" />
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-[#050505] p-4">
        <div className="mx-auto max-w-md rounded-[20px] border border-[#1E1E1E] bg-[#111111] p-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-[#2F9BE6]/20 p-4">
              <AlertCircle className="h-8 w-8 text-[#2F9BE6]" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-white">Truy cap bi chan</h2>
          <p className="mt-2 text-sm text-[#B5B5B5]">
            Vui long dang nhap de nap tien
          </p>
          <button
            onClick={handleLoginRedirect}
            className="mt-4 w-full rounded-[14px] bg-[#2F9BE6] py-3 font-medium text-white transition-all hover:bg-[#49B6FF] primary-hover-glow"
          >
            Dang Nhap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-[#1E1E1E] bg-[#050505]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">Nap Tien</h1>
            <p className="mt-1 text-sm text-[#B5B5B5]">
              So du:{' '}<span className="font-semibold text-[#3DDC84]">
                {formatVND(soDuVnd)} VND
              </span>
            </p>
          </div>
          <button
            onClick={refreshBalance}
            className="rounded-full bg-[#1E1E1E] p-3 transition-all hover:bg-[#2A2A2A] active:scale-95"
            title="Lam moi"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4">
        <BackButton href="/cua-hang" label="Cửa Hàng" variant="back" />
        <div className="mt-4">
        {/* Error / Success Messages */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-[#FF4D4F]/30 bg-[#FF4D4F]/10 p-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-[#FF4D4F]" />
            <p className="text-sm text-[#FF4D4F]">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-[#3DDC84]/30 bg-[#3DDC84]/10 p-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#3DDC84]" />
            <p className="text-sm text-[#3DDC84]">{successMsg}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-4 flex rounded-[14px] border border-[#1E1E1E] bg-[#111111] p-1">
          <button
            onClick={() => {
              setActiveTab("chuyen-khoan");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] py-3 font-medium transition-all ${
              activeTab === "chuyen-khoan"
                ? "bg-[#2F9BE6] text-white"
                : "text-[#B5B5B5] hover:bg-[#1A1A1A]"
            }`}
          >
            <Banknote className="h-5 w-5" />
            Chuyen Khoan
          </button>
          <button
            onClick={() => {
              setActiveTab("the-cao");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] py-3 font-medium transition-all ${
              activeTab === "the-cao"
                ? "bg-[#2F9BE6] text-white"
                : "text-[#B5B5B5] hover:bg-[#1A1A1A]"
            }`}
          >
            <Smartphone className="h-5 w-5" />
            The Cao
          </button>
        </div>

        {/* TAB 1: Chuyen Khoan */}
        {activeTab === "chuyen-khoan" && (
          <div className="space-y-4">
            {!chuyenKhoanResult ? (
              <>
                {/* Amount Selector */}
                <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-4">
                  <h3 className="mb-3 text-sm font-semibold text-[#B5B5B5]">
                    Chon so tien
                  </h3>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {amountButtons.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleAmountClick(amt)}
                        className={`rounded-[12px] border py-3 text-sm font-semibold transition-all active:scale-95 ${
                          chuyenKhoanSoTien === String(amt)
                            ? "border-[#2F9BE6] bg-[#2F9BE6]/20 text-[#2F9BE6]"
                            : "border-[#1E1E1E] bg-[#050505] text-[#B5B5B5] hover:border-[#2A2A2A]"
                        }`}
                      >
                        {formatVND(amt)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="So tien khac (VND)"
                      value={chuyenKhoanSoTien}
                      onChange={handleCustomAmountChange}
                      className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 text-base font-semibold text-white outline-none focus:border-[#2F9BE6]"
                    />
                    <p className="mt-1 text-xs text-[#B5B5B5]">Toi thieu 10,000 VND</p>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleChuyenKhoanSubmit}
                  disabled={
                    submitting ||
                    !chuyenKhoanSoTien ||
                    parseInt(chuyenKhoanSoTien) < 10000
                  }
                  className="w-full rounded-[14px] bg-[#2F9BE6] py-4 font-semibold text-white transition-all hover:bg-[#49B6FF] primary-hover-glow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Dang xu ly...
                    </span>
                  ) : (
                    "Tao lich chuyen khoan"
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Result Display */}
                <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-4 space-y-4">
                  <div className="text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-[#3DDC84]" />
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      Lich chuyen khoan
                    </h3>
                  </div>

                  <div className="space-y-3 rounded-[12px] bg-[#050505] p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B5B5B5]">Ngan hang</span>
                      <span className="font-medium text-white">
                        {chuyenKhoanResult.nganHang}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B5B5B5]">So tai khoan</span>
                      <span className="font-mono font-medium text-white">
                        {chuyenKhoanResult.soTaiKhoan}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B5B5B5]">Ten chu tai khoan</span>
                      <span className="font-medium text-white">
                        {chuyenKhoanResult.tenChuTaiKhoan}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[#1E1E1E] pt-3 text-sm">
                      <span className="text-[#B5B5B5]">So tien</span>
                      <span className="font-bold text-[#3DDC84]">
                        {formatVND(chuyenKhoanResult.soTien)} VND
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 border-t border-[#1E1E1E] pt-3">
                      <span className="text-xs text-[#B5B5B5]">Noi dung (sao chep)</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={chuyenKhoanResult.noiDung}
                          className="flex-1 rounded-[10px] border border-[#1E1E1E] bg-[#111111] px-3 py-2 font-mono text-sm font-semibold text-[#2F9BE6] outline-none"
                        />
                        <button
                          onClick={() => handleCopyReferenceCode()}
                          className={`rounded-[10px] border p-3 transition-all ${
                            copiedMaGD
                              ? "border-[#3DDC84] bg-[#3DDC84]/20 text-[#3DDC84]"
                              : "border-[#1E1E1E] bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]"
                          }`}
                        >
                          {copiedMaGD ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {chuyenKhoanPolling && (
                    <div className="flex items-center justify-center gap-2 rounded-[12px] bg-[#F59E0B]/10 p-3">
                      <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
                      <span className="text-sm text-[#F59E0B]">
                        Dang cho xac nhan...
                      </span>
                    </div>
                  )}

                  <p className="text-center text-xs text-[#B5B5B5]">
                    Tien se tu dong cong vao vi sau khi ngan hang xac nhan
                  </p>

                  <button
                    onClick={handleKiemTraChuyenKhoan}
                    disabled={chuyenKhoanPolling}
                    className="w-full rounded-[14px] border border-[#1E1E1E] bg-[#1A1A1A] py-3 font-medium text-white transition-all hover:bg-[#2A2A2A] disabled:opacity-50"
                  >
                    Da chuyen khoan? Kiem tra
                  </button>

                  <button
                    onClick={() => {
                      setChuyenKhoanResult(null);
                      setChuyenKhoanSoTien("");
                      setError(null);
                      setSuccessMsg(null);
                      if (pollingRef.current) {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
                      }
                      setChuyenKhoanPolling(false);
                    }}
                    className="w-full rounded-[14px] border border-[#1E1E1E] bg-[#050505] py-3 font-medium text-[#B5B5B5] transition-all hover:bg-[#1A1A1A]"
                  >
                    Tao moi
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: The Cao */}
        {activeTab === "the-cao" && (
          <div className="space-y-4">
            {/* Telco Selection */}
            <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-4">
              <label className="mb-2 block text-sm font-semibold text-[#B5B5B5]">
                Chon nha mang
              </label>
              <select
                value={nhaMang}
                onChange={(e) => {
                  setNhaMang(e.target.value);
                  setMenhGia("");
                  setError(null);
                  setTheCaoResult(null);
                }}
                className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 text-white outline-none focus:border-[#2F9BE6]"
              >
                <option value="">-- Chon nha mang --</option>
                <option value="viettel">Viettel</option>
                <option value="vinaphone">Vinaphone</option>
                <option value="mobifone">Mobifone</option>
              </select>
            </div>

            {/* Amount Selection */}
            <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-4">
              <label className="mb-2 block text-sm font-semibold text-[#B5B5B5]">
                Menh gia
              </label>
              <select
                value={menhGia}
                onChange={(e) => {
                  setMenhGia(e.target.value);
                  setError(null);
                  setTheCaoResult(null);
                }}
                disabled={!nhaMang}
                className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 text-white outline-none focus:border-[#2F9BE6] disabled:opacity-50"
              >
                <option value="">-- Chon menh gia --</option>
                {menhGiaList
                  .filter((mg) => mg.nhaMang === nhaMang || (nhaMang === "viettel" && mg.nhaMang === "viettel"))
                  .map((mg) => (
                    <option key={mg.giaTri} value={mg.giaTri}>
                      {formatVND(mg.giaTri)} VND
                    </option>
                  ))}
                {(!menhGiaList.length || nhaMang) && (
                  <>
                    <option value="10000">10,000 VND</option>
                    <option value="20000">20,000 VND</option>
                    <option value="30000">30,000 VND</option>
                    <option value="50000">50,000 VND</option>
                    <option value="100000">100,000 VND</option>
                    <option value="200000">200,000 VND</option>
                    <option value="300000">300,000 VND</option>
                    <option value="500000">500,000 VND</option>
                    <option value="1000000">1,000,000 VND</option>
                  </>
                )}
              </select>
            </div>

            {/* Serial & Card Code */}
            <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#B5B5B5]">
                  Serial the
                </label>
                <input
                  type="text"
                  value={serialThe}
                  onChange={(e) => {
                    setSerialThe(e.target.value);
                    setError(null);
                    setTheCaoResult(null);
                  }}
                  placeholder="Nhap serial the"
                  className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 text-white outline-none focus:border-[#2F9BE6]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#B5B5B5]">
                  Ma the
                </label>
                <input
                  type="text"
                  value={maThe}
                  onChange={(e) => {
                    setMaThe(e.target.value);
                    setError(null);
                    setTheCaoResult(null);
                  }}
                  placeholder="Nhap ma the"
                  className="w-full rounded-[12px] border border-[#1E1E1E] bg-[#050505] px-4 py-3 text-white outline-none focus:border-[#2F9BE6]"
                />
              </div>
            </div>

            {/* Result Message */}
            {theCaoResult && (
              <div
                className={`flex items-center gap-2 rounded-[12px] border p-3 ${
                  theCaoResult.success
                    ? "border-[#3DDC84]/30 bg-[#3DDC84]/10"
                    : "border-[#FF4D4F]/30 bg-[#FF4D4F]/10"
                }`}
              >
                {theCaoResult.success ? (
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#3DDC84]" />
                ) : (
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-[#FF4D4F]" />
                )}
                <p
                  className={`text-sm ${
                    theCaoResult.success
                      ? "text-[#3DDC84]"
                      : "text-[#FF4D4F]"
                  }`}
                >
                  {theCaoResult.success && theCaoResult.soTien
                    ? `Nap the thanh cong! ${formatVND(theCaoResult.soTien)} VND da cong vao vi`
                    : theCaoResult.message}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleTheCaoSubmit}
              disabled={submitting || !nhaMang || !menhGia || !serialThe || !maThe}
              className="w-full rounded-[14px] bg-[#2F9BE6] py-4 font-semibold text-white transition-all hover:bg-[#49B6FF] primary-hover-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Dang xu ly...
                </span>
              ) : (
                "Nap The"
              )}
            </button>
          </div>
        )}

        {/* Transaction History */}
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Lich su giao dich</h2>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#2F9BE6]" />
            </div>
          ) : lichSu.length === 0 ? (
            <div className="rounded-[16px] border border-[#1E1E1E] bg-[#111111] p-6 text-center">
              <Clock className="mx-auto h-8 w-8 text-[#B5B5B5]/50" />
              <p className="mt-2 text-sm text-[#B5B5B5]">Chua co giao dich nao</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lichSu.slice(0, 10).map((gd) => (
                <div
                  key={gd._id}
                  className="flex items-center justify-between rounded-[12px] border border-[#1E1E1E] bg-[#111111] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {getLoaiLabel(gd.loai, gd.phuongThuc)}
                    </p>
                    <p className="text-xs text-[#B5B5B5]">{formatNgay(gd.ngayTao)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#3DDC84]">
                      +{formatVND(gd.soTien)} VND
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
                        gd.trangThai
                      )}`}
                    >
                      {gd.trangThai === "success" || gd.trangThai === "hoan-thanh"
                        ? "Thanh cong"
                        : gd.trangThai === "pending" ||
                            gd.trangThai === "cho-xu-ly"
                        ? "Cho xu ly"
                        : gd.trangThai === "failed" ||
                            gd.trangThai === "rejected"
                        ? "That bai"
                        : gd.trangThai || "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
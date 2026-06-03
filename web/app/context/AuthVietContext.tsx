"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ThongTinNguoiDung {
  _id: string;
  tenDangNhap: string;
  email: string;
  vaiTro: string;
  soDuVnd?: number;
  daLienKetDiscord?: boolean;
  discordTenHienThi?: string;
}

interface AuthVietContextType {
  user: ThongTinNguoiDung | null;
  token: string | null;
  isLoading: boolean;
  soDuVnd: number;
  daDangNhap: boolean;
  daLienKetDiscord: boolean;
  vaiTro: string;
  discordTenHienThi: string | null;
  dangKy: (duLieu: {
    tenDangNhap: string;
    email: string;
    matKhau: string;
    xacNhanMatKhau: string;
  }) => Promise<void>;
  dangNhap: (duLieu: { tenDangNhap: string; matKhau: string }) => Promise<void>;
  dangXuat: () => Promise<void>;
  layThongTin: () => Promise<void>;
  kiemTraDiscord: () => Promise<void>;
  lienKetDiscord: (maDiscord: string) => Promise<void>;
  lamMoiVi: () => Promise<void>;
  getDiscordOAuthUrl: () => string;
}

const AuthVietContext = createContext<AuthVietContextType | undefined>(undefined);

const API_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || ""
    : "";

async function goiApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("webToken")
      : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const phanHoi = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const duLieu = await phanHoi.json();

  if (!phanHoi.ok) {
    // Ưu tiên hiển thị message từ backend
    const errorMessage =
      duLieu.thongBao ||
      duLieu.message ||
      duLieu.chiTiet?.message ||
      `Lỗi ${phanHoi.status}: ${phanHoi.statusText}`;

    throw new Error(errorMessage);
  }

  return duLieu;
}

export function AuthVietProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ThongTinNguoiDung | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [soDuVndState, setSoDuVndState] = useState<number>(0);
  const [discordDaLienKetState, setDiscordDaLienKetState] = useState<boolean>(false);
  const [discordTenHienThiState, setDiscordTenHienThiState] = useState<string | null>(null);

  const daDangNhap = !!user && !!token;
  const vaiTro = user?.vaiTro || "nguoi-dung";

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    const tokenLuu = localStorage.getItem("webToken");
    const userLuu = localStorage.getItem("webUser");

    if (tokenLuu && userLuu) {
      setToken(tokenLuu);
      setUser(JSON.parse(userLuu));

      goiApi<ThongTinNguoiDung>("/api/tai-khoan/thong-tin")
        .then((duLieu) => {
          setUser(duLieu);
          setSoDuVndState(duLieu.soDuVnd || 0);
          setDiscordDaLienKetState(duLieu.daLienKetDiscord || false);
          setDiscordTenHienThiState(duLieu.discordTenHienThi || null);
          localStorage.setItem("webUser", JSON.stringify(duLieu));
        })
        .catch(() => {
          localStorage.removeItem("webToken");
          localStorage.removeItem("webUser");
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const layThongTin = async (): Promise<void> => {
    const duLieu = await goiApi<ThongTinNguoiDung>("/api/tai-khoan/thong-tin");
    setUser(duLieu);
    setSoDuVndState(duLieu.soDuVnd || 0);
    setDiscordDaLienKetState(duLieu.daLienKetDiscord || false);
    setDiscordTenHienThiState(duLieu.discordTenHienThi || null);
    if (typeof window !== "undefined") {
      localStorage.setItem("webUser", JSON.stringify(duLieu));
    }
  };

  const dangKy = async (duLieu: {
    tenDangNhap: string;
    email: string;
    matKhau: string;
    xacNhanMatKhau: string;
  }): Promise<void> => {
    const phanHoi = await goiApi<{
      user: ThongTinNguoiDung;
      token: string;
    }>("/api/tai-khoan/dang-ky", {
      method: "POST",
      body: JSON.stringify(duLieu),
    });

    setUser(phanHoi.user);
    setToken(phanHoi.token);
    setSoDuVndState(phanHoi.user.soDuVnd || 0);
    setDiscordDaLienKetState(phanHoi.user.daLienKetDiscord || false);
    setDiscordTenHienThiState(phanHoi.user.discordTenHienThi || null);

    if (typeof window !== "undefined") {
      localStorage.setItem("webToken", phanHoi.token);
      localStorage.setItem("webUser", JSON.stringify(phanHoi.user));
    }
  };

  const dangNhap = async (duLieu: {
    tenDangNhap: string;
    matKhau: string;
  }): Promise<void> => {
    const phanHoi = await goiApi<{
      user: ThongTinNguoiDung;
      token: string;
    }>("/api/tai-khoan/dang-nhap", {
      method: "POST",
      body: JSON.stringify(duLieu),
    });

    setUser(phanHoi.user);
    setToken(phanHoi.token);
    setSoDuVndState(phanHoi.user.soDuVnd || 0);
    setDiscordDaLienKetState(phanHoi.user.daLienKetDiscord || false);
    setDiscordTenHienThiState(phanHoi.user.discordTenHienThi || null);

    if (typeof window !== "undefined") {
      localStorage.setItem("webToken", phanHoi.token);
      localStorage.setItem("webUser", JSON.stringify(phanHoi.user));
    }
  };

  const dangXuat = async (): Promise<void> => {
    try {
      await goiApi("/api/tai-khoan/dang-xuat", {
        method: "POST",
      });
    } catch {
      // Bo qua loi khi dang xuat
    }

    setUser(null);
    setToken(null);
    setSoDuVndState(0);
    setDiscordDaLienKetState(false);
    setDiscordTenHienThiState(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem("webToken");
      localStorage.removeItem("webUser");
    }
  };

  const kiemTraDiscord = async (): Promise<void> => {
    const duLieu = await goiApi<ThongTinNguoiDung>("/api/tai-khoan/kiem-tra-discord");
    setDiscordDaLienKetState(duLieu.daLienKetDiscord || false);
    setDiscordTenHienThiState(duLieu.discordTenHienThi || null);
  };

  const lienKetDiscord = async (maDiscord: string): Promise<void> => {
    const duLieu = await goiApi<ThongTinNguoiDung>("/api/tai-khoan/lien-ket-discord", {
      method: "POST",
      body: JSON.stringify({ maDiscord }),
    });
    setDiscordDaLienKetState(duLieu.daLienKetDiscord || false);
    setDiscordTenHienThiState(duLieu.discordTenHienThi || null);
  };

  const lamMoiVi = async (): Promise<void> => {
    await layThongTin();
  };

  const getDiscordOAuthUrl = (): string => {
    if (typeof window === "undefined") return "";

    const clientId = String(
      process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || ""
    ).trim();
    const redirectUri =
      process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ||
      `${window.location.origin}/auth/callback`;

    if (!clientId) {
      return "#discord-env-missing";
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds.join",
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  };

  return (
    <AuthVietContext.Provider
      value={{
        user,
        token,
        isLoading,
        soDuVnd: soDuVndState,
        daDangNhap,
        daLienKetDiscord: discordDaLienKetState,
        vaiTro,
        discordTenHienThi: discordTenHienThiState,
        dangKy,
        dangNhap,
        dangXuat,
        layThongTin,
        kiemTraDiscord,
        lienKetDiscord,
        lamMoiVi,
        getDiscordOAuthUrl,
      }}
    >
      {children}
    </AuthVietContext.Provider>
  );
}

export function useAuthViet() {
  const context = useContext(AuthVietContext);
  if (!context) {
    throw new Error("useAuthViet phai su dung trong AuthVietProvider");
  }
  return context;
}
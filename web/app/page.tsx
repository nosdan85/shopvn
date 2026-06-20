"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/shop");
  }, [router]);

  return (
    <div className="min-h-screen bg-white/60 backdrop-blur-xl flex items-center justify-center">
      <div className="text-slate-600 animate-pulse">Đang chuyển hướng đến cửa hàng...</div>
    </div>
  );
}

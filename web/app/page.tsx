"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cua-hang");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-[#B5B5B5] animate-pulse">Đang chuyển hướng đến cửa hàng...</div>
    </div>
  );
}

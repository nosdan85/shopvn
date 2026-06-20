"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
 const router = useRouter();

 useEffect(() => {
 router.replace("/shop");
 }, [router]);

 return (
 <div className="min-h-screen bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_4px_15px_rgba(255,255,255,0.2)] flex items-center justify-center">
 <div className="text-slate-600 animate-pulse">Đang chuyển hướng đến cửa hàng...</div>
 </div>
 );
}

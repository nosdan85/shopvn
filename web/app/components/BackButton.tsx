import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href?: string;
  label?: string;
  variant?: "home" | "back";
}

export default function BackButton({
  href = "/shop",
  label,
  variant = "back"
}: BackButtonProps) {
  const Icon = variant === "home" ? Home : ArrowLeft;
  const defaultLabel = variant === "home" ? "Trang Chủ" : "Quay về";

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#071326]/90/90 transition-colors"
    >
      <Icon className="h-4 w-4" />
      {label || defaultLabel}
    </Link>
  );
}

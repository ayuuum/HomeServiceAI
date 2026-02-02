"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/chat", label: "チャット", icon: "💬" },
  { href: "/manual", label: "マニュアル", icon: "📋" },
  { href: "/note", label: "ノート", icon: "📌" },
  { href: "/settings", label: "設定", icon: "⚙️" },
] as const;

export function BottomTabNav() {
  const pathname = usePathname();
  const isManualDetail = pathname.startsWith("/manual/") && pathname !== "/manual";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white safe-area-pb">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map(({ href, label, icon }) => {
          const isActive =
            href === pathname || (href === "/manual" && isManualDetail);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                isActive
                  ? "text-[#06C755]"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

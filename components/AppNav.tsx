"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { labelForRole } from "@/lib/constants";
import { Avatar } from "./ui";
import { ThemeToggle } from "./ThemeToggle";
import {
  IconHome,
  IconClipboard,
  IconPulse,
  IconChart,
  IconUser,
  IconPlus,
} from "./icons";

const NAV = [
  { href: "/inicio", label: "Início", Icon: IconHome },
  { href: "/pareceres", label: "Pareceres", Icon: IconClipboard },
  { href: "/plantao", label: "Plantão", Icon: IconPulse },
  { href: "/dashboard", label: "Painel", Icon: IconChart },
  { href: "/perfil", label: "Perfil", Icon: IconUser },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  user,
}: {
  user: { name: string; role: string; specialty?: string | null };
}) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 md:flex">
      <div className="flex items-center gap-2 px-2 pb-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-fg">
          <IconPulse size={20} />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold">Parecer+</p>
          <p className="text-[11px] text-fg-muted">Clinical Workflow</p>
        </div>
      </div>

      <Link
        href="/pareceres/novo"
        className="mb-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-fg shadow-sm transition hover:opacity-90"
      >
        <IconPlus size={18} /> Novo parecer
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isActive(pathname, href)
                ? "bg-primary-soft text-primary"
                : "text-fg-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
        <Avatar name={user.name} size={34} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-[11px] text-fg-muted">
            {labelForRole(user.role)}
          </p>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/80 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg">
          <IconPulse size={18} />
        </div>
        <span className="font-bold">Parecer+</span>
      </div>
      <ThemeToggle />
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition",
              active ? "text-primary" : "text-fg-muted",
            )}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// Floating action button on mobile — the fastest path to a new parecer.
export function MobileFab() {
  return (
    <Link
      href="/pareceres/novo"
      className="fixed bottom-20 right-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-fg shadow-lg transition active:scale-95 md:hidden"
      aria-label="Novo parecer"
    >
      <IconPlus size={26} />
    </Link>
  );
}

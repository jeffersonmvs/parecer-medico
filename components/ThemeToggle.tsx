"use client";

import { useEffect, useState } from "react";

// Toggles the `.dark` class on <html> and persists the choice. The initial
// theme is applied by an inline script in the root layout to avoid a flash.
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("hcw-theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema"
      className={`grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface-2 text-fg transition hover:bg-surface ${className ?? ""}`}
    >
      {dark ? (
        // sun
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      ) : (
        // moon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

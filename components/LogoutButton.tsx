"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { IconLogout } from "@/components/icons";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <Button variant="secondary" onClick={logout} disabled={busy}>
      {busy ? <Spinner /> : <IconLogout size={18} />} Sair
    </Button>
  );
}

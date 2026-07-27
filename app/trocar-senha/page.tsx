import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoMark } from "@/components/LogoMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function TrocarSenhaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const forced = user.mustChangePassword;

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-primary/25 bg-gradient-to-br from-[#16324a] to-[#0a1120] shadow-[0_0_30px_rgba(60,230,232,0.28)]">
            <LogoMark size={46} />
          </div>
          <h1 className="text-xl font-bold tracking-wide">
            {forced ? "Defina sua nova senha" : "Trocar senha"}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {forced
              ? "Por segurança, troque a senha temporária antes de continuar."
              : "Atualize a senha da sua conta PARECER+."}
          </p>
        </div>
        <ChangePasswordForm forced={forced} />
      </div>
    </main>
  );
}

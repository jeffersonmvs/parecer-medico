import { prisma } from "@/lib/db";
import { LogoMark } from "@/components/LogoMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RegisterForm } from "@/components/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegistrarPage() {
  const [specialties, hospitals] = await Promise.all([
    prisma.specialty.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.hospital.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-primary/25 bg-gradient-to-br from-[#16324a] to-[#0a1120] shadow-[0_0_34px_rgba(60,230,232,0.28)]">
            <LogoMark size={48} />
          </div>
          <h1 className="text-xl font-bold tracking-wide">
            Solicitar acesso ao PARECER<span className="text-primary">+</span>
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Preencha seus dados. A coordenação liberará seu acesso.
          </p>
        </div>
        <RegisterForm specialties={specialties} hospitals={hospitals} />
      </div>
    </main>
  );
}

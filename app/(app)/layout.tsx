import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  Sidebar,
  TopBar,
  BottomNav,
  MobileFab,
} from "@/components/AppNav";
import { ServiceWorker } from "@/components/ServiceWorker";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/trocar-senha");

  return (
    <div className="flex min-h-screen">
      <ServiceWorker />
      <Sidebar
        user={{
          name: user.name,
          role: user.role,
          specialty: user.specialty?.name,
          hospital: user.activeHospitalName,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar hospital={user.activeHospitalName} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10">
          {children}
        </main>
        <BottomNav />
        <MobileFab />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WelcomeInterstitial } from "@/components/WelcomeInterstitial";

export const dynamic = "force-dynamic";

// Post-login interstitial: if there is an active institutional notice, show it
// for a few seconds before sending the doctor to the home screen. First-access
// users still go through the forced password change first.
export default async function BemvindoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/trocar-senha");

  const notice = await prisma.notice.findFirst({
    orderBy: [{ urgent: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });

  if (!notice) redirect("/inicio");

  return (
    <WelcomeInterstitial
      notice={{
        title: notice.title,
        body: notice.body,
        category: notice.category,
        urgent: notice.urgent,
        author: notice.author?.name ?? null,
      }}
    />
  );
}

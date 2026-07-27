import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { sendPushToUsers } from "@/lib/push";

export async function POST() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  await sendPushToUsers([auth.user.id], {
    title: "PARECER+ · Notificações ativas",
    body: "Você receberá alertas de novos pareceres e chamados aqui.",
    url: "/inicio",
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";

export type ApiUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Guard for API routes. Returns the user or a 401 response. */
export async function requireUser(): Promise<
  { user: ApiUser } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  return { user };
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function forbidden(message = "Sem permissão") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Não encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
}

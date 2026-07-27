import { redirect } from "next/navigation";

// Middleware normally handles "/", this is a server-side fallback.
export default function RootPage() {
  redirect("/inicio");
}

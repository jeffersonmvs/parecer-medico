import "server-only";
import webpush from "web-push";
import { prisma } from "./db";
import { VAPID_PRIVATE, VAPID_SUBJECT } from "./server-secrets";
import { VAPID_PUBLIC_KEY } from "./push-public";

let configured = false;
function ensure() {
  if (configured) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE);
  configured = true;
}

export type PushPayload = { title: string; body: string; url?: string };

// Sends a notification to every subscription of the given users, pruning
// subscriptions the push service reports as gone (404/410). Never throws.
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  const ids = Array.from(new Set(userIds)).filter(Boolean);
  if (ids.length === 0) return;
  try {
    ensure();
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: ids } },
    });
    const data = JSON.stringify(payload);
    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            data,
          );
        } catch (e) {
          const code =
            e && typeof e === "object" && "statusCode" in e
              ? (e as { statusCode?: number }).statusCode
              : 0;
          if (code === 404 || code === 410) {
            await prisma.pushSubscription
              .delete({ where: { id: s.id } })
              .catch(() => {});
          }
        }
      }),
    );
  } catch {
    // Push must never break the operation that triggered it.
  }
}

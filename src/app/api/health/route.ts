import { ok } from "@/lib/api";

export async function GET() {
  return ok({
    status: "ok",
    service: "clockhub",
    timestamp: new Date().toISOString(),
  });
}

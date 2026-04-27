import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { serializeSessionUser } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession(request);
    return ok({ user: serializeSessionUser(user) });
  } catch (error) {
    return fail(error);
  }
}

import { ZodSchema } from "zod";
import { NextResponse } from "next/server";

import { AppError, toAppError } from "@/lib/errors";
import type { ApiResponse } from "@/types/app";

// Shared route helpers keep validation and JSON response shapes consistent.
export async function parseBody<T>(request: Request, schema: ZodSchema<T>) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "The request body must be valid JSON.");
  }

  return schema.parse(payload);
}

export function ok<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data, meta }, { status });
}

export function fail(error: unknown) {
  const appError = toAppError(error);

  return NextResponse.json<ApiResponse<never>>(
    {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    },
    { status: appError.status },
  );
}

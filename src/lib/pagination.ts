import type { NextRequest } from "next/server";

import { AppError } from "@/lib/errors";

export interface PaginationParams {
  limit: number;
  offset: number;
  page: number;
}

export interface PaginationMeta extends PaginationParams {
  total: number;
  totalPages: number;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parseOptionalInteger(value: string | null, fallback: number) {
  return value === null ? fallback : Number(value);
}

// Parses limit/offset/page query params into a normalized pagination model.
export function getPaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);
  const limitValue = searchParams.get("limit");
  const pageValue = searchParams.get("page");
  const offsetValue = searchParams.get("offset");

  const limit = parseOptionalInteger(limitValue, DEFAULT_LIMIT);
  const requestedPage = parseOptionalInteger(pageValue, 1);
  const offset = parseOptionalInteger(offsetValue, (requestedPage - 1) * limit);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new AppError(400, "INVALID_PAGINATION", `limit must be an integer between 1 and ${MAX_LIMIT}.`);
  }

  if (!Number.isInteger(requestedPage) || requestedPage < 1) {
    throw new AppError(400, "INVALID_PAGINATION", "page must be a positive integer.");
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new AppError(400, "INVALID_PAGINATION", "offset must be a non-negative integer.");
  }

  const page = Math.floor(offset / limit) + 1;

  return { limit, offset, page };
}

export function buildPaginationMeta(
  total: number,
  params: PaginationParams,
): PaginationMeta {
  return {
    ...params,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

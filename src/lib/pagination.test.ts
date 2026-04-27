import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { buildPaginationMeta, getPaginationParams } from "@/lib/pagination";

function createRequest(query = "") {
  return new NextRequest(`http://localhost:3000/api/test${query}`);
}

describe("getPaginationParams", () => {
  it("uses defaults when pagination params are omitted", () => {
    expect(getPaginationParams(createRequest())).toEqual({
      limit: 10,
      offset: 0,
      page: 1,
    });
  });

  it("derives the page from offset when offset is provided explicitly", () => {
    expect(getPaginationParams(createRequest("?limit=25&offset=50&page=1"))).toEqual({
      limit: 25,
      offset: 50,
      page: 3,
    });
  });

  it("rejects invalid limits", () => {
    expect(() => getPaginationParams(createRequest("?limit=0"))).toThrow(AppError);
  });

  it("rejects negative offsets", () => {
    expect(() => getPaginationParams(createRequest("?offset=-5"))).toThrow(AppError);
  });
});

describe("buildPaginationMeta", () => {
  it("rounds total pages up from the active limit", () => {
    expect(
      buildPaginationMeta(23, {
        limit: 10,
        offset: 10,
        page: 2,
      }),
    ).toEqual({
      total: 23,
      totalPages: 3,
      limit: 10,
      offset: 10,
      page: 2,
    });
  });
});

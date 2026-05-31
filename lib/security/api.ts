import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { checkRateLimit, clientFingerprint, type RateLimitOptions } from "@/lib/security/rateLimit";
import { validationErrorResponse } from "@/lib/validation/schemas";

export const DEFAULT_JSON_BODY_LIMIT_BYTES = 64 * 1024;
export const REPORT_JSON_BODY_LIMIT_BYTES = 512 * 1024;

type JsonReadResult =
  | {
    ok: true;
    value: unknown;
  }
  | {
    ok: false;
    response: Response;
  };

type ValidatedJsonPostOptions<TInput> = {
  routeId: string;
  schema: ZodType<TInput>;
  handler: (input: TInput) => unknown | Promise<unknown>;
  bodyLimitBytes?: number;
  rateLimit?: Partial<Omit<RateLimitOptions, "routeId">>;
};

const apiDefaultHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff"
};

function mergeHeaders(headers?: HeadersInit) {
  const merged = new Headers(headers);
  for (const [key, value] of Object.entries(apiDefaultHeaders)) {
    if (!merged.has(key)) merged.set(key, value);
  }
  return merged;
}

function isJsonContentType(contentType: string) {
  const normalized = contentType.toLowerCase();
  return normalized.includes("application/json") || normalized.includes("+json");
}

function bodySizeBytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export function secureJson(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: mergeHeaders(init.headers)
  });
}

export function rateLimitResponse(request: Request | undefined, options: RateLimitOptions): Response | null {
  const result = checkRateLimit(clientFingerprint(request), options);
  if (result.ok) return null;
  return secureJson({
    error: "RateLimitExceeded",
    message: "Too many requests for this demo endpoint. Slow down and retry after the indicated interval.",
    retryAfterSeconds: result.retryAfterSeconds,
    resetAt: result.resetAt
  }, {
    status: 429,
    headers: {
      "Retry-After": String(result.retryAfterSeconds)
    }
  });
}

export async function readJsonRequest(request: Request, bodyLimitBytes = DEFAULT_JSON_BODY_LIMIT_BYTES): Promise<JsonReadResult> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!isJsonContentType(contentType)) {
    return {
      ok: false,
      response: secureJson({
        error: "UnsupportedMediaType",
        message: "Expected an application/json request body."
      }, { status: 415 })
    };
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > bodyLimitBytes) {
    return {
      ok: false,
      response: secureJson({
        error: "PayloadTooLarge",
        message: `Request body exceeds the ${bodyLimitBytes} byte limit.`
      }, { status: 413 })
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      response: secureJson({
        error: "BadRequest",
        message: "Unable to read the request body."
      }, { status: 400 })
    };
  }

  if (bodySizeBytes(text) > bodyLimitBytes) {
    return {
      ok: false,
      response: secureJson({
        error: "PayloadTooLarge",
        message: `Request body exceeds the ${bodyLimitBytes} byte limit.`
      }, { status: 413 })
    };
  }

  if (text.trim().length === 0) {
    return {
      ok: false,
      response: secureJson({
        error: "BadRequest",
        message: "Request body must contain JSON."
      }, { status: 400 })
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(text)
    };
  } catch {
    return {
      ok: false,
      response: secureJson({
        error: "MalformedJson",
        message: "Request body is not valid JSON."
      }, { status: 400 })
    };
  }
}

export async function handleValidatedJsonPost<TInput>(request: Request, options: ValidatedJsonPostOptions<TInput>) {
  const limited = rateLimitResponse(request, {
    routeId: options.routeId,
    limit: options.rateLimit?.limit ?? 120,
    windowMs: options.rateLimit?.windowMs ?? 60_000
  });
  if (limited) return limited;

  const json = await readJsonRequest(request, options.bodyLimitBytes);
  if (!json.ok) return json.response;

  const parsed = options.schema.safeParse(json.value);
  if (!parsed.success) {
    return secureJson(validationErrorResponse(parsed.error), { status: 400 });
  }

  try {
    return secureJson(await options.handler(parsed.data));
  } catch (error) {
    if (error instanceof ZodError) {
      return secureJson(validationErrorResponse(error), { status: 400 });
    }
    return secureJson({
      error: "InternalServerError",
      message: "The simulation endpoint could not complete the request."
    }, { status: 500 });
  }
}

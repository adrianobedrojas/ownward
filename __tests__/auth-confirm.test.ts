/**
 * Tests for the Supabase email-confirmation and password-recovery callback flow.
 *
 * Covers:
 *  - PKCE code exchange (success and failure)
 *  - token_hash OTP verification (success and failure)
 *  - onboarding and password-reset redirect defaults
 *  - safe next-path logic (external / protocol-relative rejection)
 *  - resend-confirmation API (generic response, rate-limit, validation)
 *  - i18n messages for English and Spanish auth-error screens
 *  - no raw Supabase error_description rendered
 *  - no secrets or token values logged
 */

// ─── Mock next/navigation ────────────────────────────────────────────────────

const redirectSpy = jest.fn();
jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    redirectSpy(...args);
    // next/navigation redirect throws in real usage; simulate that so code
    // after it does not continue executing.
    throw new Error(`NEXT_REDIRECT:${args[0]}`);
  },
}));

// ─── Mock next/headers ───────────────────────────────────────────────────────

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: () => [],
    set: jest.fn(),
  }),
}));

// ─── Mock @supabase/ssr ───────────────────────────────────────────────────────

const exchangeCodeForSessionMock = jest.fn();
const verifyOtpMock = jest.fn();
const resendMock = jest.fn();

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
      verifyOtp: verifyOtpMock,
      resend: resendMock,
    },
  })),
}));

// ─── Mock lib/config ─────────────────────────────────────────────────────────

jest.mock("@/lib/config", () => ({
  getSiteUrl: () => "https://ownwardhub.com",
  getAllowedDevOrigins: () => [],
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { getSafeNextPath } from "@/lib/auth";
import { getOnboardingConfirmRedirectUrl } from "@/lib/auth";

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildConfirmRequest(params: Record<string, string>) {
  const url = new URL("https://ownwardhub.com/auth/confirm");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

async function callConfirmGET(params: Record<string, string>) {
  jest.resetModules();
  // Re-import after resetting modules so mocks apply cleanly.
  const { GET } = await import("@/app/auth/confirm/route");
  return GET(buildConfirmRequest(params));
}

// ─── lib/auth helpers ────────────────────────────────────────────────────────

describe("getSafeNextPath", () => {
  it("returns fallback for null next", () => {
    expect(getSafeNextPath(null)).toBe("/dashboard");
  });

  it("returns fallback for empty string", () => {
    expect(getSafeNextPath("")).toBe("/dashboard");
  });

  it("returns fallback for external URL", () => {
    expect(getSafeNextPath("https://evil.example/steal")).toBe("/dashboard");
  });

  it("returns fallback for protocol-relative URL", () => {
    expect(getSafeNextPath("//evil.example")).toBe("/dashboard");
  });

  it("returns the path when it is safe", () => {
    expect(getSafeNextPath("/onboarding")).toBe("/onboarding");
    expect(getSafeNextPath("/reset-password")).toBe("/reset-password");
    expect(getSafeNextPath("/dashboard")).toBe("/dashboard");
  });

  it("uses the provided fallback", () => {
    expect(getSafeNextPath(null, "/onboarding")).toBe("/onboarding");
    expect(getSafeNextPath("//evil", "/onboarding")).toBe("/onboarding");
  });
});

describe("getOnboardingConfirmRedirectUrl", () => {
  it("builds the correct redirect URL", () => {
    expect(getOnboardingConfirmRedirectUrl("https://ownwardhub.com")).toBe(
      "https://ownwardhub.com/auth/confirm?next=/onboarding"
    );
  });
});

// ─── /auth/confirm GET route ─────────────────────────────────────────────────

describe("/auth/confirm GET – PKCE code exchange", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exchanges a PKCE code and redirects to /onboarding by default", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null, data: {} });

    await expect(callConfirmGET({ code: "pkce-code-abc" })).rejects.toThrow(
      "NEXT_REDIRECT:/onboarding"
    );
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("pkce-code-abc");
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("honours a safe next param after successful code exchange", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null, data: {} });

    await expect(
      callConfirmGET({ code: "pkce-code-abc", next: "/onboarding" })
    ).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("rejects //evil.example as next and falls back to /onboarding", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null, data: {} });

    await expect(
      callConfirmGET({ code: "pkce-code-abc", next: "//evil.example" })
    ).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("rejects an external https next URL and falls back to /onboarding", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: null, data: {} });

    await expect(
      callConfirmGET({
        code: "pkce-code-abc",
        next: "https://attacker.example/steal",
      })
    ).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("redirects to /auth-error?code=exchange-failed when exchange fails", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({
      error: { message: "invalid code", code: "invalid_grant" },
      data: null,
    });

    await expect(callConfirmGET({ code: "bad-code" })).rejects.toThrow(
      "NEXT_REDIRECT:/auth-error?code=exchange-failed"
    );
  });

  it("does not log the code value on exchange failure", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    exchangeCodeForSessionMock.mockResolvedValue({
      error: { message: "failure", code: "unknown" },
      data: null,
    });

    await expect(callConfirmGET({ code: "secret-code-xyz" })).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    for (const call of consoleSpy.mock.calls) {
      const msg = call.join(" ");
      expect(msg).not.toContain("secret-code-xyz");
    }
    consoleSpy.mockRestore();
  });
});

describe("/auth/confirm GET – token_hash OTP verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("verifies a signup token and redirects to /onboarding", async () => {
    verifyOtpMock.mockResolvedValue({ error: null, data: {} });

    await expect(
      callConfirmGET({ token_hash: "hash-abc", type: "signup" })
    ).rejects.toThrow("NEXT_REDIRECT:/onboarding");

    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "hash-abc",
      type: "signup",
    });
  });

  it("verifies a recovery token and redirects to /reset-password", async () => {
    verifyOtpMock.mockResolvedValue({ error: null, data: {} });

    await expect(
      callConfirmGET({ token_hash: "hash-recovery", type: "recovery" })
    ).rejects.toThrow("NEXT_REDIRECT:/reset-password");
  });

  it("honours a safe next param after successful token verification", async () => {
    verifyOtpMock.mockResolvedValue({ error: null, data: {} });

    await expect(
      callConfirmGET({
        token_hash: "hash-abc",
        type: "signup",
        next: "/onboarding",
      })
    ).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("maps an expired OTP error to /auth-error?code=otp_expired", async () => {
    verifyOtpMock.mockResolvedValue({
      error: { message: "Token has expired or is invalid", code: "otp_expired" },
      data: null,
    });

    await expect(
      callConfirmGET({ token_hash: "old-hash", type: "signup" })
    ).rejects.toThrow("NEXT_REDIRECT:/auth-error?code=otp_expired");
  });

  it("maps a generic OTP error to /auth-error?code=invalid-token", async () => {
    verifyOtpMock.mockResolvedValue({
      error: { message: "something went wrong", code: "unknown_error" },
      data: null,
    });

    await expect(
      callConfirmGET({ token_hash: "bad-hash", type: "signup" })
    ).rejects.toThrow("NEXT_REDIRECT:/auth-error?code=invalid-token");
  });

  it("redirects to /auth-error?code=invalid-link when type is missing", async () => {
    await expect(
      callConfirmGET({ token_hash: "hash-abc" })
    ).rejects.toThrow("NEXT_REDIRECT:/auth-error?code=invalid-link");
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("redirects to /auth-error?code=invalid-link for an unknown type", async () => {
    await expect(
      callConfirmGET({ token_hash: "hash-abc", type: "not-a-real-type" })
    ).rejects.toThrow("NEXT_REDIRECT:/auth-error?code=invalid-link");
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });

  it("redirects to /auth-error?code=invalid-link when both code and token_hash are absent", async () => {
    await expect(callConfirmGET({ next: "/onboarding" })).rejects.toThrow(
      "NEXT_REDIRECT:/auth-error?code=invalid-link"
    );
  });

  it("does not log the token_hash value on error", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    verifyOtpMock.mockResolvedValue({
      error: { message: "otp expired", code: "otp_expired" },
      data: null,
    });

    await expect(
      callConfirmGET({ token_hash: "super-secret-hash", type: "signup" })
    ).rejects.toThrow("NEXT_REDIRECT");

    for (const call of consoleSpy.mock.calls) {
      const msg = call.join(" ");
      expect(msg).not.toContain("super-secret-hash");
    }
    consoleSpy.mockRestore();
  });
});

// ─── /api/resend-confirmation ─────────────────────────────────────────────────

describe("/api/resend-confirmation POST", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function callResend(body: unknown) {
    jest.resetModules();
    const { POST } = await import("@/app/api/resend-confirmation/route");
    const req = new Request("https://ownwardhub.com/api/resend-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return POST(req);
  }

  it("returns 200 and generic success for a valid email regardless of account existence", async () => {
    resendMock.mockResolvedValue({ error: null, data: {} });

    const res = await callResend({ email: "user@example.com" });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    // Response must not disclose whether the account exists
    expect(JSON.stringify(json)).not.toContain("account");
    expect(JSON.stringify(json)).not.toContain("exists");
  });

  it("returns 200 even when supabase returns a non-rate-limit error", async () => {
    resendMock.mockResolvedValue({
      error: { message: "user not found", status: 404 },
      data: null,
    });

    const res = await callResend({ email: "unknown@example.com" });
    expect(res.status).toBe(200);
  });

  it("returns 429 when supabase reports a rate-limit error", async () => {
    resendMock.mockResolvedValue({
      error: { message: "email rate limit exceeded", status: 429 },
      data: null,
    });

    const res = await callResend({ email: "user@example.com" });
    expect(res.status).toBe(429);
  });

  it("returns 429 for rate-limit identified by status code", async () => {
    resendMock.mockResolvedValue({
      error: { message: "too many requests", status: 429 },
      data: null,
    });

    const res = await callResend({ email: "user@example.com" });
    expect(res.status).toBe(429);
  });

  it("returns 422 for an invalid email address", async () => {
    const res = await callResend({ email: "not-an-email" });
    expect(res.status).toBe(422);
    expect(resendMock).not.toHaveBeenCalled();
  });

  it("returns 422 for an empty email", async () => {
    const res = await callResend({ email: "" });
    expect(res.status).toBe(422);
  });

  it("returns 400 for malformed JSON", async () => {
    jest.resetModules();
    const { POST } = await import("@/app/api/resend-confirmation/route");
    const req = new Request("https://ownwardhub.com/api/resend-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("calls resend with type=signup and the onboarding redirect URL", async () => {
    resendMock.mockResolvedValue({ error: null, data: {} });

    await callResend({ email: "Test@Example.COM" });

    expect(resendMock).toHaveBeenCalledWith({
      type: "signup",
      email: "test@example.com",
      options: {
        emailRedirectTo: "https://ownwardhub.com/auth/confirm?next=/onboarding",
      },
    });
  });
});

// ─── i18n message coverage ───────────────────────────────────────────────────

describe("i18n – Authentication.authError messages", () => {
  async function loadMessages(locale: "en" | "es") {
    const messages = await import(`@/messages/${locale}.json`);
    return (messages.default ?? messages) as Record<string, Record<string, unknown>>;
  }

  const ERROR_CODES = [
    "otp_expired",
    "access_denied",
    "exchange-failed",
    "invalid-link",
    "invalid-token",
    "generic",
  ];

  for (const locale of ["en", "es"] as const) {
    describe(`locale: ${locale}`, () => {
      let msgs: Record<string, unknown>;

      beforeAll(async () => {
        const all = await loadMessages(locale);
        msgs = (all.Authentication as Record<string, unknown>)
          .authError as Record<string, unknown>;
      });

      it("has a badge string", () => {
        expect(typeof (msgs as Record<string, unknown>).badge).toBe("string");
      });

      for (const code of ERROR_CODES) {
        it(`has heading and description for error code "${code}"`, () => {
          const errors = (msgs as Record<string, Record<string, Record<string, string>>>).errors;
          expect(typeof errors[code]?.heading).toBe("string");
          expect(errors[code]?.heading.length).toBeGreaterThan(0);
          expect(typeof errors[code]?.description).toBe("string");
          expect(errors[code]?.description.length).toBeGreaterThan(0);
        });

        it(`does not include raw Supabase "error_description" wording for "${code}"`, () => {
          const errors = (msgs as Record<string, Record<string, Record<string, string>>>).errors;
          // Supabase typically sends "Token has expired or is invalid" or
          // similar.  Our messages must not copy-paste those raw strings.
          const combined = `${errors[code]?.heading} ${errors[code]?.description}`;
          expect(combined).not.toMatch(/error_description/i);
          expect(combined).not.toContain("Token has expired or is invalid");
        });
      }
    });
  }
});

describe("i18n – Authentication.checkEmail.resend messages", () => {
  async function loadMessages(locale: "en" | "es") {
    const messages = await import(`@/messages/${locale}.json`);
    return (messages.default ?? messages) as Record<string, Record<string, unknown>>;
  }

  for (const locale of ["en", "es"] as const) {
    describe(`locale: ${locale}`, () => {
      let resend: Record<string, string>;

      beforeAll(async () => {
        const all = await loadMessages(locale);
        const auth = all.Authentication as Record<string, Record<string, unknown>>;
        resend = (auth.checkEmail as Record<string, Record<string, string>>).resend;
      });

      it("has title, description, submit, successTitle, successMessage", () => {
        for (const key of [
          "title",
          "description",
          "submit",
          "successTitle",
          "successMessage",
        ]) {
          expect(typeof resend[key]).toBe("string");
          expect(resend[key].length).toBeGreaterThan(0);
        }
      });

      it("has a cooldownMessage with {seconds} placeholder", () => {
        expect(resend.cooldownMessage).toContain("{seconds}");
      });

      it("successMessage does not disclose account existence", () => {
        // The message must be generic (conditional phrasing: "if an account exists…")
        // and must NOT say "we found your account" or similar.
        const lower = resend.successMessage.toLowerCase();
        expect(lower).not.toMatch(/your account (has been|was) found/);
        expect(lower).not.toMatch(/account confirmed/);
      });
    });
  }
});

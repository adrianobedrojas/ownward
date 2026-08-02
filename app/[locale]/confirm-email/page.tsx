import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Allowed OTP types for this landing page (matches the allowlist in
// app/auth/confirm/route.ts).
const VALID_TYPES = new Set([
  "signup",
  "email",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
  "phone_change",
]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("confirmEmail.title"),
    description: t("confirmEmail.description"),
  };
}

interface SearchParams {
  token_hash?: string;
  type?: string;
  next?: string;
}

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("Authentication.confirmEmail");
  const params = await searchParams;

  const tokenHash = params.token_hash ?? "";
  const type = params.type ?? "";
  const next = params.next ?? "";

  const isValid =
    tokenHash.length > 0 &&
    VALID_TYPES.has(type) &&
    // Safety: ensure token_hash contains only URL-safe base64/hex characters
    /^[A-Za-z0-9_\-%.]+$/.test(tokenHash);

  if (!isValid) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
        <section className="w-full max-w-lg rounded-2xl border border-red-900/50 bg-slate-900 p-8 text-center shadow-2xl shadow-slate-950">
          <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
            {t("invalidBadge")}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">
            {t("invalidTitle")}
          </h1>
          <p className="mt-4 leading-7 text-slate-400">
            {t("invalidDescription")}
          </p>
          <Link
            href="/check-email"
            className="mt-8 inline-block rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {t("resendLink")}
          </Link>
          <Link
            href="/signup"
            className="mt-5 block text-sm font-semibold text-slate-400 hover:text-white"
          >
            {t("returnToSignup")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl shadow-slate-950">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10 text-3xl">
          ✅
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-cyan-400">
          {t("badge")}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white">{t("title")}</h1>
        <p className="mt-4 leading-7 text-slate-300">{t("description")}</p>

        {/* POST form so security scanners (which issue GET requests) do not
            consume the token. The token_hash is only exchanged after the user
            clicks the button. */}
        <form action="/auth/confirm" method="post" className="mt-8">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          {next && <input type="hidden" name="next" value={next} />}
          <button
            type="submit"
            className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {t("confirm")}
          </button>
        </form>

        <Link
          href="/signup"
          className="mt-5 block text-sm font-semibold text-slate-400 hover:text-white"
        >
          {t("returnToSignup")}
        </Link>
      </section>
    </main>
  );
}

import { getTranslations } from "next-intl/server";
import { getSafeRedirect } from "@/lib/auth/safe-redirect";
import AdminMfaClient from "@/components/admin/AdminMfaClient";

function localePrefix(locale: string): string {
  return locale === "es" ? "/es" : "";
}

export default async function AdminMfaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "AdminSecurity" });

  const prefix = localePrefix(locale);
  const nextPath = getSafeRedirect(query.next ?? `${prefix}/admin`);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          {t("badge")}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">{t("title")}</h1>
        <p className="mt-2 text-slate-300">
          {query.reason === "aal1" ? t("aal1Notice") : t("description")}
        </p>
      </header>

      <AdminMfaClient nextPath={nextPath} />
    </main>
  );
}

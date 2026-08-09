import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthErrorClient } from "@/components/AuthErrorClient";
import { createNoIndexMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return createNoIndexMetadata({ locale, pathname: '/auth-error', title: t('authError.title'), description: t('authError.description') });
}

interface SearchParams {
  code?: string;
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const queryCode = params.code;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <AuthErrorClient queryCode={queryCode} />
    </main>
  );
}

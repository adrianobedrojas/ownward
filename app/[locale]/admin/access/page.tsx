import Link from "next/link";

function localePrefix(locale: string): string {
  return locale === "es" ? "/es" : "";
}

function copy(locale: string, reason: string) {
  const isEs = locale === "es";
  if (reason === "inactive") {
    return {
      title: isEs ? "Acceso administrativo inactivo" : "Admin access is inactive",
      description: isEs
        ? "Tu usuario existe en la tabla administrativa, pero está desactivado. Contacta al propietario de la plataforma."
        : "Your account exists in platform admins but is currently inactive. Contact the platform owner.",
    };
  }

  if (reason === "forbidden") {
    return {
      title: isEs ? "Permiso insuficiente" : "Insufficient permission",
      description: isEs
        ? "Tu rol administrativo no permite esta operación."
        : "Your admin role does not allow this operation.",
    };
  }

  return {
    title: isEs ? "Sin acceso administrativo" : "No admin access",
    description: isEs
      ? "Tu usuario no está autorizado para el panel administrativo."
      : "Your account is not authorized for the admin console.",
  };
}

export default async function AdminAccessDeniedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const { locale } = await params;
  const { reason = "unauthorized" } = await searchParams;
  const prefix = localePrefix(locale);
  const content = copy(locale, reason);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">
          {locale === "es" ? "Centro administrativo" : "Admin Console"}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white">{content.title}</h1>
        <p className="mt-3 text-slate-300">{content.description}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`${prefix}/dashboard`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            {locale === "es" ? "Ir al panel" : "Go to dashboard"}
          </Link>
          <Link
            href={`${prefix}/support`}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            {locale === "es" ? "Contactar soporte" : "Contact support"}
          </Link>
        </div>
      </section>
    </main>
  );
}

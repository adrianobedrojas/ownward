import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getAbsoluteUrl, serializeJsonLd } from '@/lib/seo';

const copy = {
  en: {
    metadataTitle: 'Small Business IT Support in San Antonio | Ownward',
    metadataDescription:
      'Local and remote IT support for San Antonio small businesses. Computers, Microsoft 365, Wi-Fi, printers, onboarding, security basics, and ongoing IT care.',
    badge: 'San Antonio small-business IT support',
    title: 'Your IT department, without the full-time IT department.',
    description:
      'Ownward helps small businesses keep computers, Microsoft 365, Wi-Fi, printers, accounts, and everyday technology working—onsite in San Antonio or remotely.',
    primaryCta: 'Request IT support',
    secondaryCta: 'Explore services',
    availability: 'Onsite + remote support',
    focus: 'Built for teams of 5–30',
    heroPanelTitle: 'What can we fix today?',
    heroPanelItems: [
      ['Employee cannot sign in', 'Microsoft 365 / Windows'],
      ['Office Wi-Fi keeps dropping', 'Network troubleshooting'],
      ['New hire starts Monday', 'Device + account setup'],
      ['Printer stopped working', 'Onsite support'],
    ],
    heroPanelFooter: 'One local contact for everyday IT problems.',
    trust: ['Microsoft 365', 'Windows PCs', 'Wi-Fi & networking', 'Printers', 'User onboarding', 'Security basics'],
    servicesEyebrow: 'Practical IT, not enterprise complexity',
    servicesTitle: 'The technology your business actually depends on.',
    servicesDescription:
      'Start with one problem or hand off the recurring IT work. Ownward is designed to be the first call when a small team needs technology help.',
    services: [
      ['Computer & device support', 'PC setup, troubleshooting, software installs, updates, monitors, docks, and peripherals.', '01'],
      ['Microsoft 365', 'Outlook, Teams, OneDrive, account setup, password resets, permissions, MFA, and user administration.', '02'],
      ['Wi-Fi & networking', 'Routers, switches, wireless coverage, connectivity problems, basic network setup, and troubleshooting.', '03'],
      ['Employee onboarding & offboarding', 'Prepare devices and accounts for new hires, then securely remove access when employees leave.', '04'],
      ['Printers & office technology', 'Printer setup, scanning, shared devices, conference-room basics, and everyday office tech.', '05'],
      ['Security & backup basics', 'MFA, updates, device encryption, antivirus, backup checks, and sensible small-business security hygiene.', '06'],
    ],
    howEyebrow: 'Simple process',
    howTitle: 'Get help without building an IT department.',
    steps: [
      ['1', 'Tell us what is happening', 'Send the issue, number of affected users, and whether you need onsite or remote help.'],
      ['2', 'We diagnose and fix it', 'We handle the problem directly or scope a clear project if it needs more work.'],
      ['3', 'Keep us as your IT contact', 'Use us as-needed or move to monthly support when recurring help makes more sense.'],
    ],
    pricingEyebrow: 'Ways to work together',
    pricingTitle: 'Start small. Add coverage when you need it.',
    pricingNote: 'Launch pricing shown for planning; final quotes depend on scope, travel, hardware, and support requirements.',
    plans: [
      {
        name: 'Remote support',
        price: 'From $95/hr',
        description: 'For Microsoft 365, Windows, software, accounts, and problems we can solve without a site visit.',
        features: ['Remote troubleshooting', 'Microsoft 365 help', 'Software & account issues', 'No monthly commitment'],
      },
      {
        name: 'Onsite support',
        price: 'From $125/hr',
        description: 'For office Wi-Fi, printers, device setup, physical troubleshooting, and hands-on projects.',
        features: ['San Antonio service area', 'Office technology support', 'Network & printer issues', 'Project-based work'],
      },
      {
        name: 'Monthly IT care',
        price: 'From $299/mo',
        description: 'For small teams that want one dependable IT contact instead of finding help every time something breaks.',
        features: ['Priority remote support', 'Routine IT check-ins', 'Onboarding support', 'Custom coverage by team size'],
      },
    ],
    planCta: 'Ask for a quote',
    localEyebrow: 'Local service',
    localTitle: 'San Antonio businesses, supported where they work.',
    localDescription:
      'Ownward is designed for offices, professional services, property teams, retail operations, churches, small warehouses, and other organizations that need reliable IT without a full internal IT staff.',
    industries: ['Professional offices', 'Property management', 'Insurance & real estate', 'Small medical offices', 'Retail & service businesses', 'Churches & nonprofits'],
    includedTitle: 'A good first project',
    includedDescription:
      'A small-business IT checkup can document your devices, users, Microsoft 365 setup, Wi-Fi, printers, backups, and basic security gaps—then turn that into a prioritized action list.',
    includedCta: 'Request an IT checkup',
    finalEyebrow: 'Ownward IT',
    finalTitle: 'Have a technology problem right now?',
    finalDescription:
      'Tell us what is broken, what your business uses, and whether you need remote or onsite help. We can start with one issue—no long-term contract required.',
    finalPrimary: 'Request support',
    finalSecondary: 'Contact Ownward',
  },
  es: {
    metadataTitle: 'Soporte de TI para pequeñas empresas en San Antonio | Ownward',
    metadataDescription:
      'Soporte de TI local y remoto para pequeñas empresas en San Antonio. Computadoras, Microsoft 365, Wi-Fi, impresoras, incorporación de empleados y soporte continuo.',
    badge: 'Soporte de TI para pequeñas empresas en San Antonio',
    title: 'Tu departamento de TI, sin contratar un departamento completo.',
    description:
      'Ownward ayuda a pequeñas empresas a mantener funcionando computadoras, Microsoft 365, Wi-Fi, impresoras, cuentas y tecnología diaria—en sitio en San Antonio o de forma remota.',
    primaryCta: 'Solicitar soporte',
    secondaryCta: 'Ver servicios',
    availability: 'Soporte en sitio + remoto',
    focus: 'Para equipos de 5–30 personas',
    heroPanelTitle: '¿Qué podemos resolver hoy?',
    heroPanelItems: [
      ['Un empleado no puede iniciar sesión', 'Microsoft 365 / Windows'],
      ['El Wi-Fi de la oficina se cae', 'Redes'],
      ['Un nuevo empleado empieza el lunes', 'Equipo + cuentas'],
      ['La impresora dejó de funcionar', 'Soporte en sitio'],
    ],
    heroPanelFooter: 'Un solo contacto local para los problemas cotidianos de TI.',
    trust: ['Microsoft 365', 'PCs con Windows', 'Wi-Fi y redes', 'Impresoras', 'Incorporación de usuarios', 'Seguridad básica'],
    servicesEyebrow: 'TI práctica, sin complejidad empresarial',
    servicesTitle: 'La tecnología de la que tu negocio realmente depende.',
    servicesDescription:
      'Empieza con un problema o delega el trabajo recurrente de TI. Ownward está diseñado para ser el primer contacto cuando un equipo pequeño necesita ayuda tecnológica.',
    services: [
      ['Computadoras y dispositivos', 'Configuración de PCs, solución de fallas, software, actualizaciones, monitores, docks y periféricos.', '01'],
      ['Microsoft 365', 'Outlook, Teams, OneDrive, cuentas, contraseñas, permisos, MFA y administración de usuarios.', '02'],
      ['Wi-Fi y redes', 'Routers, switches, cobertura inalámbrica, conectividad y configuración básica de red.', '03'],
      ['Altas y bajas de empleados', 'Preparamos dispositivos y cuentas para nuevos empleados y retiramos accesos al salir.', '04'],
      ['Impresoras y tecnología de oficina', 'Impresoras, escáneres, dispositivos compartidos, salas de reunión y tecnología cotidiana.', '05'],
      ['Seguridad y respaldos básicos', 'MFA, actualizaciones, cifrado, antivirus, revisión de respaldos y buenas prácticas.', '06'],
    ],
    howEyebrow: 'Proceso simple',
    howTitle: 'Obtén ayuda sin crear un departamento de TI.',
    steps: [
      ['1', 'Cuéntanos qué sucede', 'Describe el problema, cuántas personas afecta y si necesitas ayuda remota o en sitio.'],
      ['2', 'Diagnosticamos y resolvemos', 'Atendemos el problema o definimos claramente el proyecto si requiere más trabajo.'],
      ['3', 'Conserva un contacto de TI', 'Úsanos cuando lo necesites o pasa a soporte mensual cuando tenga más sentido.'],
    ],
    pricingEyebrow: 'Formas de trabajar',
    pricingTitle: 'Empieza pequeño. Agrega cobertura cuando la necesites.',
    pricingNote: 'Precios iniciales para planificación; la cotización final depende del alcance, traslado, hardware y requisitos.',
    plans: [
      {
        name: 'Soporte remoto',
        price: 'Desde $95/h',
        description: 'Para Microsoft 365, Windows, software, cuentas y problemas que podemos resolver sin visita.',
        features: ['Solución remota', 'Ayuda con Microsoft 365', 'Software y cuentas', 'Sin compromiso mensual'],
      },
      {
        name: 'Soporte en sitio',
        price: 'Desde $125/h',
        description: 'Para Wi-Fi, impresoras, instalación de equipos y proyectos que requieren presencia física.',
        features: ['Área de San Antonio', 'Tecnología de oficina', 'Redes e impresoras', 'Trabajo por proyecto'],
      },
      {
        name: 'TI mensual',
        price: 'Desde $299/mes',
        description: 'Para equipos pequeños que quieren un contacto de TI confiable sin contratar personal interno.',
        features: ['Soporte remoto prioritario', 'Revisiones rutinarias', 'Altas de empleados', 'Cobertura según el equipo'],
      },
    ],
    planCta: 'Pedir cotización',
    localEyebrow: 'Servicio local',
    localTitle: 'Negocios de San Antonio, atendidos donde trabajan.',
    localDescription:
      'Ownward está pensado para oficinas, servicios profesionales, administración de propiedades, comercios, iglesias, pequeños almacenes y otras organizaciones sin un equipo interno de TI.',
    industries: ['Oficinas profesionales', 'Administración de propiedades', 'Seguros e inmobiliarias', 'Consultorios pequeños', 'Comercios y servicios', 'Iglesias y organizaciones'],
    includedTitle: 'Un buen primer proyecto',
    includedDescription:
      'Una revisión de TI puede documentar dispositivos, usuarios, Microsoft 365, Wi-Fi, impresoras, respaldos y brechas básicas de seguridad, y convertirlo en una lista priorizada.',
    includedCta: 'Solicitar revisión de TI',
    finalEyebrow: 'Ownward IT',
    finalTitle: '¿Tienes un problema de tecnología ahora mismo?',
    finalDescription:
      'Cuéntanos qué está fallando, qué tecnología usa tu negocio y si necesitas ayuda remota o en sitio. Podemos empezar con un solo problema, sin contrato a largo plazo.',
    finalPrimary: 'Solicitar soporte',
    finalSecondary: 'Contactar a Ownward',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = locale === 'es' ? copy.es : copy.en;

  return {
    title: c.metadataTitle,
    description: c.metadataDescription,
    alternates: {
      canonical: getAbsoluteUrl('', locale === 'es' ? 'es' : 'en'),
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const language = locale === 'es' ? 'es' : 'en';
  const c = copy[language];
  const homeUrl = getAbsoluteUrl('', language);

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Ownward IT',
    url: homeUrl,
    areaServed: {
      '@type': 'City',
      name: 'San Antonio',
      containedInPlace: { '@type': 'State', name: 'Texas' },
    },
    serviceType: [
      'Small business IT support',
      'Microsoft 365 support',
      'Computer support',
      'Wi-Fi and network support',
      'Employee technology onboarding',
    ],
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(serviceJsonLd) }}
      />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_85%_30%,rgba(59,130,246,0.14),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {c.badge}
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl">
              {c.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              {c.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact?service=it-support"
                className="rounded-xl bg-cyan-300 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                {c.primaryCta}
              </Link>
              <a
                href="#services"
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:border-cyan-300/50 hover:bg-white/10"
              >
                {c.secondaryCta}
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2"><span className="text-emerald-400">●</span>{c.availability}</span>
              <span className="inline-flex items-center gap-2"><span className="text-cyan-300">◆</span>{c.focus}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Ownward IT</p>
                <h2 className="mt-1 text-xl font-bold text-white">{c.heroPanelTitle}</h2>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {c.heroPanelItems.map(([issue, category]) => (
                <div key={issue} className="group rounded-2xl border border-white/8 bg-white/[0.035] p-4 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.04]">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-semibold text-slate-100">{issue}</p>
                    <span className="mt-1 text-cyan-300">→</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{category}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-xs text-slate-500">{c.heroPanelFooter}</p>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-slate-950/45">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-4 py-6 text-sm font-semibold text-slate-400 sm:px-6">
          {c.trust.map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80" />
              {item}
            </span>
          ))}
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">{c.servicesEyebrow}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{c.servicesTitle}</h2>
          <p className="mt-5 text-lg leading-8 text-slate-400">{c.servicesDescription}</p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {c.services.map(([title, description, number]) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.055]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-[0.2em] text-slate-600">{number}</span>
                <span className="text-lg text-cyan-300">↗</span>
              </div>
              <h3 className="mt-8 text-xl font-bold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-950/55">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">{c.howEyebrow}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">{c.howTitle}</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {c.steps.map(([number, title, description]) => (
              <div key={number} className="rounded-3xl border border-white/10 bg-[#07111f] p-7">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300 text-sm font-black text-slate-950">{number}</span>
                <h3 className="mt-6 text-xl font-bold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">{c.pricingEyebrow}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{c.pricingTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-slate-500">{c.pricingNote}</p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {c.plans.map((plan, index) => (
            <article key={plan.name} className={`rounded-3xl border p-7 ${index === 2 ? 'border-cyan-300/50 bg-cyan-300/[0.07] shadow-xl shadow-cyan-950/20' : 'border-white/10 bg-white/[0.035]'}`}>
              <p className="text-sm font-semibold text-cyan-300">{plan.name}</p>
              <p className="mt-3 text-3xl font-black text-white">{plan.price}</p>
              <p className="mt-4 min-h-20 text-sm leading-6 text-slate-400">{plan.description}</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="text-emerald-400">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/contact?service=it-support" className="mt-8 block rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-cyan-300/50 hover:bg-cyan-300/10">
                {c.planCta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-gradient-to-br from-cyan-950/30 via-slate-950 to-blue-950/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">{c.localEyebrow}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{c.localTitle}</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">{c.localDescription}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {c.industries.map((industry) => (
                <span key={industry} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">{industry}</span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#07111f]/85 p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl text-emerald-300">✓</div>
            <h3 className="mt-6 text-2xl font-bold text-white">{c.includedTitle}</h3>
            <p className="mt-4 text-sm leading-7 text-slate-400">{c.includedDescription}</p>
            <Link href="/contact?service=it-checkup" className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-100">
              {c.includedCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[linear-gradient(120deg,rgba(34,211,238,0.12),rgba(59,130,246,0.08),rgba(15,23,42,0.95))] p-8 sm:p-12 lg:p-16">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">{c.finalEyebrow}</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">{c.finalTitle}</h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">{c.finalDescription}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact?service=it-support" className="rounded-xl bg-cyan-300 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">
              {c.finalPrimary}
            </Link>
            <Link href="/contact" className="rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
              {c.finalSecondary}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

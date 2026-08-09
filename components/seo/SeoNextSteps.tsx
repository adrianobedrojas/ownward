import { Link } from '@/i18n/navigation';

type SeoNextStepLink = {
  href: string;
  title: string;
  description: string;
};

interface SeoNextStepsProps {
  heading: string;
  links: SeoNextStepLink[];
}

export default function SeoNextSteps({ heading, links }: SeoNextStepsProps) {
  const visibleLinks = links.slice(0, 4);

  return (
    <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-xl font-semibold text-white">{heading}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-400 hover:bg-slate-900"
          >
            <h3 className="text-base font-semibold text-white">{link.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{link.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Link } from '@/i18n/navigation';
import {
  PRIVACY_CONSENT_CHANGED_EVENT,
  PRIVACY_CONSENT_STORAGE_KEY,
  PRIVACY_PANEL_OPEN_EVENT,
  consentAllowsCategories,
  openPrivacyChoicesPanel,
  readPrivacyConsent,
  savePrivacyConsent,
  type OptionalPrivacyConsentCategory,
  type PrivacyConsentState,
} from '@/lib/privacy-consent';

interface PrivacyConsentContextValue {
  consent: PrivacyConsentState | null;
  hasSavedConsent: boolean;
  openPanel: () => void;
}

const PrivacyConsentContext = createContext<PrivacyConsentContextValue | null>(null);

function toDraft(consent: PrivacyConsentState | null) {
  return {
    functionality: consent?.functionality ?? false,
    analytics: consent?.analytics ?? false,
  };
}

export function PrivacyConsentProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const isSpanish = locale === 'es';
  const t = useTranslations('Privacy');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draftConsent, setDraftConsent] = useState(toDraft(null));

  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const consent = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return () => undefined;
      }

      function handleStorage(event: StorageEvent) {
        if (!event.key || event.key === PRIVACY_CONSENT_STORAGE_KEY) {
          onStoreChange();
        }
      }

      function handleConsentChanged() {
        onStoreChange();
      }

      window.addEventListener('storage', handleStorage);
      window.addEventListener(PRIVACY_CONSENT_CHANGED_EVENT, handleConsentChanged);

      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(PRIVACY_CONSENT_CHANGED_EVENT, handleConsentChanged);
      };
    },
    () => readPrivacyConsent(),
    () => null,
  );

  useEffect(() => {
    function handleOpenPanel() {
      setDraftConsent(toDraft(consent));
      setIsCustomizing(true);
      setIsPanelOpen(true);
    }

    window.addEventListener(PRIVACY_PANEL_OPEN_EVENT, handleOpenPanel);
    return () => window.removeEventListener(PRIVACY_PANEL_OPEN_EVENT, handleOpenPanel);
  }, [consent]);

  function commitConsent(nextConsent: typeof draftConsent) {
    const savedConsent = savePrivacyConsent(nextConsent);
    setDraftConsent(toDraft(savedConsent));
    setIsPanelOpen(false);
    setIsCustomizing(false);
  }

  const contextValue = useMemo<PrivacyConsentContextValue>(
    () => ({
      consent,
      hasSavedConsent: consent !== null,
      openPanel: openPrivacyChoicesPanel,
    }),
    [consent],
  );

  const shouldShowPanel = isHydrated && (!contextValue.hasSavedConsent || isPanelOpen);

  const options = [
    {
      key: 'functionality',
      title: t('functionality'),
      description: isSpanish
        ? 'Permite guardar progreso local opcional (Academy, plan de inicio y token de visitante).'
        : 'Allows optional local progress storage (Academy, startup planner, and visitor token).',
    },
    {
      key: 'analytics',
      title: t('analytics'),
      description: isSpanish
        ? 'Permite Vercel Web Analytics y Google Analytics 4 solo después de consentimiento. Ownward sanitiza URLs/IDs privados y mantiene desactivadas señales publicitarias y personalización.'
        : 'Enables Vercel Web Analytics and Google Analytics 4 only after consent. Ownward sanitizes URLs/private IDs and keeps advertising and personalization signals disabled.',
    },
  ] as const;

  return (
    <PrivacyConsentContext.Provider value={contextValue}>
      {children}

      {isHydrated && contextValue.hasSavedConsent ? (
        <button
          type="button"
          onClick={() => {
            setDraftConsent(toDraft(consent));
            setIsCustomizing(true);
            setIsPanelOpen(true);
          }}
          className="fixed bottom-4 left-4 z-40 rounded-full border border-slate-700 bg-slate-900/95 px-4 py-2 text-sm font-semibold text-cyan-300 shadow-lg shadow-slate-950/70 transition hover:border-cyan-400 hover:text-cyan-200"
        >
          {t('button')}
        </button>
      ) : null}

      {shouldShowPanel ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/75 p-4 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-choices-title"
            className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-slate-950"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{t('panelBadge')}</p>
                <h2 id="privacy-choices-title" className="mt-2 text-2xl font-bold text-white">{t('panelTitle')}</h2>
              </div>
              {contextValue.hasSavedConsent ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsPanelOpen(false);
                    setIsCustomizing(false);
                    setDraftConsent(toDraft(consent));
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
                >
                  {t('close')}
                </button>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              {isSpanish
                ? 'Ownward siempre usa almacenamiento necesario para autenticación, seguridad y preferencias básicas. Funcionalidad y analítica se mantienen desactivadas hasta que las permitas.'
                : 'Ownward always uses necessary storage for authentication, security, and core preferences. Functionality and analytics remain disabled until you allow them.'}
            </p>

            <div className="mt-5 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">{t('necessary')}</h3>
                  <p className="mt-1 text-sm text-slate-400">{t('necessaryDescription')}</p>
                </div>
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">{t('alwaysOn')}</span>
              </div>

              {isCustomizing ? (
                <div className="space-y-3 border-t border-slate-800 pt-4">
                  {options.map((option) => (
                    <label key={option.key} className="flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <div>
                        <span className="block font-semibold text-white">{option.title}</span>
                        <span className="mt-1 block text-sm text-slate-400">{option.description}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={draftConsent[option.key]}
                        onChange={(event) =>
                          setDraftConsent((currentDraft) => ({
                            ...currentDraft,
                            [option.key]: event.target.checked,
                          }))
                        }
                        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                      />
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => commitConsent({ functionality: false, analytics: false })}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
              >
                {t('reject')}
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizing(true)}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
              >
                {t('customize')}
              </button>
              <button
                type="button"
                onClick={() => commitConsent({ functionality: true, analytics: true })}
                className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                {t('accept')}
              </button>
              {isCustomizing ? (
                <button
                  type="button"
                  onClick={() => commitConsent(draftConsent)}
                  className="rounded-lg bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {t('saveChoices')}
                </button>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <Link href="/privacy" className="font-semibold text-cyan-300 hover:text-cyan-200">{t('pageBadge')}</Link>
              <Link href="/privacy-choices" className="font-semibold text-cyan-300 hover:text-cyan-200">{t('choicesPageBadge')}</Link>
              <Link href={`mailto:${t('contactEmail')}`} className="font-semibold text-cyan-300 hover:text-cyan-200">{t('contactEmail')}</Link>
            </div>
          </section>
        </div>
      ) : null}
    </PrivacyConsentContext.Provider>
  );
}

export function usePrivacyConsent() {
  return useContext(PrivacyConsentContext) ?? {
    consent: null,
    hasSavedConsent: false,
    openPanel: openPrivacyChoicesPanel,
  };
}

interface ConsentGateProps {
  categories: OptionalPrivacyConsentCategory | OptionalPrivacyConsentCategory[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function ConsentGate({ categories, children, fallback = null }: ConsentGateProps) {
  const { consent } = usePrivacyConsent();

  if (!consentAllowsCategories(consent, categories)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface OpenPrivacyChoicesButtonProps {
  children?: ReactNode;
  className?: string;
}

export function OpenPrivacyChoicesButton({ children, className }: OpenPrivacyChoicesButtonProps) {
  const { openPanel } = usePrivacyConsent();
  const t = useTranslations('Privacy');

  return (
    <button
      type="button"
      onClick={openPanel}
      className={
        className ??
        'rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200'
      }
    >
      {children ?? t('choicesPageOpenPanel')}
    </button>
  );
}

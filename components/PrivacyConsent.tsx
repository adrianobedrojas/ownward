'use client';

import Link from 'next/link';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
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
    marketing: consent?.marketing ?? false,
  };
}

export function PrivacyConsentProvider({ children }: { children: ReactNode }) {
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

    return () => {
      window.removeEventListener(PRIVACY_PANEL_OPEN_EVENT, handleOpenPanel);
    };
  }, [consent]);

  function commitConsent(nextConsent: typeof draftConsent) {
    const savedConsent = savePrivacyConsent(nextConsent);
    setDraftConsent(toDraft(savedConsent));
    setIsPanelOpen(false);
    setIsCustomizing(false);
  }

  const contextValue = useMemo<PrivacyConsentContextValue>(() => ({
    consent,
    hasSavedConsent: consent !== null,
    openPanel: openPrivacyChoicesPanel,
  }), [consent]);

  const shouldShowPanel = isHydrated && (!contextValue.hasSavedConsent || isPanelOpen);

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
          Privacy choices
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
                <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  Privacy choices
                </p>
                <h2 id="privacy-choices-title" className="mt-2 text-2xl font-bold text-white">
                  Control optional storage on Ownward
                </h2>
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
                  Close
                </button>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              Ownward always uses necessary storage so core site features work. Functionality,
              analytics, and marketing stay off until you allow them. Your choices are stored only
              in this browser.
            </p>

            <div className="mt-5 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">Necessary</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Keeps essential site behavior working.
                  </p>
                </div>
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  Always on
                </span>
              </div>

              {isCustomizing ? (
                <div className="space-y-3 border-t border-slate-800 pt-4">
                  {[
                    {
                      key: 'functionality',
                      title: 'Functionality',
                      description:
                        'Allows optional local features such as the anonymous community response token.',
                    },
                    {
                      key: 'analytics',
                      title: 'Analytics',
                      description: 'Allows optional measurement features if they are added later.',
                    },
                    {
                      key: 'marketing',
                      title: 'Marketing',
                      description: 'Allows optional marketing-related storage if used later.',
                    },
                  ].map((option) => (
                    <label key={option.key} className="flex items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                      <div>
                        <span className="block font-semibold text-white">{option.title}</span>
                        <span className="mt-1 block text-sm text-slate-400">{option.description}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={draftConsent[option.key as keyof typeof draftConsent]}
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
                onClick={() => commitConsent({ functionality: false, analytics: false, marketing: false })}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
              >
                Reject nonessential
              </button>

              <button
                type="button"
                onClick={() => setIsCustomizing(true)}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
              >
                Customize
              </button>

              <button
                type="button"
                onClick={() => commitConsent({ functionality: true, analytics: true, marketing: true })}
                className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Accept all
              </button>

              {isCustomizing ? (
                <button
                  type="button"
                  onClick={() => commitConsent(draftConsent)}
                  className="rounded-lg bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Save choices
                </button>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <Link href="/privacy" className="font-semibold text-cyan-300 hover:text-cyan-200">
                Privacy Policy
              </Link>
              <Link href="/privacy-choices" className="font-semibold text-cyan-300 hover:text-cyan-200">
                Privacy Choices
              </Link>
              <Link href="mailto:ownwardhub@gmail.com" className="font-semibold text-cyan-300 hover:text-cyan-200">
                ownwardhub@gmail.com
              </Link>
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

export function OpenPrivacyChoicesButton({
  children = 'Open privacy panel',
  className,
}: OpenPrivacyChoicesButtonProps) {
  const { openPanel } = usePrivacyConsent();

  return (
    <button
      type="button"
      onClick={openPanel}
      className={
        className ??
        'rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200'
      }
    >
      {children}
    </button>
  );
}

export interface PartnerCommunicationsSection {
  id: string;
  title: string;
  content: string[];
}

export interface PartnerCommunicationsData {
  badge: string;
  title: string;
  effectiveDateLabel: string;
  effectiveDate: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  versionLabel: string;
  version: string;
  notice: string;
  sections: PartnerCommunicationsSection[];
  termsLinkText: string;
  privacyLinkText: string;
}

export const partnerCommunicationsContent: Record<
  "en" | "es",
  PartnerCommunicationsData
> = {
  en: {
    badge: "Partner Communications",
    title: "Partner Communications & Opportunities",

    effectiveDateLabel: "Effective Date",
    effectiveDate: "August 10, 2026",

    lastUpdatedLabel: "Last Updated",
    lastUpdated: "August 10, 2026",

    versionLabel: "Version",
    version: "2026-08-10.1",

    notice:
      "Important: Partner communications are optional. By providing separate consent, you may receive relevant business opportunities from Ownward and selected partners. Ownward may receive compensation from certain partner offers.",

    sections: [
      {
        id: "overview",
        title: "1. Overview",
        content: [
          "These Partner Communications & Opportunities Terms explain how Ownward may communicate with you about relevant business opportunities and how selected Ownward partners may contact you when you provide separate consent.",
        ],
      },

      {
        id: "who-may-contact-you",
        title: "2. Who May Contact You",
        content: [
          "If you provide optional consent, Ownward and selected partners may contact you regarding relevant products, services, financing, and other business opportunities.",
        ],
      },

      {
        id: "types-of-opportunities",
        title: "3. Types of Opportunities",
        content: [
          "Opportunities may include business financing, banking products, professional services, software, business tools, and other products or services that may be relevant to your business.",
        ],
      },

      {
        id: "communication-methods",
        title: "4. Communication Methods",
        content: [
          "Depending on the consent you provide and applicable law, communications may be sent by email, telephone call, SMS or text message, or other permitted electronic communication methods.",
        ],
      },

      {
        id: "partner-compensation",
        title: "5. Partner Compensation",
        content: [
          "Ownward may receive compensation, including referral fees, commissions, or other compensation, from certain partner relationships when a user engages with or obtains a qualifying partner product or service.",
        ],
      },

      {
        id: "optional-consent",
        title: "6. Optional Consent",
        content: [
          "Consent to partner communications is optional and is not required to create or use an Ownward account or access the Ownward Services.",
        ],
      },

      {
        id: "withdrawing-consent",
        title: "7. Withdrawing Consent",
        content: [
          "You may withdraw your consent to partner communications at any time through available Ownward communication preferences or by contacting Ownward.",
        ],
      },

      {
        id: "changes",
        title: "8. Changes to These Terms",
        content: [
          "Ownward may update these terms from time to time. When appropriate, Ownward will provide notice of material changes and maintain the applicable version of these terms.",
        ],
      },
    ],

    termsLinkText: "View Terms of Service",
    privacyLinkText: "View Privacy Policy",
  },

  es: {
    badge: "Comunicaciones de Socios",
    title: "Comunicaciones y Oportunidades de Socios",

    effectiveDateLabel: "Fecha de entrada en vigor",
    effectiveDate: "10 de agosto de 2026",

    lastUpdatedLabel: "Última actualización",
    lastUpdated: "10 de agosto de 2026",

    versionLabel: "Versión",
    version: "2026-08-10.1",

    notice:
      "Importante: Las comunicaciones de socios son opcionales. Al otorgar su consentimiento por separado, puede recibir oportunidades comerciales relevantes de Ownward y socios seleccionados. Ownward puede recibir compensación de ciertas ofertas de socios.",

    sections: [
      {
        id: "overview",
        title: "1. Descripción general",
        content: [
          "Estos Términos de Comunicaciones y Oportunidades de Socios explican cómo Ownward puede comunicarse con usted sobre oportunidades comerciales relevantes y cómo los socios seleccionados de Ownward pueden contactarlo cuando otorga su consentimiento por separado.",
        ],
      },

      {
        id: "who-may-contact-you",
        title: "2. Quién puede contactarlo",
        content: [
          "Si otorga su consentimiento opcional, Ownward y socios seleccionados pueden contactarlo con respecto a productos, servicios, financiamiento y otras oportunidades comerciales relevantes.",
        ],
      },

      {
        id: "types-of-opportunities",
        title: "3. Tipos de oportunidades",
        content: [
          "Las oportunidades pueden incluir financiamiento comercial, productos bancarios, servicios profesionales, software, herramientas comerciales y otros productos o servicios que puedan ser relevantes para su negocio.",
        ],
      },

      {
        id: "communication-methods",
        title: "4. Métodos de comunicación",
        content: [
          "Según el consentimiento que proporcione y la legislación aplicable, las comunicaciones se pueden enviar por correo electrónico, llamada telefónica, SMS o mensaje de texto u otros métodos de comunicación electrónica permitidos.",
        ],
      },

      {
        id: "partner-compensation",
        title: "5. Compensación de socios",
        content: [
          "Ownward puede recibir compensación, incluidas tarifas de referencia, comisiones u otra compensación, de ciertas relaciones con socios cuando un usuario interactúa con un producto o servicio de un socio elegible o lo obtiene.",
        ],
      },

      {
        id: "optional-consent",
        title: "6. Consentimiento opcional",
        content: [
          "El consentimiento para las comunicaciones con socios es opcional y no se requiere para crear o usar una cuenta de Ownward ni para acceder a los Servicios de Ownward.",
        ],
      },

      {
        id: "withdrawing-consent",
        title: "7. Retiro del consentimiento",
        content: [
          "Puede retirar su consentimiento para las comunicaciones con socios en cualquier momento a través de las preferencias de comunicación disponibles en Ownward o poniéndose en contacto con Ownward.",
        ],
      },

      {
        id: "changes",
        title: "8. Cambios a estos términos",
        content: [
          "Ownward puede actualizar estos términos de vez en cuando. Cuando corresponda, Ownward notificará sobre cambios sustanciales y mantendrá la versión aplicable de estos términos.",
        ],
      },
    ],

    termsLinkText: "Ver Términos de Servicio",
    privacyLinkText: "Ver Política de Privacidad",
  },
};

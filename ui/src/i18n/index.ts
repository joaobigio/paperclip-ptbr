/**
 * i18n initialization — configures i18next with react-i18next for the UI.
 *
 * Namespace strategy: one JSON file per product area (e.g. "agents", "issues").
 * All namespace files live under `locales/{lang}/`.
 *
 * Default language: pt-BR (Brazilian Portuguese). Fallback: en.
 *
 * Adding a new language:
 *   1. Create `locales/{lang}/` folder with a copy of every JSON file from `locales/en/`.
 *   2. Translate the values (keys must stay identical).
 *   3. Import each file here and add an `{lang}: { ... }` entry to the `resources` object.
 *
 * Using translations in components:
 *   import { useTranslation } from "react-i18next";
 *   const { t } = useTranslation("agents");  // pass the namespace
 *   return <span>{t("title")}</span>;
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// English (fallback)
import enCommon from "./locales/en/common.json";
import enNavigation from "./locales/en/navigation.json";
import enDashboard from "./locales/en/dashboard.json";
import enAgents from "./locales/en/agents.json";
import enIssues from "./locales/en/issues.json";
import enApprovals from "./locales/en/approvals.json";
import enGoals from "./locales/en/goals.json";
import enProjects from "./locales/en/projects.json";
import enCosts from "./locales/en/costs.json";
import enSettings from "./locales/en/settings.json";
import enAuth from "./locales/en/auth.json";
import enOnboarding from "./locales/en/onboarding.json";
import enInbox from "./locales/en/inbox.json";
import enActivity from "./locales/en/activity.json";
import enNotFound from "./locales/en/notFound.json";
import enPlugins from "./locales/en/plugins.json";

// Brazilian Portuguese (default)
import ptCommon from "./locales/pt-BR/common.json";
import ptNavigation from "./locales/pt-BR/navigation.json";
import ptDashboard from "./locales/pt-BR/dashboard.json";
import ptAgents from "./locales/pt-BR/agents.json";
import ptIssues from "./locales/pt-BR/issues.json";
import ptApprovals from "./locales/pt-BR/approvals.json";
import ptGoals from "./locales/pt-BR/goals.json";
import ptProjects from "./locales/pt-BR/projects.json";
import ptCosts from "./locales/pt-BR/costs.json";
import ptSettings from "./locales/pt-BR/settings.json";
import ptAuth from "./locales/pt-BR/auth.json";
import ptOnboarding from "./locales/pt-BR/onboarding.json";
import ptInbox from "./locales/pt-BR/inbox.json";
import ptActivity from "./locales/pt-BR/activity.json";
import ptNotFound from "./locales/pt-BR/notFound.json";
import ptPlugins from "./locales/pt-BR/plugins.json";

export const defaultNS = "common";

export const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    dashboard: enDashboard,
    agents: enAgents,
    issues: enIssues,
    approvals: enApprovals,
    goals: enGoals,
    projects: enProjects,
    costs: enCosts,
    settings: enSettings,
    auth: enAuth,
    onboarding: enOnboarding,
    inbox: enInbox,
    activity: enActivity,
    notFound: enNotFound,
    plugins: enPlugins,
  },
  "pt-BR": {
    common: ptCommon,
    navigation: ptNavigation,
    dashboard: ptDashboard,
    agents: ptAgents,
    issues: ptIssues,
    approvals: ptApprovals,
    goals: ptGoals,
    projects: ptProjects,
    costs: ptCosts,
    settings: ptSettings,
    auth: ptAuth,
    onboarding: ptOnboarding,
    inbox: ptInbox,
    activity: ptActivity,
    notFound: ptNotFound,
    plugins: ptPlugins,
  },
} as const;

i18n.use(initReactI18next).init({
  lng: "en", // DEBUG: temporariamente trocado pra en pra isolar bug em JSON pt-BR
  fallbackLng: "en",
  defaultNS,
  resources,
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;

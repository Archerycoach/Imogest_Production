import dynamic from "next/dynamic";

// Lazy load admin components for better code splitting
export const LazyUsersTable = dynamic(
  () => import("@/pages/admin/users").then((mod) => ({ default: mod.default })),
  {
    loading: () => <div className="flex items-center justify-center h-64">A carregar utilizadores...</div>,
    ssr: false,
  }
);

export const LazySubscriptionsTable = dynamic(
  () => import("@/pages/admin/subscriptions").then((mod) => ({ default: mod.default })),
  {
    loading: () => <div className="flex items-center justify-center h-64">A carregar subscrições...</div>,
    ssr: false,
  }
);

export const LazyIntegrationsPage = dynamic(
  () => import("@/pages/admin/integrations").then((mod) => ({ default: mod.default })),
  {
    loading: () => <div className="flex items-center justify-center h-64">A carregar integrações...</div>,
    ssr: false,
  }
);

export const LazySystemSettings = dynamic(
  () => import("@/pages/admin/system-settings").then((mod) => ({ default: mod.default })),
  {
    loading: () => <div className="flex items-center justify-center h-64">A carregar definições...</div>,
    ssr: false,
  }
);

export const LazySecuritySettings = dynamic(
  () => import("@/pages/admin/security").then((mod) => ({ default: mod.default })),
  {
    loading: () => <div className="flex items-center justify-center h-64">A carregar segurança...</div>,
    ssr: false,
  }
);

export const LazyPaymentSettings = dynamic(
  () => import("@/pages/admin/payment-settings").then((mod) => ({ default: mod.default })),
  {
    loading: () => <div className="flex items-center justify-center h-64">A carregar pagamentos...</div>,
    ssr: false,
  }
);
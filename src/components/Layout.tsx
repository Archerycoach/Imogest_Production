import Head from "next/head";
import { Navigation } from "./Navigation";
import { NotificationCenter } from "./NotificationCenter";
import { ThemeSwitch } from "./ThemeSwitch";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  const pageTitle = title ? `${title} | Imogest CRM` : "Imogest CRM";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <Navigation />
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b bg-card px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Imogest CRM</h1>
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <ThemeSwitch />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
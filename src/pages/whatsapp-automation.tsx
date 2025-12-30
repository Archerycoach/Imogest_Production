import { useEffect } from "react";
import { useRouter } from "next/router";

export default function WhatsAppAutomationPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to workflows page
    router.replace("/workflows");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">A redirecionar para Workflows...</p>
      </div>
    </div>
  );
}
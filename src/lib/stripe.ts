import Stripe from "stripe";
import { supabase } from "@/integrations/supabase/client";

// Get Stripe credentials from database
const getStripeCredentials = async () => {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("settings")
    .eq("integration_name", "stripe")
    .single();

  if (error || !data) {
    console.error("Failed to fetch Stripe credentials:", error);
    return null;
  }

  const settings = data.settings as any;
  
  return {
    secretKey: settings?.secret_key || "",
    publishableKey: settings?.publishable_key || "",
    webhookSecret: settings?.webhook_secret || "",
  };
};

// Initialize Stripe (will be called with credentials from database)
const initStripe = (secretKey: string) => {
  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
};

// Get publishable key for client-side
export const getStripePublishableKey = async () => {
  const credentials = await getStripeCredentials();
  return credentials?.publishableKey || "";
};

// Create a Stripe checkout session for subscription
export const createStripeCheckoutSession = async ({
  userId,
  planId,
  planName,
  amount,
  interval,
}: {
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  interval: "month" | "year";
}) => {
  try {
    const credentials = await getStripeCredentials();
    
    if (!credentials || !credentials.secretKey) {
      throw new Error("Stripe não está configurado. Por favor configure as credenciais em /admin/integrations");
    }

    const stripe = initStripe(credentials.secretKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: planName,
              description: `Subscrição ${planName} - Imogest CRM`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
            recurring: {
              interval: interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription?canceled=true`,
      metadata: {
        userId,
        planId,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId,
          planId,
        },
      },
    });

    return { sessionId: session.id, url: session.url };
  } catch (error: any) {
    console.error("Error creating Stripe checkout session:", error);
    throw new Error(`Erro ao criar sessão de pagamento: ${error.message}`);
  }
};

// Create a Stripe customer
export const createStripeCustomer = async ({
  email,
  name,
  userId,
}: {
  email: string;
  name: string;
  userId: string;
}) => {
  try {
    const credentials = await getStripeCredentials();
    
    if (!credentials || !credentials.secretKey) {
      throw new Error("Stripe não está configurado");
    }

    const stripe = initStripe(credentials.secretKey);

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    return customer;
  } catch (error: any) {
    console.error("Error creating Stripe customer:", error);
    throw new Error(`Erro ao criar cliente Stripe: ${error.message}`);
  }
};

// Verify Stripe webhook signature
export const verifyStripeWebhook = async (
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> => {
  const credentials = await getStripeCredentials();
  
  if (!credentials || !credentials.webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET não configurado");
  }

  const stripe = initStripe(credentials.secretKey);

  try {
    return stripe.webhooks.constructEvent(payload, signature, credentials.webhookSecret);
  } catch (error: any) {
    console.error("Error verifying Stripe webhook:", error);
    throw new Error(`Webhook inválido: ${error.message}`);
  }
};
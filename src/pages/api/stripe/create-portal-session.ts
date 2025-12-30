import type { NextApiRequest, NextApiResponse } from "next";
import { stripe } from "@/lib/stripe";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID é obrigatório" });
    }

    // Create Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error: unknown) {
    console.error("Error creating portal session:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Erro ao criar sessão do portal" 
    });
  }
}
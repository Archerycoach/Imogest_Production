import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("=== DEBUG AUTH ENDPOINT ===");
    console.log("Query params:", req.query);
    console.log("Authorization header:", req.headers.authorization);
    
    const authHeader = req.headers.authorization;
    const tokenFromQuery = req.query.token as string;
    
    console.log("Token from query exists:", !!tokenFromQuery);
    console.log("Token from query length:", tokenFromQuery?.length || 0);
    console.log("Token from query (first 50 chars):", tokenFromQuery?.substring(0, 50));
    
    const token = authHeader 
      ? authHeader.replace("Bearer ", "") 
      : tokenFromQuery;

    if (!token) {
      return res.status(200).json({ 
        error: "No token provided",
        authHeader: !!authHeader,
        tokenFromQuery: !!tokenFromQuery,
        queryKeys: Object.keys(req.query)
      });
    }

    console.log("Attempting to validate token with Supabase...");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      console.error("❌ Token validation error:", userError);
      return res.status(200).json({
        error: "Token validation failed",
        message: userError.message,
        token: token.substring(0, 50) + "..."
      });
    }

    if (!user) {
      return res.status(200).json({
        error: "User not found",
        token: token.substring(0, 50) + "..."
      });
    }

    console.log("✅ Token is valid for user:", user.id);
    
    return res.status(200).json({
      success: true,
      userId: user.id,
      userEmail: user.email,
      tokenLength: token.length
    });

  } catch (error) {
    console.error("❌ Debug endpoint error:", error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    });
  }
}
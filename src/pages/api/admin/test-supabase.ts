import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin, validateSupabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("=== TESTING SUPABASE ADMIN CLIENT ===");

    // 1. Validate configuration
    const validation = validateSupabaseAdmin();
    console.log("Validation result:", validation);

    if (!validation.isValid) {
      return res.status(500).json({
        success: false,
        error: "Configuration invalid",
        details: validation.error,
      });
    }

    // 2. Test simple query
    console.log("Testing simple query...");
    const { data: simpleTest, error: simpleError } = await supabaseAdmin
      .from("user_integrations")
      .select("count")
      .limit(1);

    console.log("Simple query result:", { data: simpleTest, error: simpleError });

    if (simpleError) {
      return res.status(500).json({
        success: false,
        error: "Simple query failed",
        details: simpleError,
      });
    }

    // 3. Test insert (with rollback)
    console.log("Testing insert...");
    const testRecord = {
      user_id: "00000000-0000-0000-0000-000000000000", // Test UUID
      integration_type: "test_integration",
      access_token: "test_token",
      refresh_token: "test_refresh",
      token_expiry: new Date(Date.now() + 3600000).toISOString(),
      is_active: true,
    };

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from("user_integrations")
      .insert(testRecord)
      .select();

    console.log("Insert result:", { data: insertData, error: insertError });

    // Clean up test record
    if (insertData && insertData.length > 0) {
      await supabaseAdmin
        .from("user_integrations")
        .delete()
        .eq("id", insertData[0].id);
      console.log("Test record cleaned up");
    }

    if (insertError) {
      return res.status(500).json({
        success: false,
        error: "Insert test failed",
        details: insertError,
      });
    }

    // 4. Success
    return res.status(200).json({
      success: true,
      message: "Supabase Admin client working correctly",
      tests: {
        validation: "✅ PASSED",
        simpleQuery: "✅ PASSED",
        insert: "✅ PASSED",
      },
    });
  } catch (error: any) {
    console.error("Exception in test:", error);
    return res.status(500).json({
      success: false,
      error: "Exception occurred",
      details: error.message,
      stack: error.stack,
    });
  }
}
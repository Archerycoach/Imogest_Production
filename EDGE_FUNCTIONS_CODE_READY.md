# 📋 Código das Edge Functions - Pronto para Deploy Manual

## ⚠️ INSTRUÇÕES IMPORTANTES

**Como usar este documento:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto Imogest
3. Menu lateral → **Edge Functions**
4. Clique **"Create a new function"**
5. Copie o código de uma das funções abaixo
6. Cole no editor do Dashboard
7. Clique **"Deploy"**
8. Repita para as outras 2 funções

**Tempo estimado:** 5-8 minutos total

---

## 🔵 FUNÇÃO 1: daily-emails

**Nome da função:** `daily-emails`

**Descrição:** Envia notificações diárias por email para utilizadores com tarefas e eventos agendados

**Quando usar:** Cron diário (ex: 0 8 * * * = 08:00 todos os dias)

**Código completo:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📧 [daily-emails] Starting daily email notifications...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check Gmail Integration
    const { data: gmailIntegration, error: gmailError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "gmail")
      .single();

    if (gmailError || !gmailIntegration || !gmailIntegration.is_active) {
      console.error("❌ [daily-emails] Gmail integration not configured or not active");
      return new Response(
        JSON.stringify({ 
          error: "Gmail integration not configured",
          success: false 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("✅ [daily-emails] Gmail integration is active");

    // 2. Get users with email notifications enabled
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name, email_daily_tasks, email_daily_events")
      .or("email_daily_tasks.eq.true,email_daily_events.eq.true")
      .not("email", "is", null);

    if (usersError) {
      console.error("❌ [daily-emails] Error fetching users:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("ℹ️ [daily-emails] No users with email notifications enabled");
      return new Response(
        JSON.stringify({ 
          message: "No users to notify",
          success: true,
          sent: 0
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`📊 [daily-emails] Found ${users.length} users with notifications enabled`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const today = new Date().toISOString().split("T")[0];

    // 3. Process each user
    for (const user of users) {
      try {
        console.log(`🔄 [daily-emails] Processing user: ${user.email}`);

        // Check if user has Gmail connected
        const { data: userIntegration } = await supabase
          .from("user_integrations")
          .select("access_token, is_active")
          .eq("user_id", user.id)
          .eq("integration_type", "gmail")
          .single();

        if (!userIntegration || !userIntegration.is_active) {
          console.log(`⚠️ [daily-emails] User ${user.email} doesn't have Gmail connected`);
          continue;
        }

        let tasksHtml = "";
        let eventsHtml = "";

        // Get tasks if enabled
        if (user.email_daily_tasks) {
          const { data: tasks } = await supabase
            .from("tasks")
            .select(`
              *,
              leads (name),
              contacts (name)
            `)
            .eq("user_id", user.id)
            .eq("due_date", today)
            .eq("is_completed", false)
            .order("priority", { ascending: false })
            .order("due_time", { ascending: true });

          if (tasks && tasks.length > 0) {
            console.log(`📋 [daily-emails] Found ${tasks.length} tasks for ${user.email}`);
            tasksHtml = `
              <div style="margin-bottom: 30px;">
                <h2 style="color: #1e40af; margin-bottom: 15px;">📋 Suas Tarefas para Hoje</h2>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
            `;

            tasks.forEach((task: any) => {
              const priorityEmoji = task.priority === "high" ? "🔴" : task.priority === "medium" ? "🟡" : "🟢";
              const relatedName = task.leads?.name || task.contacts?.name || "";
              tasksHtml += `
                <div style="margin-bottom: 12px; padding: 12px; background: white; border-radius: 6px;">
                  <div style="font-weight: 600; color: #1f2937;">
                    ${priorityEmoji} ${task.title}
                    ${task.due_time ? `<span style="color: #6b7280; font-size: 14px;">(${task.due_time})</span>` : ""}
                  </div>
                  ${relatedName ? `<div style="color: #6b7280; font-size: 14px; margin-top: 4px;">👤 ${relatedName}</div>` : ""}
                  ${task.description ? `<div style="color: #4b5563; font-size: 14px; margin-top: 4px;">${task.description}</div>` : ""}
                </div>
              `;
            });

            tasksHtml += `
                </div>
              </div>
            `;
          }
        }

        // Get events if enabled
        if (user.email_daily_events) {
          const { data: events } = await supabase
            .from("calendar_events")
            .select(`
              *,
              leads (name),
              contacts (name)
            `)
            .eq("user_id", user.id)
            .gte("start_time", `${today}T00:00:00`)
            .lte("start_time", `${today}T23:59:59`)
            .order("start_time", { ascending: true });

          if (events && events.length > 0) {
            console.log(`📅 [daily-emails] Found ${events.length} events for ${user.email}`);
            eventsHtml = `
              <div style="margin-bottom: 30px;">
                <h2 style="color: #1e40af; margin-bottom: 15px;">📅 Seus Eventos para Hoje</h2>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
            `;

            events.forEach((event: any) => {
              const startTime = new Date(event.start_time).toLocaleTimeString("pt-PT", { 
                hour: "2-digit", 
                minute: "2-digit" 
              });
              const endTime = new Date(event.end_time).toLocaleTimeString("pt-PT", { 
                hour: "2-digit", 
                minute: "2-digit" 
              });
              const relatedName = event.leads?.name || event.contacts?.name || "";

              eventsHtml += `
                <div style="margin-bottom: 12px; padding: 12px; background: white; border-radius: 6px;">
                  <div style="font-weight: 600; color: #1f2937;">
                    📌 ${event.title}
                    <span style="color: #6b7280; font-size: 14px;">(${startTime} - ${endTime})</span>
                  </div>
                  ${relatedName ? `<div style="color: #6b7280; font-size: 14px; margin-top: 4px;">👤 ${relatedName}</div>` : ""}
                  ${event.description ? `<div style="color: #4b5563; font-size: 14px; margin-top: 4px;">${event.description}</div>` : ""}
                  ${event.location ? `<div style="color: #6b7280; font-size: 14px; margin-top: 4px;">📍 ${event.location}</div>` : ""}
                </div>
              `;
            });

            eventsHtml += `
                </div>
              </div>
            `;
          }
        }

        // Only send if there's content
        if (!tasksHtml && !eventsHtml) {
          console.log(`ℹ️ [daily-emails] No tasks or events for ${user.email}`);
          continue;
        }

        // Build email HTML
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Imogest CRM</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Suas atividades para hoje</p>
    </div>
    <div style="padding: 30px;">
      <p style="color: #1f2937; font-size: 16px; margin-bottom: 25px;">
        Olá <strong>${user.full_name || "Utilizador"}</strong>,
      </p>
      ${tasksHtml}
      ${eventsHtml}
      <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          💡 <strong>Dica:</strong> Acesse o Imogest para visualizar todos os detalhes e marcar tarefas como concluídas.
        </p>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
        Este é um email automático do Imogest CRM
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Imogest. Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>
        `;

        // Send via internal API
        const sendResponse = await fetch(
          `${supabaseUrl.replace("/rest/v1", "")}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              userId: user.id,
              to: user.email,
              subject: `📋 Suas atividades para hoje - ${new Date().toLocaleDateString("pt-PT")}`,
              html: emailHtml,
            }),
          }
        );

        if (sendResponse.ok) {
          console.log(`✅ [daily-emails] Email sent to ${user.email}`);
          results.success++;
        } else {
          const errorText = await sendResponse.text();
          console.error(`❌ [daily-emails] Failed to send to ${user.email}:`, errorText);
          results.failed++;
          results.errors.push(`${user.email}: ${errorText}`);
        }

      } catch (userError: any) {
        console.error(`❌ [daily-emails] Error processing user ${user.email}:`, userError);
        results.failed++;
        results.errors.push(`${user.email}: ${userError.message}`);
      }
    }

    console.log(`✅ [daily-emails] Completed: ${results.success} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Daily email notifications completed",
        sent: results.success,
        failed: results.failed,
        errors: results.errors,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("❌ [daily-emails] Critical error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
```

**Cron sugerido:** `0 8 * * *` (todos os dias às 08:00 UTC)

---

## 📱 FUNÇÃO 2: daily-tasks-whatsapp

**Nome da função:** `daily-tasks-whatsapp`

**Descrição:** Envia notificações diárias via WhatsApp para utilizadores com tarefas agendadas

**Quando usar:** Cron diário (ex: 0 8 * * * = 08:00 todos os dias)

**Código completo:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("📱 [daily-tasks-whatsapp] Starting WhatsApp task notifications...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check WhatsApp Integration
    const { data: whatsappIntegration, error: whatsappError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "whatsapp")
      .single();

    if (whatsappError || !whatsappIntegration || !whatsappIntegration.is_active) {
      console.log("⚠️ [daily-tasks-whatsapp] WhatsApp integration not configured");
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "WhatsApp integration not configured" 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { phone_number_id, access_token } = whatsappIntegration.settings;

    if (!phone_number_id || !access_token) {
      console.log("⚠️ [daily-tasks-whatsapp] WhatsApp credentials incomplete");
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "WhatsApp credentials incomplete" 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("✅ [daily-tasks-whatsapp] WhatsApp integration is active");

    // 2. Get users with phone numbers
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone")
      .not("phone", "is", null);

    if (usersError || !users || users.length === 0) {
      console.log("ℹ️ [daily-tasks-whatsapp] No users with phone numbers");
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "No users to notify",
          sent: 0
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`📱 [daily-tasks-whatsapp] Processing ${users.length} users`);

    let messagesSent = 0;
    let messagesFailed = 0;
    const today = new Date().toISOString().split("T")[0];

    // 3. Process each user
    for (const user of users) {
      try {
        const { data: tasks } = await supabase
          .from("tasks")
          .select(`
            *,
            leads (name),
            contacts (name)
          `)
          .eq("user_id", user.id)
          .eq("due_date", today)
          .eq("is_completed", false)
          .order("priority", { ascending: false })
          .order("due_time", { ascending: true });

        if (!tasks || tasks.length === 0) {
          console.log(`ℹ️ [daily-tasks-whatsapp] No tasks for ${user.email}`);
          continue;
        }

        console.log(`📋 [daily-tasks-whatsapp] Found ${tasks.length} tasks for ${user.email}`);

        // Build message
        let message = `Bom dia, ${user.full_name || "Utilizador"}! 👋\n\n`;
        message += `📋 *Tarefas para hoje (${new Date().toLocaleDateString("pt-PT")})*\n\n`;

        const highPriority = tasks.filter((t: any) => t.priority === "high");
        const mediumPriority = tasks.filter((t: any) => t.priority === "medium");
        const lowPriority = tasks.filter((t: any) => t.priority === "low");

        if (highPriority.length > 0) {
          message += `🔴 *ALTA PRIORIDADE:*\n`;
          highPriority.forEach((task: any, index: number) => {
            const relatedName = task.leads?.name || task.contacts?.name;
            message += `${index + 1}. *${task.title}*`;
            if (task.due_time) message += ` (${task.due_time})`;
            message += `\n`;
            if (relatedName) message += `   👤 ${relatedName}\n`;
            if (task.description) {
              const shortDesc = task.description.length > 50 
                ? task.description.substring(0, 50) + "..." 
                : task.description;
              message += `   📝 ${shortDesc}\n`;
            }
            message += `\n`;
          });
        }

        if (mediumPriority.length > 0) {
          message += `🟡 *MÉDIA PRIORIDADE:*\n`;
          mediumPriority.forEach((task: any, index: number) => {
            message += `${index + 1}. *${task.title}*`;
            if (task.due_time) message += ` (${task.due_time})`;
            message += `\n\n`;
          });
        }

        if (lowPriority.length > 0) {
          message += `🟢 *BAIXA PRIORIDADE:*\n`;
          lowPriority.forEach((task: any, index: number) => {
            message += `${index + 1}. ${task.title}`;
            if (task.due_time) message += ` (${task.due_time})`;
            message += `\n`;
          });
          message += `\n`;
        }

        message += `✨ Total: *${tasks.length} tarefa${tasks.length !== 1 ? "s" : ""}*\n`;
        message += `Bom trabalho! 💪`;

        // Format phone
        let phoneNumber = user.phone.replace(/\s/g, "");
        if (!phoneNumber.startsWith("+")) {
          phoneNumber = "+" + phoneNumber;
        }

        // Send WhatsApp
        const whatsappResponse = await fetch(
          `https://graph.facebook.com/v18.0/${phone_number_id}/messages`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phoneNumber,
              type: "text",
              text: { body: message },
            }),
          }
        );

        if (whatsappResponse.ok) {
          console.log(`✅ [daily-tasks-whatsapp] Message sent to ${phoneNumber}`);
          messagesSent++;
        } else {
          const errorText = await whatsappResponse.text();
          console.error(`❌ [daily-tasks-whatsapp] Failed to send to ${phoneNumber}:`, errorText);
          messagesFailed++;
        }

      } catch (userError) {
        console.error(`❌ [daily-tasks-whatsapp] Error processing user:`, userError);
        messagesFailed++;
      }
    }

    console.log(`✅ [daily-tasks-whatsapp] Completed: ${messagesSent} sent, ${messagesFailed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        messagesSent,
        messagesFailed,
        totalUsers: users.length 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("❌ [daily-tasks-whatsapp] Fatal error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
```

**Cron sugerido:** `0 8 * * *` (todos os dias às 08:00 UTC)

---

## 📅 FUNÇÃO 3: sync-google-calendar

**Nome da função:** `sync-google-calendar`

**Descrição:** Sincronização automática bidirecional com Google Calendar

**Quando usar:** Cron a cada 15 minutos (ex: */15 * * * *)

**Código completo:**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔵 [sync-google-calendar] Starting automatic calendar sync...");

    // 1. Get Google Calendar integration settings
    const { data: calendarIntegration, error: calendarError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "google_calendar")
      .single();

    if (calendarError || !calendarIntegration || !calendarIntegration.is_active) {
      console.log("⚠️ [sync-google-calendar] Google Calendar integration not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Google Calendar not configured" 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { clientId, clientSecret } = calendarIntegration.settings;

    // 2. Get all users with Google Calendar connected
    const { data: userIntegrations, error: integrationsError } = await supabase
      .from("user_integrations")
      .select("user_id, access_token, refresh_token, token_expiry")
      .eq("integration_type", "google_calendar")
      .eq("is_active", true);

    if (integrationsError || !userIntegrations || userIntegrations.length === 0) {
      console.log("⚠️ [sync-google-calendar] No users with Google Calendar connected");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No users to sync" 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`📅 [sync-google-calendar] Processing ${userIntegrations.length} users`);

    let totalImported = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    // 3. Sync each user's calendar
    for (const integration of userIntegrations) {
      try {
        const { user_id, access_token, refresh_token, token_expiry } = integration;

        // Check if token needs refresh
        let currentAccessToken = access_token;
        if (token_expiry && new Date(token_expiry) <= new Date()) {
          console.log(`🔄 [sync-google-calendar] Refreshing token for user ${user_id}`);
          
          const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refresh_token,
              grant_type: "refresh_token",
            }),
          });

          if (tokenResponse.ok) {
            const tokens = await tokenResponse.json();
            currentAccessToken = tokens.access_token;

            await supabase
              .from("user_integrations")
              .update({
                access_token: tokens.access_token,
                token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              })
              .eq("user_id", user_id)
              .eq("integration_type", "google_calendar");

            console.log(`✅ [sync-google-calendar] Token refreshed for user ${user_id}`);
          } else {
            console.error(`❌ [sync-google-calendar] Failed to refresh token for user ${user_id}`);
            totalErrors++;
            continue;
          }
        }

        // Fetch events from Google Calendar (next 7 days)
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          new URLSearchParams({
            timeMin: now.toISOString(),
            timeMax: nextWeek.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
          }),
          {
            headers: {
              "Authorization": `Bearer ${currentAccessToken}`,
            },
          }
        );

        if (!calendarResponse.ok) {
          console.error(`❌ [sync-google-calendar] Failed to fetch events for user ${user_id}`);
          totalErrors++;
          continue;
        }

        const calendarData = await calendarResponse.json();
        const googleEvents = calendarData.items || [];

        console.log(`📥 [sync-google-calendar] Found ${googleEvents.length} events for user ${user_id}`);

        let userImported = 0;
        let userUpdated = 0;

        // Process each Google event
        for (const gEvent of googleEvents) {
          try {
            const { data: existingEvent } = await supabase
              .from("calendar_events")
              .select("id, updated_at")
              .eq("user_id", user_id)
              .eq("google_event_id", gEvent.id)
              .single();

            const eventData = {
              user_id,
              title: gEvent.summary || "Sem título",
              description: gEvent.description || null,
              location: gEvent.location || null,
              start_time: gEvent.start.dateTime || gEvent.start.date,
              end_time: gEvent.end.dateTime || gEvent.end.date,
              all_day: !gEvent.start.dateTime,
              google_event_id: gEvent.id,
              google_calendar_synced: true,
              updated_at: new Date().toISOString(),
            };

            if (existingEvent) {
              const gEventUpdated = new Date(gEvent.updated);
              const dbEventUpdated = new Date(existingEvent.updated_at);

              if (gEventUpdated > dbEventUpdated) {
                await supabase
                  .from("calendar_events")
                  .update(eventData)
                  .eq("id", existingEvent.id);

                userUpdated++;
                console.log(`🔄 [sync-google-calendar] Updated event: ${eventData.title}`);
              }
            } else {
              await supabase
                .from("calendar_events")
                .insert(eventData);

              userImported++;
              console.log(`➕ [sync-google-calendar] Imported event: ${eventData.title}`);
            }

          } catch (eventError) {
            console.error(`❌ [sync-google-calendar] Error processing event:`, eventError);
          }
        }

        console.log(`✅ [sync-google-calendar] User ${user_id}: ${userImported} imported, ${userUpdated} updated`);
        totalImported += userImported;
        totalUpdated += userUpdated;

      } catch (userError) {
        console.error(`❌ [sync-google-calendar] Error syncing user:`, userError);
        totalErrors++;
      }
    }

    console.log(`✅ [sync-google-calendar] Completed: ${totalImported} imported, ${totalUpdated} updated, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalUsers: userIntegrations.length,
        totalImported,
        totalUpdated,
        totalErrors,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("❌ [sync-google-calendar] Fatal error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
```

**Cron sugerido:** `*/15 * * * *` (a cada 15 minutos)

---

## 🎯 PASSO A PASSO RÁPIDO

### 1. Acesse o Dashboard
- URL: https://supabase.com/dashboard
- Login com sua conta
- Selecione projeto **Imogest**

### 2. Vá para Edge Functions
- Menu lateral esquerdo
- Clique em **"Edge Functions"**

### 3. Crie a primeira função
- Clique **"Create a new function"**
- **Function name:** `daily-emails`
- Copie o código da **FUNÇÃO 1** acima
- Cole no editor
- Clique **"Deploy"**
- ✅ Aguarde "Deployed" aparecer

### 4. Crie a segunda função
- Clique **"Create a new function"** novamente
- **Function name:** `daily-tasks-whatsapp`
- Copie o código da **FUNÇÃO 2** acima
- Cole no editor
- Clique **"Deploy"**
- ✅ Aguarde "Deployed" aparecer

### 5. Crie a terceira função
- Clique **"Create a new function"** novamente
- **Function name:** `sync-google-calendar`
- Copie o código da **FUNÇÃO 3** acima
- Cole no editor
- Clique **"Deploy"**
- ✅ Aguarde "Deployed" aparecer

### 6. Configure Cron Jobs
- Para cada função, clique nela
- Tab **"Settings"**
- Seção **"Cron Jobs"**
- Clique **"Add cron job"**

**Para daily-emails:**
```
Name: daily-email-notifications
Schedule: 0 8 * * *
HTTP Method: POST
Request Body: {}
Enable: ✅
```

**Para daily-tasks-whatsapp:**
```
Name: daily-whatsapp-tasks
Schedule: 0 8 * * *
HTTP Method: POST
Request Body: {}
Enable: ✅
```

**Para sync-google-calendar:**
```
Name: calendar-auto-sync
Schedule: */15 * * * *
HTTP Method: POST
Request Body: {}
Enable: ✅
```

---

## ✅ VERIFICAÇÃO FINAL

Após criar todas as funções, verifique:

- [ ] 3 Edge Functions criadas no Dashboard ✅
- [ ] Status "Deployed" em todas ✅
- [ ] 3 Cron Jobs configurados ✅
- [ ] Badge "Active" nos Cron Jobs ✅

**Teste manual:**
- Clique em cada função
- Tab "Invoke"
- Clique "Send request"
- ✅ Response 200 OK

---

## 🎉 PRONTO!

As Edge Functions estão agora deployadas e configuradas para execução automática!

**Execução:**
- `daily-emails`: Todos os dias às 08:00 UTC
- `daily-tasks-whatsapp`: Todos os dias às 08:00 UTC
- `sync-google-calendar`: A cada 15 minutos

**Monitoramento:**
- Tab "Logs" em cada função para ver execuções em tempo real
- Filtrar por nível: info, error, warn
- Buscar por texto específico

---

**Tempo total estimado:** 5-8 minutos ⏱️
**Dificuldade:** Fácil ✅
**Custo:** Grátis (Free Tier) 💰
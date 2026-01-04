// Edge Function: Daily Email Notifications
// Sends daily emails with tasks and events to users who have enabled these notifications
// Should be scheduled to run daily at 8:00 AM via Supabase Cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_time: string | null;
  priority: string;
  lead_id: string | null;
  contact_id: string | null;
  leads?: { name: string } | null;
  contacts?: { name: string } | null;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  lead_id: string | null;
  leads?: { name: string } | null;
}

serve(async (req) => {
  try {
    console.log("🚀 Starting daily email notifications...");

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ✅ Get MailerSend configuration from Database (integration_settings)
    // This ensures we use the same config as the main app
    const { data: integration, error: integrationError } = await supabase
      .from("integration_settings")
      .select("settings, is_active")
      .eq("integration_name", "mailersend")
      .single();

    if (integrationError || !integration || !integration.is_active) {
      console.error("⚠️ MailerSend not configured or inactive in database");
      return new Response(
        JSON.stringify({ message: "MailerSend integration not active" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract settings safely
    const settings = integration.settings as { apiKey: string; fromEmail: string; fromName?: string };
    const MAILERSEND_API_KEY = settings.apiKey;
    const MAILERSEND_FROM_EMAIL = settings.fromEmail;
    const MAILERSEND_FROM_NAME = settings.fromName || "Imogest";

    if (!MAILERSEND_API_KEY || !MAILERSEND_FROM_EMAIL) {
      console.error("⚠️ MailerSend credentials incomplete in database");
      return new Response(
        JSON.stringify({ message: "MailerSend credentials incomplete" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Get today's date
    const today = new Date().toISOString().split("T")[0];
    console.log(`📅 Processing for date: ${today}`);

    // Get all users with email notifications enabled
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, full_name, email, reply_email, email_daily_tasks, email_daily_events")
      .or("email_daily_tasks.eq.true,email_daily_events.eq.true")
      .not("email", "is", null);

    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("ℹ️ No users with email notifications enabled");
      return new Response(
        JSON.stringify({ message: "No users to notify" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`👥 Found ${users.length} users with notifications enabled`);

    // Process each user
    const results = [];
    for (const user of users) {
      try {
        let emailSent = false;
        let emailContent = "";

        // Check if user wants daily tasks
        if (user.email_daily_tasks) {
          const tasks = await getDailyTasks(supabase, user.id, today);
          if (tasks.length > 0) {
            emailContent += formatTasksEmail(user.full_name, tasks, today);
            emailSent = true;
          }
        }

        // Check if user wants daily events
        if (user.email_daily_events) {
          const events = await getDailyEvents(supabase, user.id, today);
          if (events.length > 0) {
            if (emailContent) emailContent += "<hr style='margin: 30px 0;'>";
            emailContent += formatEventsEmail(user.full_name, events, today);
            emailSent = true;
          }
        }

        // Send email if there's content
        if (emailSent && emailContent) {
          // Determine where to send
          const recipientEmail = user.email; // Send to login email by default for notifications
          // Or use reply_email if you prefer notifications there:
          // const recipientEmail = user.reply_email || user.email;
          
          await sendEmail(
            MAILERSEND_API_KEY,
            MAILERSEND_FROM_EMAIL,
            MAILERSEND_FROM_NAME,
            recipientEmail,
            user.full_name,
            emailContent
          );
          results.push({ user: user.email, status: "sent" });
          console.log(`✅ Email sent to ${user.email}`);
        } else {
          results.push({ user: user.email, status: "no_content" });
          console.log(`ℹ️ No tasks/events for ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error);
        results.push({ user: user.email, status: "error", error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Daily emails processed",
        results,
        total: users.length,
        sent: results.filter(r => r.status === "sent").length
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// Get tasks for today
async function getDailyTasks(supabase: any, userId: string, date: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      id,
      title,
      description,
      due_time,
      priority,
      lead_id,
      contact_id,
      leads:lead_id (name),
      contacts:contact_id (name)
    `)
    .eq("assigned_to", userId)
    .eq("due_date", date)
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("due_time", { ascending: true, nullsLast: true });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return data || [];
}

// Get events for today
async function getDailyEvents(supabase: any, userId: string, date: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select(`
      id,
      title,
      description,
      start_time,
      end_time,
      location,
      lead_id,
      leads:lead_id (name)
    `)
    .eq("user_id", userId)
    .gte("start_time", `${date}T00:00:00`)
    .lt("start_time", `${date}T23:59:59`)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return data || [];
}

// Format tasks email
function formatTasksEmail(userName: string, tasks: Task[], date: string): string {
  const priorityEmoji: Record<string, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢"
  };

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">📋 Tarefas para Hoje</h2>
      <p style="color: #64748b; margin-bottom: 20px;">
        Bom dia, ${userName}! 👋<br>
        Aqui estão as suas tarefas para ${new Date(date).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}:
      </p>
  `;

  // Group by priority
  const grouped = {
    high: tasks.filter(t => t.priority === "high"),
    medium: tasks.filter(t => t.priority === "medium"),
    low: tasks.filter(t => t.priority === "low")
  };

  for (const [priority, priorityTasks] of Object.entries(grouped)) {
    if (priorityTasks.length === 0) continue;

    const priorityLabel = priority === "high" ? "ALTA PRIORIDADE" : 
                         priority === "medium" ? "MÉDIA PRIORIDADE" : "BAIXA PRIORIDADE";
    
    html += `<h3 style="color: #1e293b; margin-top: 20px;">${priorityEmoji[priority]} ${priorityLabel}</h3>`;
    html += `<ul style="list-style: none; padding: 0;">`;

    for (const task of priorityTasks) {
      const time = task.due_time ? ` (${task.due_time.substring(0, 5)})` : "";
      const relatedTo = task.leads?.name || task.contacts?.name || "";
      const related = relatedTo ? `<br><small style="color: #64748b;">👤 ${relatedTo}</small>` : "";
      
      html += `
        <li style="background: #f8fafc; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid ${priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : '#10b981'};">
          <strong style="color: #1e293b;">${task.title}</strong>${time}
          ${related}
          ${task.description ? `<br><small style="color: #64748b;">📝 ${task.description}</small>` : ""}
        </li>
      `;
    }

    html += `</ul>`;
  }

  html += `
      <p style="margin-top: 30px; color: #64748b;">
        ✨ Total: <strong>${tasks.length} tarefa${tasks.length !== 1 ? 's' : ''}</strong><br>
        Bom trabalho! 💪
      </p>
    </div>
  `;

  return html;
}

// Format events email
function formatEventsEmail(userName: string, events: Event[], date: string): string {
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">📅 Eventos para Hoje</h2>
      <p style="color: #64748b; margin-bottom: 20px;">
        Aqui estão os seus eventos agendados para ${new Date(date).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}:
      </p>
      <ul style="list-style: none; padding: 0;">
  `;

  for (const event of events) {
    const startTime = new Date(event.start_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(event.end_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const relatedTo = event.leads?.name || "";
    const related = relatedTo ? `<br><small style="color: #64748b;">👤 ${relatedTo}</small>` : "";
    const location = event.location ? `<br><small style="color: #64748b;">📍 ${event.location}</small>` : "";
    
    html += `
      <li style="background: #faf5ff; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #7c3aed;">
        <strong style="color: #1e293b;">${event.title}</strong>
        <br><small style="color: #7c3aed;">🕐 ${startTime} - ${endTime}</small>
        ${related}
        ${location}
        ${event.description ? `<br><small style="color: #64748b;">📝 ${event.description}</small>` : ""}
      </li>
    `;
  }

  html += `
      </ul>
      <p style="margin-top: 30px; color: #64748b;">
        ✨ Total: <strong>${events.length} evento${events.length !== 1 ? 's' : ''}</strong><br>
        Boa sorte! 🎯
      </p>
    </div>
  `;

  return html;
}

// Send email via MailerSend
async function sendEmail(apiKey: string, fromEmail: string, fromName: string, to: string, userName: string, htmlContent: string) {
  const response = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: {
        email: fromEmail,
        name: fromName,
      },
      to: [{ email: to, name: userName }],
      subject: `📋 Resumo Diário - ${new Date().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}`,
      html: htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MailerSend error: ${error}`);
  }
}
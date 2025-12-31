import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string;
  due_time: string | null;
  related_lead_id: string | null;
  related_contact_id: string | null;
  leads?: { name: string } | null;
  contacts?: { name: string } | null;
}

interface User {
  id: string;
  email: string;
  phone: string | null;
  full_name: string | null;
  role: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const whatsappPhoneNumberId = Deno.env.get("NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];

    console.log(`Running daily tasks WhatsApp notification for date: ${today}`);

    // Get all active users with phone numbers
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, phone, full_name, role")
      .not("phone", "is", null)
      .in("role", ["agent", "team_lead", "admin"]);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log("No users with phone numbers found");
      return new Response(
        JSON.stringify({ message: "No users with phone numbers found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${users.length} users to process`);

    const results = [];

    // Process each user
    for (const user of users) {
      console.log(`Processing user: ${user.email} (${user.id})`);

      // Get tasks for today for this user
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          priority,
          due_date,
          due_time,
          related_lead_id,
          related_contact_id,
          leads:leads!tasks_related_lead_id_fkey(name),
          contacts:contacts!tasks_related_contact_id_fkey(name)
        `)
        .eq("user_id", user.id)
        .eq("due_date", today)
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .order("due_time", { ascending: true });

      if (tasksError) {
        console.error(`Error fetching tasks for user ${user.email}:`, tasksError);
        results.push({
          user: user.email,
          success: false,
          error: tasksError.message,
        });
        continue;
      }

      if (!tasks || tasks.length === 0) {
        console.log(`No tasks for today for user ${user.email}`);
        results.push({
          user: user.email,
          success: true,
          message: "No tasks for today",
          tasksCount: 0,
        });
        continue;
      }

      console.log(`Found ${tasks.length} tasks for user ${user.email}`);

      // Format message
      const message = formatTasksMessage(user, tasks as unknown as Task[]);

      // Send WhatsApp message
      if (whatsappToken && whatsappPhoneNumberId && user.phone) {
        try {
          const whatsappResult = await sendWhatsAppMessage(
            whatsappPhoneNumberId,
            whatsappToken,
            user.phone,
            message
          );

          results.push({
            user: user.email,
            success: true,
            tasksCount: tasks.length,
            whatsappSent: true,
            messageId: whatsappResult.messageId,
          });

          console.log(`WhatsApp sent successfully to ${user.email}`);
        } catch (whatsappError: any) {
          console.error(`Error sending WhatsApp to ${user.email}:`, whatsappError);
          results.push({
            user: user.email,
            success: false,
            tasksCount: tasks.length,
            whatsappSent: false,
            error: whatsappError.message || "Unknown error",
          });
        }
      } else {
        // Simulation mode (no WhatsApp credentials)
        console.log(`SIMULATION MODE - Would send to ${user.phone}:`);
        console.log(message);
        
        results.push({
          user: user.email,
          success: true,
          tasksCount: tasks.length,
          whatsappSent: false,
          simulationMode: true,
          message: message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        usersProcessed: users.length,
        results: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in daily-tasks-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function formatTasksMessage(user: User, tasks: Task[]): string {
  const userName = user.full_name || user.email.split("@")[0];
  const greeting = `Bom dia, ${userName}! 👋\n\n`;
  const header = `📋 *Tarefas para hoje (${new Date().toISOString().split('T')[0]})*\n\n`;
  
  let message = greeting + header;

  // Group by priority
  const highPriority = tasks.filter(t => t.priority === "high");
  const mediumPriority = tasks.filter(t => t.priority === "medium");
  const lowPriority = tasks.filter(t => t.priority === "low");

  if (highPriority.length > 0) {
    message += "🔴 *ALTA PRIORIDADE:*\n";
    highPriority.forEach((task, index) => {
      message += formatTask(task, index + 1);
    });
    message += "\n";
  }

  if (mediumPriority.length > 0) {
    message += "🟡 *MÉDIA PRIORIDADE:*\n";
    mediumPriority.forEach((task, index) => {
      message += formatTask(task, index + 1);
    });
    message += "\n";
  }

  if (lowPriority.length > 0) {
    message += "🟢 *BAIXA PRIORIDADE:*\n";
    lowPriority.forEach((task, index) => {
      message += formatTask(task, index + 1);
    });
  }

  message += `\n✨ Total: *${tasks.length} tarefa${tasks.length > 1 ? "s" : ""}*`;
  message += "\n\nBom trabalho! 💪";

  return message;
}

function formatTask(task: Task, index: number): string {
  let line = `${index}. *${task.title}*`;
  
  if (task.due_time) {
    line += ` (${task.due_time})`;
  }

  // Add related entity (lead or contact)
  if (task.leads?.name) {
    line += `\n   👤 ${task.leads.name}`;
  } else if (task.contacts?.name) {
    line += `\n   👤 ${task.contacts.name}`;
  }

  if (task.description) {
    const shortDesc = task.description.length > 60 
      ? task.description.substring(0, 60) + "..." 
      : task.description;
    line += `\n   📝 ${shortDesc}`;
  }

  line += "\n\n";
  return line;
}

async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  recipientPhone: string,
  message: string
): Promise<{ messageId: string }> {
  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = recipientPhone.replace(/[\s\-\(\)]/g, "");
  
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "text",
      text: {
        body: message,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return { messageId: data.messages[0].id };
}
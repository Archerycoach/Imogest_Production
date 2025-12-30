import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";

// Export types
export type ImportResult = {
  success: number;
  errors: any[];
  total?: number;
};

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];

export const parseExcelFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const importLeads = async (data: any[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const leadsToInsert: LeadInsert[] = [];
  const errors: any[] = [];

  for (const row of data) {
    try {
      // Basic mapping for V2 schema
      const lead: LeadInsert = {
        user_id: user.id,
        name: row.name || row.Nome || "Sem Nome",
        email: row.email || row.Email || null,
        phone: row.phone || row.Telefone || null,
        notes: row.notes || row.Notas || null,
        lead_type: (row.lead_type || row.Tipo || "buyer").toLowerCase() as "buyer" | "seller" | "both",
        status: (row.status || row.Estado || "new").toLowerCase() as "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost",
        budget: row.budget,
        // Removed property_type
        // Location and typology removed for V2 compatibility
      };

      // Validate required fields
      if (!lead.name) {
        throw new Error("Nome é obrigatório");
      }

      leadsToInsert.push(lead as any); // Cast to any
    } catch (error: any) {
      errors.push({ row, error: error.message });
    }
  }

  if (leadsToInsert.length > 0) {
    const { error } = await supabase.from("leads").insert(leadsToInsert);
    if (error) throw error;
  }

  return { success: leadsToInsert.length, errors };
};

export const importProperties = async (data: any[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const propertiesToInsert: PropertyInsert[] = [];
  const errors: any[] = [];

  for (const row of data) {
    try {
      const property: PropertyInsert = {
        title: row.title || `Imóvel - ${new Date().toLocaleDateString()}`,
        description: row.description || "",
        address: row.address || "",
        city: row.city || "",
        postal_code: row.postal_code || "",
        price: row.price ? Number(row.price) : 0,
        area: row.area ? Number(row.area) : 0,
        bathrooms: row.bathrooms ? Number(row.bathrooms) : 0,
        bedrooms: row.bedrooms ? Number(row.bedrooms) : 0,
        status: "available",
        property_type: (row.property_type || "apartment") as any, // Added property_type
        user_id: user.id
      };

      if (!property.title) throw new Error("Título é obrigatório");

      propertiesToInsert.push(property);
    } catch (error: any) {
      errors.push({ row, error: error.message });
    }
  }

  if (propertiesToInsert.length > 0) {
    const { error } = await supabase.from("properties").insert(propertiesToInsert);
    if (error) throw error;
  }

  return { success: propertiesToInsert.length, errors };
};

// Aliases for backward compatibility
export const importLeadsFromExcel = importLeads;

// Template Generators
export const generateLeadsTemplate = () => {
  const headers = [
    "Nome", "Email", "Telefone", "Tipo (comprador/vendedor)", 
    "Estado", "Orcamento", "Localizacao", "Notas"
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Leads");
  XLSX.writeFile(wb, "template_leads_imogest.xlsx");
};

export const generatePropertiesTemplate = () => {
  const headers = [
    "Titulo", "Descricao", "Preco", "Tipo", "Estado", 
    "Area", "Quartos", "Casas de Banho", "Morada", "Cidade"
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Imoveis");
  XLSX.writeFile(wb, "template_imoveis_imogest.xlsx");
};
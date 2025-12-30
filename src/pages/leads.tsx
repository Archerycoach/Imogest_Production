import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadsList } from "@/components/leads/LeadsList";
import {
  getAllLeads,
  deleteLead,
  type LeadWithContacts,
} from "@/services/leadsService";
import { getCurrentUser } from "@/services/authService";
import { Layout } from "@/components/Layout";

export default function Leads() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<LeadWithContacts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithContacts | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/login");
    }
  };

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      const data = await getAllLeads();
      setLeads(data);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar este lead?")) return;

    try {
      await deleteLead(id);
      await loadLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Erro ao eliminar lead. Tente novamente.");
    }
  };

  const handleEdit = (lead: LeadWithContacts) => {
    setEditingLead(lead);
    setShowForm(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">A verificar autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout title="Leads">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
              <p className="text-gray-600 mt-1">Gerir potenciais clientes</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-5 w-5 mr-2" />
              Nova Lead
            </Button>
          </div>

          {showForm && (
            <LeadForm
              initialData={editingLead || undefined}
              onSuccess={async () => {
                setShowForm(false);
                setEditingLead(null);
                await loadLeads();
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingLead(null);
              }}
            />
          )}

          {!showForm && (
            <LeadsList
              leads={leads}
              onEdit={handleEdit}
              onDelete={handleDeleteLead}
              isLoading={isLoading}
              onConvertSuccess={loadLeads}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
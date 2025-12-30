import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { LeadForm } from "@/components/leads/LeadForm";
import { PipelineStats } from "@/components/pipeline/PipelineStats";
import {
  getLeads,
  updateLeadStatus,
  type LeadWithDetails,
} from "@/services/leadsService";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Pipeline() {
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithDetails | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      const data = await getLeads();
      // Cast to LeadWithDetails[] as the service returns Lead[] but we need extra fields if available
      // In a real scenario, we might want to fetch full details
      setLeads(data as unknown as LeadWithDetails[]);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadMove = async (leadId: string, newStatus: string) => {
    // Optimistic update
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus as any } : lead
      )
    );

    try {
      await updateLeadStatus(leadId, newStatus);
    } catch (error) {
      console.error("Error updating lead status:", error);
      // Revert on error
      loadLeads();
    }
  };

  const handleEditLead = (lead: LeadWithDetails) => {
    setEditingLead(lead);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLead(null);
    loadLeads();
  };

  return (
    <Layout title="Pipeline">
      <div className="h-[calc(100vh-4rem)] p-6 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pipeline</h1>
            <p className="text-gray-600">Gestão visual de oportunidades</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-5 w-5 mr-2" />
            Nova Lead
          </Button>
        </div>

        <PipelineStats leads={leads} />

        <div className="flex-1 overflow-x-auto min-h-0">
          <PipelineBoard
            leads={leads}
            onLeadMove={handleLeadMove}
            onLeadClick={handleEditLead}
            isLoading={isLoading}
          />
        </div>

        {showForm && (
          <LeadForm
            initialData={editingLead || undefined}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingLead(null);
            }}
          />
        )}
      </div>
    </Layout>
  );
}
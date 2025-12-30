import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { LeadForm } from "@/components/leads/LeadForm";
import { PipelineStats } from "@/components/pipeline/PipelineStats";
import {
  getLeads,
  updateLeadStatus,
  deleteLead,
  type LeadWithDetails,
} from "@/services/leadsService";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LeadType } from "@/types";

export default function Pipeline() {
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithDetails | null>(null);
  const [pipelineView, setPipelineView] = useState<LeadType>("buyer");

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      const data = await getLeads();
      setLeads(data as unknown as LeadWithDetails[]);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadMove = async (leadId: string, newStatus: string) => {
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus as any } : lead
      )
    );

    try {
      await updateLeadStatus(leadId, newStatus);
    } catch (error) {
      console.error("Error updating lead status:", error);
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

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteLead(leadId);
      loadLeads();
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (pipelineView === "buyer") {
      return lead.lead_type === "buyer" || lead.lead_type === "both";
    }
    return lead.lead_type === "seller" || lead.lead_type === "both";
  });

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

        <Tabs value={pipelineView} onValueChange={(value) => setPipelineView(value as LeadType)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="buyer" className="flex items-center gap-2">
              🏠 Compradores
            </TabsTrigger>
            <TabsTrigger value="seller" className="flex items-center gap-2">
              💼 Vendedores
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <PipelineStats leads={filteredLeads} pipelineView={pipelineView} />

        <div className="flex-1 overflow-x-auto min-h-0">
          <PipelineBoard
            leads={filteredLeads}
            onLeadMove={handleLeadMove}
            onLeadClick={handleEditLead}
            onLeadDelete={handleDeleteLead}
            isLoading={isLoading}
            pipelineView={pipelineView}
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
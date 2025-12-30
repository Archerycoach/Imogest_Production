import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { PipelineColumn } from "./PipelineColumn";
import { LeadCard } from "./LeadCard";
import type { LeadWithContacts } from "@/services/leadsService";
import type { LeadType } from "@/types";

interface PipelineBoardProps {
  leads: LeadWithContacts[];
  onLeadMove: (leadId: string, newStatus: string) => void;
  onLeadClick: (lead: LeadWithContacts) => void;
  onLeadDelete?: (leadId: string) => void;
  isLoading?: boolean;
  pipelineView: LeadType;
}

const BUYER_STAGES = [
  { id: "new", title: "Novo Contacto", color: "bg-blue-500" },
  { id: "contacted", title: "Contactado", color: "bg-yellow-500" },
  { id: "qualified", title: "Qualificado", color: "bg-purple-500" },
  { id: "proposal", title: "Proposta", color: "bg-orange-500" },
  { id: "negotiation", title: "Negociação", color: "bg-orange-600" },
  { id: "won", title: "Fechado", color: "bg-green-500" },
  { id: "lost", title: "Perdido", color: "bg-red-500" },
];

const SELLER_STAGES = [
  { id: "new", title: "Novo Contacto", color: "bg-blue-500" },
  { id: "contacted", title: "Avaliação", color: "bg-yellow-500" },
  { id: "qualified", title: "Angariação", color: "bg-purple-500" },
  { id: "proposal", title: "Marketing", color: "bg-orange-500" },
  { id: "negotiation", title: "Negociação", color: "bg-orange-600" },
  { id: "won", title: "Vendido", color: "bg-green-500" },
  { id: "lost", title: "Perdido", color: "bg-red-500" },
];

export function PipelineBoard({ leads, onLeadMove, onLeadClick, onLeadDelete, isLoading, pipelineView }: PipelineBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setIsDragging(false);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    onLeadMove(leadId, newStatus);
  };

  const getLeadsByStage = (stage: string) => {
    return leads.filter((lead) => lead.status === stage);
  };

  const activeLead = activeId ? leads.find((lead) => lead.id === activeId) : null;

  const stages = pipelineView === "buyer" ? BUYER_STAGES : SELLER_STAGES;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 pb-4 overflow-x-auto min-w-full h-full">
        {stages.map((stage) => (
          <div key={stage.id} className="min-w-[300px] max-w-[300px]">
            <PipelineColumn
              id={stage.id}
              title={stage.title}
              color={stage.color}
              leads={getLeadsByStage(stage.id)}
              isDragging={isDragging}
              onLeadClick={onLeadClick}
              onLeadDelete={onLeadDelete}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="opacity-80 rotate-3 cursor-grabbing">
            <LeadCard lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
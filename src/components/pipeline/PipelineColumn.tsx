import { useDroppable } from "@dnd-kit/core";
import { LeadCard } from "./LeadCard";
import type { LeadWithContacts } from "@/services/leadsService";

interface PipelineColumnProps {
  id: string;
  title: string;
  color: string;
  leads: LeadWithContacts[];
  isDragging: boolean;
  onLeadClick: (lead: LeadWithContacts) => void;
  onLeadDelete?: (leadId: string) => void;
}

export function PipelineColumn({
  id,
  title,
  color,
  leads,
  isDragging,
  onLeadClick,
  onLeadDelete,
}: PipelineColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full bg-gray-50 rounded-lg border-2 ${
        isDragging ? "border-purple-400 bg-purple-50" : "border-gray-200"
      }`}
    >
      <div className={`${color} text-white px-4 py-3 rounded-t-lg`}>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs opacity-90">{leads.length} lead{leads.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick(lead)}
            onDelete={onLeadDelete}
          />
        ))}
      </div>
    </div>
  );
}
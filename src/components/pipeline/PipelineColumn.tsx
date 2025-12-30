import { useDroppable } from "@dnd-kit/core";
import { LeadCard } from "./LeadCard";
import type { LeadWithContacts } from "@/services/leadsService";

interface PipelineColumnProps {
  id: string;
  title: string;
  color: string;
  leads: LeadWithContacts[];
  isDragging?: boolean;
  onLeadClick?: (lead: LeadWithContacts) => void;
}

export function PipelineColumn({ id, title, color, leads, isDragging, onLeadClick }: PipelineColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col h-full rounded-lg bg-slate-50 border">
      <div className={`p-3 rounded-t-lg border-b flex items-center gap-2 ${color} bg-opacity-10`}>
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="ml-auto text-xs font-medium bg-white px-2 py-0.5 rounded border">
          {leads.length}
        </span>
      </div>
      
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 min-h-[150px]">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick?.(lead)} />
        ))}
        
        {leads.length === 0 && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed rounded-lg m-2 p-4">
            {isDragging ? "Solte aqui" : "Sem leads"}
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Calendar, Mail, Phone, MessageSquare, FileText, Eye, User, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'note' | 'status_change' | 'document' | 'viewing';
  title: string;
  description?: string;
  created_at: string;
  created_by?: string;
  metadata?: Record<string, any>;
}

interface LeadTimelineProps {
  leadId: string;
}

export function LeadTimeline({ leadId }: LeadTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [leadId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      // Mock data - will be replaced with actual API call
      const mockEvents: TimelineEvent[] = [
        {
          id: '1',
          type: 'email',
          title: 'Email enviado',
          description: 'Apresentação da agência e portfólio de imóveis',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          created_by: 'João Silva',
        },
        {
          id: '2',
          type: 'call',
          title: 'Chamada telefónica',
          description: 'Duração: 15 minutos. Discutido orçamento e preferências.',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          created_by: 'João Silva',
        },
        {
          id: '3',
          type: 'status_change',
          title: 'Mudança de status',
          description: 'De "Novo" para "Contactado"',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          created_by: 'Sistema',
        },
        {
          id: '4',
          type: 'meeting',
          title: 'Reunião agendada',
          description: 'Visita ao imóvel - Rua das Flores, 123',
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          created_by: 'João Silva',
        },
        {
          id: '5',
          type: 'note',
          title: 'Nota adicionada',
          description: 'Cliente muito interessado, orçamento confirmado até 300k',
          created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          created_by: 'João Silva',
        },
      ];
      setEvents(mockEvents);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'note':
        return <FileText className="h-4 w-4" />;
      case 'status_change':
        return <CheckCircle className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'viewing':
        return <Eye className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'call':
        return 'bg-green-500';
      case 'email':
        return 'bg-blue-500';
      case 'whatsapp':
        return 'bg-green-600';
      case 'meeting':
        return 'bg-purple-500';
      case 'note':
        return 'bg-yellow-500';
      case 'status_change':
        return 'bg-indigo-500';
      case 'document':
        return 'bg-gray-500';
      case 'viewing':
        return 'bg-pink-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📅 Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📅 Timeline de Atividades</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Events */}
            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${getEventColor(event.type)} text-white shadow-md`}>
                    {getEventIcon(event.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-sm">{event.title}</h4>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatDistanceToNow(new Date(event.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </Badge>
                      </div>
                      {event.created_by && (
                        <p className="text-xs text-gray-500 mt-2">
                          Por: {event.created_by}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
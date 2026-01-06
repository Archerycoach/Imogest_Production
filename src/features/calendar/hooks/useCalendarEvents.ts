import { useState, useEffect, useCallback } from "react";
import { getCalendarEvents } from "@/services/calendarService";
import type { CalendarEvent } from "@/types";

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCalendarEvents();
      
      // Map API response (snake_case) to CalendarEvent interface (camelCase)
      const mappedEvents: CalendarEvent[] = (data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startTime: e.start_time,
        endTime: e.end_time,
        location: e.location,
        attendees: e.attendees || [],
        leadId: e.lead_id,
        propertyId: e.property_id,
        contactId: e.contact_id,
        googleEventId: e.google_event_id,
        googleSynced: e.google_synced,
        eventType: e.event_type,
        createdAt: e.created_at,
        userId: e.user_id
      }));

      setEvents(mappedEvents);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    isLoading,
    error,
    refetch: () => fetchEvents(true),
  };
}
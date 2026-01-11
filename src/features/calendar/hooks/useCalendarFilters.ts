import { useState, useMemo } from "react";
import type { CalendarEvent, Task } from "@/types";

export type ViewMode = "month" | "week" | "day";

export function useCalendarFilters() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [showTasks, setShowTasks] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const filterEventsByDate = (events: CalendarEvent[], date: Date) => {
    console.log("[useCalendarFilters] filterEventsByDate called with:", {
      totalEvents: events.length,
      targetDate: date.toISOString(),
      viewMode
    });

    // Filtrar baseado no viewMode
    if (viewMode === "day") {
      // Day view: apenas eventos do dia exato
      const filtered = events.filter((event) => {
        const eventDate = new Date(event.startTime);
        const match = (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        );
        return match;
      });
      console.log("[useCalendarFilters] Day view filtered:", filtered.length);
      return filtered;
    } else if (viewMode === "week") {
      // Week view: eventos da semana (domingo a sábado)
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      const filtered = events.filter((event) => {
        const eventDate = new Date(event.startTime);
        const match = eventDate >= startOfWeek && eventDate <= endOfWeek;
        return match;
      });
      console.log("[useCalendarFilters] Week view filtered:", {
        startOfWeek: startOfWeek.toISOString(),
        endOfWeek: endOfWeek.toISOString(),
        filtered: filtered.length
      });
      return filtered;
    } else {
      // Month view: eventos do mês inteiro
      const filtered = events.filter((event) => {
        const eventDate = new Date(event.startTime);
        const match = (
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        );
        if (!match && eventDate.getFullYear() === date.getFullYear() && Math.abs(eventDate.getMonth() - date.getMonth()) <= 1) {
          console.log("[useCalendarFilters] Event close to target month:", {
            eventTitle: event.title,
            eventDate: eventDate.toISOString(),
            eventMonth: eventDate.getMonth(),
            targetMonth: date.getMonth()
          });
        }
        return match;
      });
      console.log("[useCalendarFilters] Month view filtered:", {
        targetMonth: date.getMonth(),
        targetYear: date.getFullYear(),
        filtered: filtered.length
      });
      if (filtered.length > 0) {
        console.log("[useCalendarFilters] First 3 filtered events:", filtered.slice(0, 3).map(e => ({
          title: e.title,
          startTime: e.startTime
        })));
      }
      return filtered;
    }
  };

  const filterTasksByDate = (tasks: Task[], date: Date) => {
    // Filtrar baseado no viewMode
    if (viewMode === "day") {
      // Day view: apenas tarefas do dia exato
      return tasks.filter((task) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return (
          taskDate.getDate() === date.getDate() &&
          taskDate.getMonth() === date.getMonth() &&
          taskDate.getFullYear() === date.getFullYear()
        );
      });
    } else if (viewMode === "week") {
      // Week view: tarefas da semana
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return tasks.filter((task) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate >= startOfWeek && taskDate <= endOfWeek;
      });
    } else {
      // Month view: tarefas do mês inteiro
      return tasks.filter((task) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return (
          taskDate.getMonth() === date.getMonth() &&
          taskDate.getFullYear() === date.getFullYear()
        );
      });
    }
  };

  return {
    currentDate,
    viewMode,
    showTasks,
    showEvents,
    setViewMode,
    setShowTasks,
    setShowEvents,
    navigateDate,
    goToToday,
    filterEventsByDate,
    filterTasksByDate,
  };
}
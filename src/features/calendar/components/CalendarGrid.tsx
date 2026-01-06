import React from "react";
import { EventCard } from "./EventCard";
import { TaskCard } from "./TaskCard";
import type { CalendarEvent, Task } from "@/types";

interface CalendarGridProps {
  viewMode: "day" | "week" | "month";
  currentDate: Date;
  events: CalendarEvent[];
  tasks: Task[];
  onEventClick: (event: CalendarEvent) => void;
  onTaskClick: (task: Task) => void;
  onDragStart: (e: React.DragEvent, item: { id: string; type: "event" | "task"; startTime: string }) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetDate: Date) => void;
}

export function CalendarGrid({
  viewMode,
  currentDate,
  events,
  tasks,
  onEventClick,
  onTaskClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: CalendarGridProps) {
  const getEventsForDay = (day: Date) => {
    const startOfDay = new Date(day);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= startOfDay && eventDate <= endOfDay;
    });
  };

  const getTasksForDay = (day: Date) => {
    const startOfDay = new Date(day);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return taskDate >= startOfDay && taskDate <= endOfDay;
    });
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  };

  // Day View
  if (viewMode === "day") {
    const dayEvents = getEventsForDay(currentDate);
    const dayTasks = getTasksForDay(currentDate);
    const allItems = [...dayEvents, ...dayTasks];

    return (
      <div className="space-y-2">
        {allItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Sem eventos para hoje</p>
        ) : (
          allItems.map((item) => {
            const isTask = "status" in item;
            return isTask ? (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => onDragStart(e, { 
                  id: item.id, 
                  type: "task",
                  startTime: item.dueDate || item.createdAt 
                })}
                onDragEnd={onDragEnd}
              >
                <TaskCard 
                  task={item as Task} 
                  onClick={() => onTaskClick(item as Task)}
                />
              </div>
            ) : (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => onDragStart(e, { 
                  id: item.id, 
                  type: "event",
                  startTime: item.startTime 
                })}
                onDragEnd={onDragEnd}
              >
                <EventCard 
                  event={item as CalendarEvent} 
                  onClick={() => onEventClick(item as CalendarEvent)}
                />
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Week View
  if (viewMode === "week") {
    return (
      <div className="grid grid-cols-7 gap-2">
        {getWeekDays().map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const dayTasks = getTasksForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <div 
              key={index} 
              className={`border rounded-lg p-2 min-h-[200px] ${isToday ? "bg-purple-50 border-purple-300" : ""}`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, day)}
            >
              <div className="font-semibold text-sm mb-2">
                {day.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" })}
              </div>
              <div className="space-y-1">
                {dayEvents.map((event) => (
                  <div 
                    key={event.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, { 
                      id: event.id, 
                      type: "event",
                      startTime: event.startTime 
                    })}
                    onDragEnd={onDragEnd}
                    className="text-xs rounded p-1 truncate cursor-move transition-opacity bg-purple-100 hover:bg-purple-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    <div className="font-medium">
                      {new Date(event.startTime).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="truncate">{event.title}</div>
                  </div>
                ))}
                {dayTasks.map((task) => (
                  <div 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, { 
                      id: task.id, 
                      type: "task",
                      startTime: task.dueDate || task.createdAt 
                    })}
                    onDragEnd={onDragEnd}
                    className="text-xs rounded p-1 truncate cursor-move transition-opacity bg-blue-100 hover:bg-blue-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(task);
                    }}
                  >
                    <div className="truncate">{task.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Month View
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {getMonthDays().map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <div
              key={index}
              className={`border rounded-lg p-2 min-h-[100px] ${
                !isCurrentMonth ? "bg-gray-50 text-gray-400" : ""
              } ${isToday ? "bg-purple-50 border-purple-300" : ""}`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, day)}
            >
              <div className="font-semibold text-sm mb-1">
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <div 
                    key={event.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, { 
                      id: event.id, 
                      type: "event",
                      startTime: event.startTime 
                    })}
                    onDragEnd={onDragEnd}
                    className="text-xs rounded p-1 truncate cursor-move transition-opacity bg-purple-100 hover:bg-purple-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayTasks.slice(0, 1).map((task) => (
                  <div 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, { 
                      id: task.id, 
                      type: "task",
                      startTime: task.dueDate || task.createdAt 
                    })}
                    onDragEnd={onDragEnd}
                    className="text-xs rounded p-1 truncate cursor-move transition-opacity bg-blue-100 hover:bg-blue-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(task);
                    }}
                  >
                    {task.title}
                  </div>
                ))}
                {(dayEvents.length + dayTasks.length) > 3 && (
                  <div className="text-xs text-purple-600 font-medium">
                    +{(dayEvents.length + dayTasks.length) - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { PowerSchedule } from '../lib/scheduleEngine';

interface ScheduleContextType {
  schedules: PowerSchedule[];
  activeScheduleId: string | null;
  activeSchedule: PowerSchedule | null;
  setActiveScheduleId: (id: string | null) => void;
  isLoading: boolean;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dbSchedules = useLiveQuery(() => db.schedules.toArray());
  const schedules = dbSchedules || [];
  const isLoading = dbSchedules === undefined;

  const [activeScheduleId, setActiveScheduleIdState] = useState<string | null>(() => {
    return localStorage.getItem('activeScheduleId');
  });

  const setActiveScheduleId = (id: string | null) => {
    setActiveScheduleIdState(id);
    if (id) {
      localStorage.setItem('activeScheduleId', id);
    } else {
      localStorage.removeItem('activeScheduleId');
    }
  };

  // Keep activeScheduleId valid and fall back to first schedule if deleted or unassigned
  useEffect(() => {
    if (schedules.length > 0) {
      if (!activeScheduleId || !schedules.some((s) => s.id === activeScheduleId)) {
        setActiveScheduleId(schedules[0].id);
      }
    } else {
      if (activeScheduleId !== null) {
        setActiveScheduleId(null);
      }
    }
  }, [schedules, activeScheduleId]);

  const activeSchedule = schedules.find((s) => s.id === activeScheduleId) || null;

  return (
    <ScheduleContext.Provider
      value={{
        schedules,
        activeScheduleId,
        activeSchedule,
        setActiveScheduleId,
        isLoading,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedules = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedules must be used within a ScheduleProvider');
  }
  return context;
};

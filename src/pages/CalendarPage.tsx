import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, actualStatusRepository } from '../services/db';
import { useSchedules } from '../context/ScheduleContext';
import { calculateStatus } from '../lib/scheduleEngine';
import { getTodayString, formatDisplayDate, toUTCDate } from '../lib/dates';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface CalendarProps {
  onNavigate: (tab: 'home' | 'calendar' | 'schedules' | 'settings') => void;
}

export const CalendarPage: React.FC<CalendarProps> = ({ onNavigate }) => {
  const { activeSchedule } = useSchedules();
  const todayStr = getTodayString();

  // Calendar View State: Year and Month
  const [currentYear, setCurrentYear] = useState(() => toUTCDate(todayStr).getUTCFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => toUTCDate(todayStr).getUTCMonth() + 1); // 1-indexed

  // Selected Day Modal State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Reactively fetch all actual status records for this schedule
  const actualsList = useLiveQuery(
    async () => {
      if (!activeSchedule) return [];
      return db.actualStatuses.where('scheduleId').equals(activeSchedule.id).toArray();
    },
    [activeSchedule]
  );

  const actualsMap = useMemo(() => {
    const map = new Map<string, 'on' | 'off'>();
    if (actualsList) {
      actualsList.forEach((r) => {
        if (r.status !== 'none') {
          map.set(r.date, r.status);
        }
      });
    }
    return map;
  }, [actualsList]);

  // Generate 42 calendar grid cells (6 rows, 7 columns, starting Monday)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const firstDayWeekday = firstDay.getUTCDay(); // 0 is Sunday, 1 is Monday...
    const daysOffset = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1; // days to show from previous month

    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
    const daysInPrevMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 0)).getUTCDate();

    const cells = [];

    // Prev month trailing days
    for (let i = daysOffset - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = currentMonth === 1 ? 12 : currentMonth - 1;
      const y = currentMonth === 1 ? currentYear - 1 : currentYear;
      cells.push({
        day,
        month: m,
        year: y,
        dateStr: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Next month leading days
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const m = currentMonth === 12 ? 1 : currentMonth + 1;
      const y = currentMonth === 12 ? currentYear + 1 : currentYear;
      cells.push({
        day: i,
        month: m,
        year: y,
        dateStr: `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  // Statistics calculation for the current month
  const stats = useMemo(() => {
    if (!activeSchedule) return null;
    
    // We only calculate stats for cells belonging to the current month
    const currentMonthCells = calendarCells.filter((c) => c.isCurrentMonth);
    
    let expectedOn = 0;
    let expectedOff = 0;
    let actualOn = 0;
    let actualOff = 0;
    let recordedDays = 0;
    let matchedDays = 0;

    currentMonthCells.forEach((c) => {
      const exp = calculateStatus(activeSchedule, c.dateStr).state;
      const act = actualsMap.get(c.dateStr);

      if (exp === 'on') expectedOn++;
      else expectedOff++;

      if (act) {
        recordedDays++;
        if (act === 'on') actualOn++;
        else actualOff++;

        if (act === exp) matchedDays++;
      } else {
        if (exp === 'on') actualOn++;
        else actualOff++;
      }
    });

    const accuracy = recordedDays >= 3 ? Math.round((matchedDays / recordedDays) * 100) : null;

    return {
      expectedOn,
      expectedOff,
      actualOn,
      actualOff,
      recordedDays,
      accuracy,
    };
  }, [activeSchedule, calendarCells, actualsMap]);

  if (!activeSchedule) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <AlertCircle className="text-amber-500 mb-4" size={48} />
        <p className="text-slate-300 font-semibold mb-2">No Active Schedule Selected</p>
        <button
          onClick={() => onNavigate('schedules')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition-colors"
        >
          Select/Create Schedule
        </button>
      </div>
    );
  }

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = toUTCDate(todayStr);
    setCurrentYear(today.getUTCFullYear());
    setCurrentMonth(today.getUTCMonth() + 1);
  };

  // Get selected day details
  const selectedDayDetails = selectedDate
    ? {
        dateStr: selectedDate,
        expected: calculateStatus(activeSchedule, selectedDate),
        actual: actualsMap.get(selectedDate) || 'none',
      }
    : null;

  const handleRecordActual = async (status: 'on' | 'off' | 'none') => {
    if (selectedDate) {
      await actualStatusRepository.record(activeSchedule.id, selectedDate, status);
    }
  };

  const monthName = formatDisplayDate(
    `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
    'month-year'
  );

  return (
    <div className="flex-grow p-6 flex flex-col space-y-5 max-w-full overflow-y-auto pb-24">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{monthName}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Power forecast calendar</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-650 dark:text-slate-450 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleJumpToToday}
            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-[10px] font-semibold rounded-md text-slate-705 dark:text-slate-300 transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-650 dark:text-slate-450 transition-colors"
            title="Next Month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex-shrink-0">
        {calendarCells.map((cell) => {
          const expected = calculateStatus(activeSchedule, cell.dateStr);
          const actual = actualsMap.get(cell.dateStr);
          const isToday = cell.dateStr === todayStr;

          // Resolve display indicator colors
          const isPowerOn = actual ? actual === 'on' : expected.state === 'on';
          const isDeviation = actual !== undefined && actual !== expected.state;

          return (
            <button
              key={cell.dateStr}
              onClick={() => setSelectedDate(cell.dateStr)}
              className={`w-full aspect-[4/3] p-1 flex flex-col justify-between items-center bg-white dark:bg-slate-900 border-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-850 relative ${
                !cell.isCurrentMonth && 'opacity-30 dark:opacity-20 pointer-events-none'
              }`}
            >
              <div className="flex justify-between items-center w-full px-0.5">
                <span className={`text-[10px] font-semibold ${isToday ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                  {cell.day}
                </span>
                {isToday && (
                  <span className="text-[7px] font-bold text-amber-500 dark:text-amber-400">
                    ★
                  </span>
                )}
              </div>

              {/* Status Indicator */}
              <div className="pb-1.5 flex items-center justify-center">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isPowerOn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-650'
                } ${isDeviation ? 'ring-2 ring-white dark:ring-slate-900' : ''}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Calendar Legend */}
      <div className="flex justify-center gap-4 py-1 text-[9px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-tight">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ON
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-650" /> OFF
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-slate-100 dark:ring-slate-900" /> Deviation
        </span>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-4 flex-shrink-0">
          <h3 className="text-xs font-semibold text-slate-850 dark:text-slate-200">
            Monthly Statistics ({monthName})
          </h3>
          <div className="grid grid-cols-2 gap-6 divide-x divide-slate-100 dark:divide-slate-800/80 text-xs">
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase">ON DAYS</div>
              <div className="text-slate-650 dark:text-slate-400">
                Expected: <span className="font-semibold text-slate-850 dark:text-slate-200">{stats.expectedOn}</span>
              </div>
              <div className="text-slate-650 dark:text-slate-400">
                Actually: <span className="font-semibold text-slate-850 dark:text-slate-200">{stats.actualOn}</span>
              </div>
            </div>
            <div className="pl-6 space-y-1">
              <div className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase">OFF DAYS</div>
              <div className="text-slate-650 dark:text-slate-400">
                Expected: <span className="font-semibold text-slate-850 dark:text-slate-200">{stats.expectedOff}</span>
              </div>
              <div className="text-slate-650 dark:text-slate-400">
                Actually: <span className="font-semibold text-slate-850 dark:text-slate-200">{stats.actualOff}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase">Schedule Accuracy</div>
            {stats.accuracy !== null ? (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                stats.accuracy >= 90 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450' :
                stats.accuracy >= 70 ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-605 dark:text-amber-450' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-650 dark:text-rose-455'
              }`}>
                {stats.accuracy}% accuracy
              </span>
            ) : (
              <span className="text-[9px] font-medium text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded">
                Need {3 - stats.recordedDays} more entries
              </span>
            )}
          </div>
        </div>
      )}

      {/* Selected Day Details Overlay Modal */}
      {selectedDayDetails && (
        <div className="fixed inset-0 bg-slate-950/30 dark:bg-slate-950/60 backdrop-blur-[1px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-xs overflow-hidden p-5 space-y-4 animate-in zoom-in-98 duration-150 shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {formatDisplayDate(selectedDayDetails.dateStr, 'short')}
                </h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-tight">
                  {formatDisplayDate(selectedDayDetails.dateStr, 'weekday')}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-750 dark:hover:text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Prediction details */}
            <div className="border border-slate-100 dark:border-slate-800/80 p-3 rounded-lg flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950">
              <span className={`w-1.5 h-1.5 rounded-full ${selectedDayDetails.expected.state === 'on' ? 'bg-emerald-500' : 'bg-slate-350 dark:bg-slate-650'}`} />
              <div className="text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Expected: {selectedDayDetails.expected.state === 'on' ? 'ON' : 'OFF'}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  Day {selectedDayDetails.expected.dayInState} of {selectedDayDetails.expected.totalInState}
                </div>
              </div>
            </div>

            {/* Transitions info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Previous change:</span>
                <span className="font-semibold text-slate-850 dark:text-slate-350">{formatDisplayDate(selectedDayDetails.expected.previousStateChange, 'short')}</span>
              </div>
              <div className="flex justify-between">
                <span>Next change:</span>
                <span className="font-semibold text-slate-850 dark:text-slate-350">{formatDisplayDate(selectedDayDetails.expected.nextStateChange, 'short')}</span>
              </div>
            </div>

            {/* Override status controls */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Log Actual Status
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleRecordActual('on')}
                  className={`py-1.5 rounded-md text-[10px] font-bold border transition-all ${
                    selectedDayDetails.actual === 'on'
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-400'
                  }`}
                >
                  ON
                </button>
                <button
                  onClick={() => handleRecordActual('off')}
                  className={`py-1.5 rounded-md text-[10px] font-bold border transition-all ${
                    selectedDayDetails.actual === 'off'
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-400'
                  }`}
                >
                  OFF
                </button>
                <button
                  onClick={() => handleRecordActual('none')}
                  className={`py-1.5 rounded-md text-[10px] font-bold border transition-all ${
                    selectedDayDetails.actual === 'none'
                      ? 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-850 dark:border-slate-700 dark:text-slate-350'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

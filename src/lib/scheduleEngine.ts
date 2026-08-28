import { getDaysDifference, addDays } from './dates';

export type PowerState = 'on' | 'off';

export interface PowerSchedule {
  id: string;
  name: string;
  description?: string;
  onDays: number;
  offDays: number;
  referenceDate: string; // YYYY-MM-DD
  referenceState: PowerState;
  icon?: string;
  color?: string; // e.g. Tailwind color class name
  notifications: {
    enabled: boolean;
    morningReminder?: boolean;
    eveningReminder?: boolean;
    morningTime?: string; // "07:00"
    eveningTime?: string; // "20:00"
  };
  createdAt: string;
  updatedAt: string;
}

export interface DayStatus {
  date: string; // YYYY-MM-DD
  state: PowerState;
  cyclePosition: number; // 0-indexed position in full cycle
  dayInState: number; // e.g. 2 (as in Day 2 of 3)
  totalInState: number; // e.g. 3
  nextStateChange: string; // YYYY-MM-DD (first day of the next state)
  previousStateChange: string; // YYYY-MM-DD (first day of the current state)
}

/**
 * Standard modulo operation that handles negative numbers correctly.
 */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Validates the parameters of a schedule.
 */
export function validateScheduleParams(onDays: number, offDays: number): void {
  if (!Number.isInteger(onDays) || onDays <= 0) {
    throw new Error('ON days must be a positive integer.');
  }
  if (!Number.isInteger(offDays) || offDays <= 0) {
    throw new Error('OFF days must be a positive integer.');
  }
}

/**
 * Calculates the power status of a schedule for a specific target date string (YYYY-MM-DD).
 */
export function calculateStatus(schedule: PowerSchedule, targetDateStr: string): DayStatus {
  const { onDays, offDays, referenceDate, referenceState } = schedule;
  validateScheduleParams(onDays, offDays);

  const cycleLength = onDays + offDays;
  const daysDiff = getDaysDifference(referenceDate, targetDateStr);
  const cyclePosition = mod(daysDiff, cycleLength);

  let state: PowerState;
  let dayInState: number;
  let totalInState: number;

  if (referenceState === 'on') {
    // Cycle pattern: [ON ... ON] [OFF ... OFF]
    // Indices [0, onDays-1] are ON, [onDays, cycleLength-1] are OFF.
    if (cyclePosition < onDays) {
      state = 'on';
      dayInState = cyclePosition + 1;
      totalInState = onDays;
    } else {
      state = 'off';
      dayInState = cyclePosition - onDays + 1;
      totalInState = offDays;
    }
  } else {
    // Cycle pattern: [OFF ... OFF] [ON ... ON]
    // Indices [0, offDays-1] are OFF, [offDays, cycleLength-1] are ON.
    if (cyclePosition < offDays) {
      state = 'off';
      dayInState = cyclePosition + 1;
      totalInState = offDays;
    } else {
      state = 'on';
      dayInState = cyclePosition - offDays + 1;
      totalInState = onDays;
    }
  }

  // Calculate start of current state (previousStateChange)
  // Which is (dayInState - 1) days before the target date.
  const previousStateChange = addDays(targetDateStr, -(dayInState - 1));

  // Calculate start of next state (nextStateChange)
  // Which is (totalInState - dayInState + 1) days after the target date.
  const daysToNext = totalInState - dayInState + 1;
  const nextStateChange = addDays(targetDateStr, daysToNext);

  return {
    date: targetDateStr,
    state,
    cyclePosition,
    dayInState,
    totalInState,
    nextStateChange,
    previousStateChange,
  };
}

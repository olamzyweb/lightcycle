import { describe, it, expect } from 'vitest';
import { toUTCDate, getDaysDifference, addDays, formatDisplayDate } from './dates';
import { calculateStatus } from './scheduleEngine';
import type { PowerSchedule } from './scheduleEngine';

describe('Date Utilities', () => {
  it('should parse valid date strings correctly', () => {
    const date = toUTCDate('2026-08-28');
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(7); // 0-based index
    expect(date.getUTCDate()).toBe(28);
  });

  it('should throw on invalid date string format', () => {
    expect(() => toUTCDate('28-08-2026')).toThrow();
    expect(() => toUTCDate('2026-13-01')).toThrow(); // Invalid month
    expect(() => toUTCDate('2026-02-30')).toThrow(); // Invalid day in Feb
  });

  it('should calculate days difference correctly', () => {
    expect(getDaysDifference('2026-08-28', '2026-08-28')).toBe(0);
    expect(getDaysDifference('2026-08-28', '2026-08-29')).toBe(1);
    expect(getDaysDifference('2026-08-28', '2026-08-27')).toBe(-1);
    expect(getDaysDifference('2025-12-31', '2026-01-01')).toBe(1); // Year boundary
  });

  it('should add days correctly', () => {
    expect(addDays('2026-08-28', 3)).toBe('2026-08-31');
    expect(addDays('2026-08-28', -3)).toBe('2026-08-25');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01'); // Non-leap year
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // Leap year
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
  });

  it('should format display dates correctly using UTC', () => {
    expect(formatDisplayDate('2026-08-28', 'long')).toBe('Friday, August 28, 2026');
    expect(formatDisplayDate('2026-08-28', 'short')).toBe('Aug 28, 2026');
    expect(formatDisplayDate('2026-08-28', 'weekday')).toBe('Friday');
  });
});

describe('Schedule Engine', () => {
  const mockSchedule3On1Off: PowerSchedule = {
    id: 'test-1',
    name: 'Home',
    onDays: 3,
    offDays: 1,
    referenceDate: '2026-08-28',
    referenceState: 'on',
    notifications: { enabled: false },
    createdAt: '',
    updatedAt: ''
  };

  it('should calculate basic 3 ON / 1 OFF schedule correctly (forward)', () => {
    // Reference date (2026-08-28) -> ON Day 1 of 3
    let status = calculateStatus(mockSchedule3On1Off, '2026-08-28');
    expect(status.state).toBe('on');
    expect(status.dayInState).toBe(1);
    expect(status.totalInState).toBe(3);
    expect(status.previousStateChange).toBe('2026-08-28');
    expect(status.nextStateChange).toBe('2026-08-31');

    // 2026-08-29 -> ON Day 2 of 3
    status = calculateStatus(mockSchedule3On1Off, '2026-08-29');
    expect(status.state).toBe('on');
    expect(status.dayInState).toBe(2);
    expect(status.previousStateChange).toBe('2026-08-28');
    expect(status.nextStateChange).toBe('2026-08-31');

    // 2026-08-30 -> ON Day 3 of 3
    status = calculateStatus(mockSchedule3On1Off, '2026-08-30');
    expect(status.state).toBe('on');
    expect(status.dayInState).toBe(3);
    expect(status.previousStateChange).toBe('2026-08-28');
    expect(status.nextStateChange).toBe('2026-08-31');

    // 2026-08-31 -> OFF Day 1 of 1
    status = calculateStatus(mockSchedule3On1Off, '2026-08-31');
    expect(status.state).toBe('off');
    expect(status.dayInState).toBe(1);
    expect(status.totalInState).toBe(1);
    expect(status.previousStateChange).toBe('2026-08-31');
    expect(status.nextStateChange).toBe('2026-09-01');

    // 2026-09-01 -> ON Day 1 of 3 (new cycle)
    status = calculateStatus(mockSchedule3On1Off, '2026-09-01');
    expect(status.state).toBe('on');
    expect(status.dayInState).toBe(1);
  });

  it('should calculate backwards correctly', () => {
    // 2026-08-27 -> OFF Day 1 of 1 (the day before reference date)
    let status = calculateStatus(mockSchedule3On1Off, '2026-08-27');
    expect(status.state).toBe('off');
    expect(status.dayInState).toBe(1);
    expect(status.totalInState).toBe(1);

    // 2026-08-26 -> ON Day 3 of 3
    status = calculateStatus(mockSchedule3On1Off, '2026-08-26');
    expect(status.state).toBe('on');
    expect(status.dayInState).toBe(3);

    // 2026-08-24 -> ON Day 1 of 3
    status = calculateStatus(mockSchedule3On1Off, '2026-08-24');
    expect(status.state).toBe('on');
    expect(status.dayInState).toBe(1);
  });

  it('should validate invalid values', () => {
    const invalidSchedule = { ...mockSchedule3On1Off, onDays: 0 };
    expect(() => calculateStatus(invalidSchedule, '2026-08-28')).toThrow();
  });
});

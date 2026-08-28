import { getTodayString, addDays } from './dates';
import { calculateStatus } from './scheduleEngine';
import type { PowerSchedule } from './scheduleEngine';

/**
 * Generates an iCalendar (.ics) string containing daily reminder events
 * for the active schedule over the next N days.
 */
export function generateICS(schedule: PowerSchedule, daysCount = 180): string {
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//LightCycle//NONSGML Power Calendar//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');

  const todayStr = getTodayString();
  
  const morningEnabled = !!schedule.notifications?.morningReminder;
  const morningTime = schedule.notifications?.morningTime || '07:00';
  const [morningHour, morningMin] = morningTime.split(':').map(Number);
  
  const eveningEnabled = !!schedule.notifications?.eveningReminder;
  const eveningTime = schedule.notifications?.eveningTime || '20:00';
  const [eveningHour, eveningMin] = eveningTime.split(':').map(Number);

  // Format YYYYMMDDTHHMMSS (Floating Local Time)
  const formatICSDate = (dateStr: string, hour: number, min: number): string => {
    const cleanDate = dateStr.replace(/-/g, '');
    const hh = String(hour).padStart(2, '0');
    const mm = String(min).padStart(2, '0');
    return `${cleanDate}T${hh}${mm}00`;
  };

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (let i = 0; i < daysCount; i++) {
    const currentDateStr = addDays(todayStr, i);
    const tomorrowDateStr = addDays(todayStr, i + 1);

    // 1. Morning Reminder Event (Today's status)
    if (morningEnabled) {
      const status = calculateStatus(schedule, currentDateStr);
      const displayState = status.state.toUpperCase();
      const dtStart = formatICSDate(currentDateStr, morningHour, morningMin);
      const dtEnd = formatICSDate(currentDateStr, morningHour + 1, morningMin);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:morning_${schedule.id}_${currentDateStr}`);
      lines.push(`DTSTAMP:${nowStamp}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:LightCycle: Power is ${displayState} Today`);
      lines.push(`DESCRIPTION:Today is Day ${status.dayInState} of ${status.totalInState} (${displayState} cycle)`);
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:Reminder');
      lines.push('TRIGGER:-PT0M');
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    }

    // 2. Evening Reminder Event (Tomorrow's status)
    if (eveningEnabled) {
      const statusTomorrow = calculateStatus(schedule, tomorrowDateStr);
      const displayStateTomorrow = statusTomorrow.state.toUpperCase();
      const dtStart = formatICSDate(currentDateStr, eveningHour, eveningMin);
      const dtEnd = formatICSDate(currentDateStr, eveningHour + 1, eveningMin);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:evening_${schedule.id}_${currentDateStr}`);
      lines.push(`DTSTAMP:${nowStamp}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:LightCycle: Power is ${displayStateTomorrow} Tomorrow`);
      lines.push(`DESCRIPTION:Tomorrow is predicted to be ${displayStateTomorrow} (Day ${statusTomorrow.dayInState} of ${statusTomorrow.totalInState} in cycle)`);
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:Reminder');
      lines.push('TRIGGER:-PT0M');
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

import { getTodayString, addDays } from '../lib/dates';
import { calculateStatus } from '../lib/scheduleEngine';
import { actualStatusRepository } from './db';
import type { PowerSchedule } from '../lib/scheduleEngine';

let schedulerInterval: number | null = null;
let currentSchedule: PowerSchedule | null = null;

async function checkAndTriggerNotifications() {
  if (!currentSchedule || !currentSchedule.notifications?.enabled) return;

  // Verify that permissions are granted before continuing
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const todayStr = getTodayString();
  const now = new Date();
  
  // Format current local time as "HH:MM"
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const notifs = currentSchedule.notifications;

  // 1. Morning Reminder (Today's status)
  if (notifs.morningReminder && notifs.morningTime === currentHHMM) {
    const lastSentDate = localStorage.getItem(`last_morning_notif_${currentSchedule.id}`);
    if (lastSentDate !== todayStr) {
      const expectedStatus = calculateStatus(currentSchedule, todayStr);
      const actualRecord = await actualStatusRepository.get(currentSchedule.id, todayStr);
      const actualState = actualRecord ? actualRecord.status : 'none';
      const displayState = actualState === 'none' ? expectedStatus.state : actualState;

      const title = `Power is ${displayState.toUpperCase()} Today`;
      const body = `Schedule: ${currentSchedule.name}\nExpected to be ${displayState.toUpperCase()} (Day ${expectedStatus.dayInState} of ${expectedStatus.totalInState} in cycle)`;
      
      await triggerNotification(title, body);
      localStorage.setItem(`last_morning_notif_${currentSchedule.id}`, todayStr);
    }
  }

  // 2. Evening Reminder (Tomorrow's status)
  if (notifs.eveningReminder && notifs.eveningTime === currentHHMM) {
    const lastSentDate = localStorage.getItem(`last_evening_notif_${currentSchedule.id}`);
    if (lastSentDate !== todayStr) {
      const tomorrowStr = addDays(todayStr, 1);
      const expectedStatusTomorrow = calculateStatus(currentSchedule, tomorrowStr);

      const actualRecordTomorrow = await actualStatusRepository.get(currentSchedule.id, tomorrowStr);
      const actualStateTomorrow = actualRecordTomorrow ? actualRecordTomorrow.status : 'none';
      const displayStateTomorrow = actualStateTomorrow === 'none' ? expectedStatusTomorrow.state : actualStateTomorrow;

      const title = `Power is ${displayStateTomorrow.toUpperCase()} Tomorrow`;
      const body = `Schedule: ${currentSchedule.name}\nTomorrow is predicted to be ${displayStateTomorrow.toUpperCase()} (Day ${expectedStatusTomorrow.dayInState} of ${expectedStatusTomorrow.totalInState} in cycle)`;

      await triggerNotification(title, body);
      localStorage.setItem(`last_evening_notif_${currentSchedule.id}`, todayStr);
    }
  }
}

async function triggerNotification(title: string, body: string) {
  const options = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'lightcycle-reminder',
    renotify: true,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  } catch (err) {
    console.error('Failed to trigger notification:', err);
    new Notification(title, options);
  }
}

// Progressive Enhancement: Schedule local OS alarms using the Experimental Web Notification Triggers API.
// Allows notification alarms to fire offline even when browser is closed.
async function scheduleSWReminders(schedule: PowerSchedule) {
  if (!('Notification' in window) || !('showTrigger' in Notification.prototype)) {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    
    // Clear any previously scheduled notifications using this prefix to avoid duplicates.
    const activeNotifications = await reg.getNotifications();
    for (const notif of activeNotifications) {
      if (notif.tag && (notif.tag.startsWith('lightcycle-morning-') || notif.tag.startsWith('lightcycle-evening-'))) {
        notif.close();
      }
    }

    if (!schedule.notifications?.enabled) return;

    const todayStr = getTodayString();

    // Schedule reminders for the next 7 days
    for (let i = 0; i < 7; i++) {
      const targetDateStr = addDays(todayStr, i);
      const tomorrowDateStr = addDays(todayStr, i + 1);

      // Morning Trigger (Today's status)
      if (schedule.notifications.morningReminder && schedule.notifications.morningTime) {
        const [hour, min] = schedule.notifications.morningTime.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + i);
        targetDate.setHours(hour, min, 0, 0);

        if (targetDate.getTime() > Date.now()) {
          const expectedStatus = calculateStatus(schedule, targetDateStr);
          const stateStr = expectedStatus.state.toUpperCase();
          
          await (reg as any).showNotification(`Power is ${stateStr} Today`, {
            body: `Schedule: ${schedule.name}\nExpected to be ${stateStr} (Day ${expectedStatus.dayInState} of ${expectedStatus.totalInState})`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `lightcycle-morning-${targetDateStr}`,
            showTrigger: new (window as any).TimestampTrigger(targetDate.getTime())
          });
        }
      }

      // Evening Trigger (Tomorrow's status)
      if (schedule.notifications.eveningReminder && schedule.notifications.eveningTime) {
        const [hour, min] = schedule.notifications.eveningTime.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + i);
        targetDate.setHours(hour, min, 0, 0);

        if (targetDate.getTime() > Date.now()) {
          const expectedStatusTomorrow = calculateStatus(schedule, tomorrowDateStr);
          const stateStrTomorrow = expectedStatusTomorrow.state.toUpperCase();

          await (reg as any).showNotification(`Power is ${stateStrTomorrow} Tomorrow`, {
            body: `Schedule: ${schedule.name}\nTomorrow is predicted to be ${stateStrTomorrow} (Day ${expectedStatusTomorrow.dayInState} of ${expectedStatusTomorrow.totalInState})`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `lightcycle-evening-${targetDateStr}`,
            showTrigger: new (window as any).TimestampTrigger(targetDate.getTime())
          });
        }
      }
    }
  } catch (err) {
    console.warn('Notification Trigger scheduling failed:', err);
  }
}

export const notificationScheduler = {
  start(schedule: PowerSchedule) {
    currentSchedule = schedule;
    
    // Pre-schedule offline notifications via Service Worker triggers
    scheduleSWReminders(schedule);

    // Initial check
    checkAndTriggerNotifications();

    if (schedulerInterval !== null) {
      clearInterval(schedulerInterval);
    }

    // Active polling reminder check every 30 seconds
    schedulerInterval = window.setInterval(() => {
      checkAndTriggerNotifications();
    }, 30000);
  },

  stop() {
    if (schedulerInterval !== null) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
    currentSchedule = null;
  }
};

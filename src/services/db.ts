import Dexie, { type Table } from 'dexie';
import type { PowerSchedule } from '../lib/scheduleEngine';

export interface ActualStatusRecord {
  id: string; // Format: `${scheduleId}_${date}`
  scheduleId: string;
  date: string; // YYYY-MM-DD
  status: 'on' | 'off' | 'none';
}

class LightCycleDB extends Dexie {
  schedules!: Table<PowerSchedule>;
  actualStatuses!: Table<ActualStatusRecord>;

  constructor() {
    super('LightCycleDatabase');
    this.version(1).stores({
      schedules: 'id',
      actualStatuses: 'id, scheduleId, date, [scheduleId+date]',
    });
  }
}

export const db = new LightCycleDB();

// ----------------------------------------------------
// Schedule Repository Implementation
// ----------------------------------------------------
export const scheduleRepository = {
  async create(schedule: PowerSchedule): Promise<string> {
    await db.schedules.add(schedule);
    return schedule.id;
  },

  async get(id: string): Promise<PowerSchedule | undefined> {
    return db.schedules.get(id);
  },

  async getAll(): Promise<PowerSchedule[]> {
    return db.schedules.toArray();
  },

  async update(id: string, changes: Partial<PowerSchedule>): Promise<void> {
    await db.schedules.update(id, changes);
  },

  async delete(id: string): Promise<void> {
    // Transactional deletion of schedule and its associated actual statuses
    await db.transaction('rw', [db.schedules, db.actualStatuses], async () => {
      await db.schedules.delete(id);
      await db.actualStatuses.where('scheduleId').equals(id).delete();
    });
  },
};

// ----------------------------------------------------
// Actual Status Repository Implementation
// ----------------------------------------------------
export const actualStatusRepository = {
  async record(scheduleId: string, date: string, status: 'on' | 'off' | 'none'): Promise<string> {
    const id = `${scheduleId}_${date}`;
    if (status === 'none') {
      await db.actualStatuses.delete(id);
    } else {
      await db.actualStatuses.put({
        id,
        scheduleId,
        date,
        status,
      });
    }
    return id;
  },

  async get(scheduleId: string, date: string): Promise<ActualStatusRecord | undefined> {
    const id = `${scheduleId}_${date}`;
    return db.actualStatuses.get(id);
  },

  async getAllForSchedule(scheduleId: string): Promise<ActualStatusRecord[]> {
    return db.actualStatuses.where('scheduleId').equals(scheduleId).toArray();
  },

  /**
   * Returns recorded actual statuses for a given schedule during a specific month.
   * yearMonthStr format: YYYY-MM
   */
  async getForMonth(scheduleId: string, yearMonthStr: string): Promise<ActualStatusRecord[]> {
    return db.actualStatuses
      .where('[scheduleId+date]')
      .between([scheduleId, `${yearMonthStr}-01`], [scheduleId, `${yearMonthStr}-31\xff`], true, true)
      .toArray();
  },

  async clearAllData(): Promise<void> {
    await db.transaction('rw', [db.schedules, db.actualStatuses], async () => {
      await db.schedules.clear();
      await db.actualStatuses.clear();
    });
    localStorage.clear(); // Clear local active schedule and preferences
  },
};

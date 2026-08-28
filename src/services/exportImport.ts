import { db } from './db';
import type { PowerSchedule } from '../lib/scheduleEngine';
import type { ActualStatusRecord } from './db';

interface BackupData {
  app: 'LightCycle';
  version: number;
  exportedAt: string;
  schedules: PowerSchedule[];
  actualStatuses: ActualStatusRecord[];
}

/**
 * Exports all database records into a single versioned JSON file.
 */
export async function exportDatabase(): Promise<void> {
  const schedules = await db.schedules.toArray();
  const actualStatuses = await db.actualStatuses.toArray();

  const backup: BackupData = {
    app: 'LightCycle',
    version: 1,
    exportedAt: new Date().toISOString(),
    schedules,
    actualStatuses,
  };

  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  const timestamp = new Date().toISOString().slice(0, 10);
  link.download = `lightcycle-backup-${timestamp}.json`;
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and imports records from a JSON file string.
 * Overwrites existing local data on success.
 */
export async function importDatabase(jsonStr: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = JSON.parse(jsonStr);

    // Validate backup format
    if (data.app !== 'LightCycle') {
      return { success: false, error: 'The selected file is not a valid LightCycle backup.' };
    }
    if (typeof data.version !== 'number' || data.version < 1) {
      return { success: false, error: 'Unsupported backup version.' };
    }
    if (!Array.isArray(data.schedules) || !Array.isArray(data.actualStatuses)) {
      return { success: false, error: 'Backup structure is corrupt.' };
    }

    // Secondary validation on individual records
    for (const s of data.schedules) {
      if (!s.id || !s.name || typeof s.onDays !== 'number' || typeof s.offDays !== 'number' || !s.referenceDate) {
        return { success: false, error: 'One or more schedules contain corrupt parameters.' };
      }
    }

    for (const a of data.actualStatuses) {
      if (!a.id || !a.scheduleId || !a.date || !a.status) {
        return { success: false, error: 'One or more logs contain corrupt data.' };
      }
    }

    // Overwrite tables inside a transaction
    await db.transaction('rw', [db.schedules, db.actualStatuses], async () => {
      await db.schedules.clear();
      await db.actualStatuses.clear();
      
      if (data.schedules.length > 0) {
        await db.schedules.bulkAdd(data.schedules);
      }
      if (data.actualStatuses.length > 0) {
        await db.actualStatuses.bulkAdd(data.actualStatuses);
      }
    });

    // Seed active schedule ID if we imported schedules
    if (data.schedules.length > 0) {
      localStorage.setItem('activeScheduleId', data.schedules[0].id);
    } else {
      localStorage.removeItem('activeScheduleId');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Malformed JSON content.' };
  }
}

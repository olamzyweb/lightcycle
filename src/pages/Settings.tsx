import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSchedules } from '../context/ScheduleContext';
import { scheduleRepository, actualStatusRepository } from '../services/db';
import { exportDatabase, importDatabase } from '../services/exportImport';
import { Moon, Sun, Monitor, Download, Upload, Trash2, AlertCircle, Info } from 'lucide-react';
import { notificationScheduler } from '../services/notificationScheduler';

interface SettingsProps {
  installPrompt?: any;
  isInstalled?: boolean;
  onInstallApp?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ installPrompt, isInstalled, onInstallApp }) => {
  const { theme, setTheme } = useTheme();
  const { activeSchedule } = useSchedules();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const [notificationSupport, setNotificationSupport] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // Notification form states
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [morningReminder, setMorningReminder] = useState(false);
  const [morningTime, setMorningTime] = useState('07:00');
  const [eveningReminder, setEveningReminder] = useState(false);
  const [eveningTime, setEveningTime] = useState('20:00');

  // Database Action states
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationSupport(true);
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Update notification form values when active schedule changes
  useEffect(() => {
    if (activeSchedule) {
      const notifs = activeSchedule.notifications || {
        enabled: false,
        morningReminder: false,
        eveningReminder: false,
        morningTime: '07:00',
        eveningTime: '20:00',
      };
      setNotifEnabled(!!notifs.enabled);
      setMorningReminder(!!notifs.morningReminder);
      setMorningTime(notifs.morningTime || '07:00');
      setEveningReminder(!!notifs.eveningReminder);
      setEveningTime(notifs.eveningTime || '20:00');
    }
  }, [activeSchedule]);

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  const handleSaveNotifications = async () => {
    if (!activeSchedule) return;
    try {
      const updatedNotifications = {
        enabled: notifEnabled,
        morningReminder,
        eveningReminder,
        morningTime,
        eveningTime,
      };

      await scheduleRepository.update(activeSchedule.id, {
        notifications: updatedNotifications,
      });

      // Restart scheduler immediately with new preferences
      notificationScheduler.start({
        ...activeSchedule,
        notifications: updatedNotifications,
      });

      setBackupStatus({ type: 'success', message: 'Notification preferences saved!' });
      setTimeout(() => setBackupStatus(null), 3000);
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: err.message || 'Failed to save notifications.' });
    }
  };

  const handleTestNotification = () => {
    if (!notificationSupport || notificationPermission !== 'granted') {
      alert('Notification permissions are required to test.');
      return;
    }
    
    // Fire test notification immediately
    new Notification('LightCycle Test Notification ⚡', {
      body: 'Notifications are configured correctly on this device!',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png'
    });
  };

  const handleExport = async () => {
    try {
      await exportDatabase();
      setBackupStatus({ type: 'success', message: 'Backup JSON downloaded successfully.' });
      setTimeout(() => setBackupStatus(null), 3000);
    } catch (err: any) {
      setBackupStatus({ type: 'error', message: err.message || 'Failed to export backup.' });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importDatabase(content);
      if (res.success) {
        setBackupStatus({ type: 'success', message: 'Backup restored successfully! Refreshing...' });
        setTimeout(() => {
          setBackupStatus(null);
          window.location.reload();
        }, 1500);
      } else {
        setBackupStatus({ type: 'error', message: res.error || 'Import failed.' });
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = async () => {
    await actualStatusRepository.clearAllData();
    setClearConfirm(false);
    setBackupStatus({ type: 'success', message: 'All local data has been wiped.' });
    setTimeout(() => {
      setBackupStatus(null);
      window.location.reload();
    }, 1500);
  };  return (
    <div className="flex-grow p-6 space-y-6 max-w-full overflow-y-auto pb-24">
      {/* Title Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Preferences, backups, and configurations</p>
      </div>

      {backupStatus && (
        <div className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
          backupStatus.type === 'success'
            ? 'bg-emerald-55/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-55/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}>
          <Info size={14} />
          <span>{backupStatus.message}</span>
        </div>
      )}

      {/* Theme / Appearance */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-3">
        <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Appearance</h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setTheme('light')}
            className={`py-2.5 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
              theme === 'light'
                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 font-bold'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700'
            }`}
          >
            <Sun size={14} />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`py-2.5 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-955'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700'
            }`}
          >
            <Moon size={14} />
            Dark
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`py-2.5 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
              theme === 'system'
                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-955'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700'
            }`}
          >
            <Monitor size={14} />
            System
          </button>
        </div>
      </div>

      {/* Local Notifications Configurations */}
      {activeSchedule && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="text-xs font-semibold text-slate-850 dark:text-slate-200">
              Notifications ({activeSchedule.name})
            </h2>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                !notificationSupport ? 'bg-red-500' :
                notificationPermission === 'granted' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              <span className="text-[9px] text-slate-450 dark:text-slate-500 font-bold uppercase">
                {!notificationSupport ? 'Unsupported' : notificationPermission}
              </span>
            </div>
          </div>

          {/* Web notification status check */}
          {!notificationSupport ? (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/10 border border-rose-105 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] rounded-lg flex gap-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>
                Web Notifications are not supported by your current browser. Local background scheduling is unavailable.
              </span>
            </div>
          ) : notificationPermission !== 'granted' ? (
            <div className="p-3 bg-amber-55/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] rounded-lg space-y-2">
              <div className="flex gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>Notification permission is required to trigger local reminders.</span>
              </div>
              <button
                onClick={handleRequestPermission}
                className="w-full py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold rounded transition-colors"
              >
                Allow Device Notifications
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-slate-800 dark:text-slate-350">
              {/* iOS platform warning */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-slate-550 dark:text-slate-450 text-[10px] rounded-lg flex gap-2">
                <Info size={14} className="flex-shrink-0 text-amber-550 dark:text-amber-500" />
                <span>
                  Safari does not support background scheduling when the app is closed. Reminders work best on Android or desktop devices.
                </span>
              </div>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Enable Notifications</span>
                <input
                  type="checkbox"
                  checked={notifEnabled}
                  onChange={(e) => setNotifEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 accent-slate-900 dark:accent-white"
                />
              </div>

              {/* Morning Reminder options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Morning Reminder (Today)</span>
                  <input
                    type="checkbox"
                    disabled={!notifEnabled}
                    checked={morningReminder}
                    onChange={(e) => setMorningReminder(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 accent-slate-900 dark:accent-white disabled:opacity-40"
                  />
                </div>
                {morningReminder && notifEnabled && (
                  <input
                    type="time"
                    value={morningTime}
                    onChange={(e) => setMorningTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg text-xs text-slate-800 dark:text-slate-300 outline-none focus:border-slate-400"
                  />
                )}
              </div>

              {/* Evening Reminder options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Evening Reminder (Tomorrow)</span>
                  <input
                    type="checkbox"
                    disabled={!notifEnabled}
                    checked={eveningReminder}
                    onChange={(e) => setEveningReminder(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 accent-slate-900 dark:accent-white disabled:opacity-40"
                  />
                </div>
                {eveningReminder && notifEnabled && (
                  <input
                    type="time"
                    value={eveningTime}
                    onChange={(e) => setEveningTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg text-xs text-slate-800 dark:text-slate-300 outline-none focus:border-slate-400"
                  />
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveNotifications}
                  className="flex-grow py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-semibold rounded-lg transition-colors"
                >
                  Save Settings
                </button>
                <button
                  onClick={handleTestNotification}
                  className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  Test Notif
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Backup and restore */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-4">
        <h2 className="text-xs font-semibold text-slate-850 dark:text-slate-200">Data Portability</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-750 dark:bg-slate-850 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-250 text-xs font-semibold rounded-lg transition-colors"
          >
            <Download size={13} />
            Export Backup
          </button>
          <label className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-755 dark:bg-slate-850 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-250 text-xs font-semibold rounded-lg transition-colors cursor-pointer">
            <Upload size={13} />
            Import Backup
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-[10px] text-slate-400 text-center leading-normal">
          Exporting produces a JSON file containing all schedules and calendar logs to restore on other devices.
        </p>
      </div>

      {/* Destructive Clear Data options */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-4">
        <h2 className="text-xs font-semibold text-rose-600 dark:text-rose-450">Danger Zone</h2>
        
        {!clearConfirm ? (
          <button
            onClick={() => setClearConfirm(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-rose-50 hover:bg-rose-100/60 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            Clear All Application Data
          </button>
        ) : (
          <div className="space-y-3 p-4 border border-rose-200 dark:border-rose-900/20 bg-rose-50/50 dark:bg-rose-950/10 rounded-lg text-center">
            <p className="text-xs font-bold text-red-650 dark:text-red-400">Are you absolutely sure?</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
              This will permanently delete all schedules, actual statuses, overrides, and configurations. There is no undo.
            </p>
            <div className="flex gap-2 justify-center pt-1.5">
              <button
                onClick={handleClearAll}
                className="px-4 py-1.5 bg-red-650 hover:bg-red-600 text-white text-[10px] font-bold rounded-md"
              >
                Yes, Clear All
              </button>
              <button
                onClick={() => setClearConfirm(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 text-[10px] font-bold rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PWA Installation Section */}
      {!isInstalled && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-3">
          <h2 className="text-xs font-semibold text-slate-850 dark:text-slate-200">Installation</h2>
          {installPrompt ? (
            <button
              onClick={onInstallApp}
              className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Install LightCycle PWA
            </button>
          ) : isIOS ? (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-550 dark:text-slate-450 text-[10px] rounded-lg leading-normal">
              <strong>iOS Installation:</strong> Tap Share ⎙ and select <strong>'Add to Home Screen'</strong> to install LightCycle for offline tracking.
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 text-center leading-normal">
              PWA is already installed or runs inside your browser frame. Use the browser menu to install if available.
            </p>
          )}
        </div>
      )}

      {/* About Box */}
      <div className="text-center space-y-1 pt-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">LightCycle</div>
        <div className="text-[9px] text-slate-450">Offline Power Schedule Tracker</div>
        <div className="text-[9px] text-slate-500">Version 1.0.0 (Local Only)</div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { useSchedules } from '../context/ScheduleContext';
import { calculateStatus } from '../lib/scheduleEngine';
import type { PowerSchedule, PowerState } from '../lib/scheduleEngine';
import { scheduleRepository } from '../services/db';
import { getTodayString } from '../lib/dates';
import { Zap, Home as HomeIcon, Briefcase, Heart, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';

const ICONS = {
  home: HomeIcon,
  office: Briefcase,
  family: Heart,
  general: Zap,
};

const COLORS = [
  { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-600', border: 'border-emerald-600', text: 'text-emerald-400', ring: 'focus:ring-emerald-500' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-600', border: 'border-blue-600', text: 'text-blue-400', ring: 'focus:ring-blue-500' },
  { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-600', border: 'border-indigo-600', text: 'text-indigo-400', ring: 'focus:ring-indigo-500' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-600', border: 'border-amber-600', text: 'text-amber-400', ring: 'focus:ring-amber-500' },
  { name: 'Rose', value: 'rose', bg: 'bg-rose-600', border: 'border-rose-600', text: 'text-rose-400', ring: 'focus:ring-rose-500' },
];

export const Schedules: React.FC = () => {
  const { schedules, activeScheduleId, setActiveScheduleId } = useSchedules();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<PowerSchedule | null>(null);
  const [resettingSchedule, setResettingSchedule] = useState<PowerSchedule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form State (Shared for Add / Edit)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [onDays, setOnDays] = useState(3);
  const [offDays, setOffDays] = useState(1);
  const [referenceDate, setReferenceDate] = useState(getTodayString());
  const [referenceState, setReferenceState] = useState<PowerState>('on');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof ICONS>('home');
  const [selectedColor, setSelectedColor] = useState('emerald');

  // Reset State
  const [resetDate, setResetDate] = useState(getTodayString());
  const [resetState, setResetState] = useState<PowerState>('on');

  const todayStr = getTodayString();

  const handleOpenAdd = () => {
    setName('');
    setDescription('');
    setOnDays(3);
    setOffDays(1);
    setReferenceDate(getTodayString());
    setReferenceState('on');
    setSelectedIcon('home');
    setSelectedColor('emerald');
    setError('');
    setIsAdding(true);
  };

  const handleOpenEdit = (s: PowerSchedule) => {
    setName(s.name);
    setDescription(s.description || '');
    setOnDays(s.onDays);
    setOffDays(s.offDays);
    setReferenceDate(s.referenceDate);
    setReferenceState(s.referenceState);
    setSelectedIcon(s.icon as keyof typeof ICONS || 'general');
    setSelectedColor(s.color || 'emerald');
    setError('');
    setEditingSchedule(s);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (onDays <= 0 || offDays <= 0) {
      setError('Days must be greater than 0');
      return;
    }

    if (isAdding) {
      const newSchedule: PowerSchedule = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim() || undefined,
        onDays,
        offDays,
        referenceDate,
        referenceState,
        icon: selectedIcon,
        color: selectedColor,
        notifications: {
          enabled: false,
          morningReminder: false,
          eveningReminder: false,
          morningTime: '07:00',
          eveningTime: '20:00',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await scheduleRepository.create(newSchedule);
      setIsAdding(false);
    } else if (editingSchedule) {
      await scheduleRepository.update(editingSchedule.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        onDays,
        offDays,
        referenceDate,
        referenceState,
        icon: selectedIcon,
        color: selectedColor,
        updatedAt: new Date().toISOString(),
      });
      setEditingSchedule(null);
    }
  };

  const handleDelete = async (id: string) => {
    await scheduleRepository.delete(id);
    setDeleteConfirmId(null);
  };

  const handleResetReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingSchedule) return;

    await scheduleRepository.update(resettingSchedule.id, {
      referenceDate: resetDate,
      referenceState: resetState,
      updatedAt: new Date().toISOString(),
    });
    setResettingSchedule(null);
  };

  // Helper for color styles
  const colorMap: Record<string, { text: string; bg: string; border: string }> = {
    emerald: { text: 'text-emerald-500 dark:text-emerald-450', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-100 dark:border-emerald-900/40' },
    blue: { text: 'text-blue-500 dark:text-blue-450', bg: 'bg-blue-55/10 dark:bg-blue-950/20', border: 'border-blue-100 dark:border-blue-900/40' },
    indigo: { text: 'text-indigo-500 dark:text-indigo-450', bg: 'bg-indigo-55/10 dark:bg-indigo-950/20', border: 'border-indigo-100 dark:border-indigo-900/40' },
    amber: { text: 'text-amber-600 dark:text-amber-450', bg: 'bg-amber-55/10 dark:bg-amber-950/20', border: 'border-amber-100 dark:border-amber-900/40' },
    rose: { text: 'text-rose-500 dark:text-rose-450', bg: 'bg-rose-55/10 dark:bg-rose-950/20', border: 'border-rose-100 dark:border-rose-900/40' },
  };

  return (
    <div className="flex-grow p-6 space-y-6 max-w-full overflow-y-auto pb-24">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Schedules</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage power schedules & tracking references</p>
        </div>
        {!isAdding && !editingSchedule && !resettingSchedule && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-805 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-semibold rounded-lg transition-colors active:scale-[0.98]"
          >
            <Plus size={14} />
            Create
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-red-650 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-500/20 rounded-lg">
          {error}
        </div>
      )}

      {/* Adding / Editing Schedule Form */}
      {(isAdding || editingSchedule) && (
        <form onSubmit={handleSave} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-5 rounded-xl space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {isAdding ? 'Create New Schedule' : `Edit ${editingSchedule?.name}`}
          </h2>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Schedule Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home, Office"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Rotational neighborhood cycle"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">ON Days</label>
              <input
                type="number"
                min="1"
                required
                value={onDays}
                onChange={(e) => setOnDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">OFF Days</label>
              <input
                type="number"
                min="1"
                required
                value={offDays}
                onChange={(e) => setOffDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-550 dark:text-slate-400 mb-1">Reference Date</label>
            <input
              type="date"
              required
              value={referenceDate}
              onChange={(e) => setReferenceDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-550 dark:text-slate-400 mb-2">Power Status on Reference Date</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReferenceState('on')}
                className={`py-2 rounded-lg font-semibold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                  referenceState === 'on'
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-955'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Power ON
              </button>
              <button
                type="button"
                onClick={() => setReferenceState('off')}
                className={`py-2 rounded-lg font-semibold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                  referenceState === 'off'
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-955'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-450'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Power OFF
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-550 dark:text-slate-400 mb-2">Icon</label>
            <div className="flex gap-2">
              {Object.entries(ICONS).map(([key, IconComponent]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedIcon(key as keyof typeof ICONS)}
                  className={`p-2.5 rounded-lg border transition-colors ${
                    selectedIcon === key
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-350 dark:border-slate-700 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <IconComponent size={14} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-550 dark:text-slate-400 mb-2">Theme Color</label>
            <div className="flex gap-2.5">
              {COLORS.map((col) => (
                <button
                  key={col.value}
                  type="button"
                  onClick={() => setSelectedColor(col.value)}
                  className={`w-5 h-5 rounded-full ${col.bg} transition-transform ${
                    selectedColor === col.value ? 'ring-2 ring-slate-400 dark:ring-slate-100 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-grow py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-semibold rounded-lg transition-colors"
            >
              Save Schedule
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingSchedule(null);
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-850 dark:border-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reset Schedule Reference Form */}
      {resettingSchedule && (
        <form onSubmit={handleResetReference} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 p-5 rounded-xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reset Reference Point</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Align schedule predictions starting from a known date. This will correct calculations going forward.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-550 dark:text-slate-400 mb-1">New Reference Date</label>
            <input
              type="date"
              required
              value={resetDate}
              onChange={(e) => setResetDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-550 dark:text-slate-400 mb-2">Actual Status on Date</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResetState('on')}
                className={`py-2 rounded-lg font-semibold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                  resetState === 'on'
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-955'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Power ON
              </button>
              <button
                type="button"
                onClick={() => setResetState('off')}
                className={`py-2 rounded-lg font-semibold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                  resetState === 'off'
                    ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-955'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Power OFF
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-grow py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-bold rounded-lg transition-colors"
            >
              Recalculate Predictor
            </button>
            <button
              type="button"
              onClick={() => setResettingSchedule(null)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-850 dark:border-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Schedules List */}
      {!isAdding && !editingSchedule && !resettingSchedule && (
        <div className="space-y-3">
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs animate-pulse">No schedules yet. Create one!</div>
          ) : (
            schedules.map((s) => {
              const SIcon = ICONS[s.icon as keyof typeof ICONS] || Zap;
              const status = calculateStatus(s, todayStr);
              const isActive = s.id === activeScheduleId;
              const styles = colorMap[s.color || 'emerald'] || colorMap.emerald;

              return (
                <div
                  key={s.id}
                  onClick={() => setActiveScheduleId(s.id)}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer relative flex flex-col justify-between ${
                    isActive
                      ? `bg-slate-50 border-slate-300 dark:bg-slate-950 dark:border-slate-800`
                      : 'bg-white dark:bg-slate-900/30 border-slate-150 dark:border-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${styles.bg} ${styles.text} flex-shrink-0`}>
                        <SIcon size={14} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-850 dark:text-slate-200 text-xs flex items-center gap-1.5">
                          {s.name}
                          {isActive && (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-bold uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        {s.description && (
                          <div className="text-[10px] text-slate-450 dark:text-slate-500 font-medium max-w-[180px] truncate mt-0.5">
                            {s.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(s);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-850 rounded transition-colors"
                        title="Edit schedule details"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setResettingSchedule(s);
                          setResetDate(todayStr);
                          setResetState(status.state);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:text-amber-500 dark:hover:bg-slate-850 rounded transition-colors"
                        title="Reset/align calendar predictions"
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(s.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:text-red-450 dark:hover:bg-slate-850 rounded transition-colors"
                        title="Delete schedule"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-150 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    <div className="text-slate-450 dark:text-slate-500 font-medium uppercase text-[9px] tracking-wider">
                      Cycle: {s.onDays} ON / {s.offDays} OFF
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${status.state === 'on' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-650'}`} />
                      <span className="font-semibold text-slate-650 dark:text-slate-350">
                        {status.state === 'on' ? 'ON' : 'OFF'} Day {status.dayInState}/{status.totalInState}
                      </span>
                    </div>
                  </div>

                  {/* Absolute double-delete confirmation overlay */}
                  {deleteConfirmId === s.id && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 border border-red-200 dark:border-red-500/20 rounded-lg p-3 flex flex-col justify-center items-center text-center z-20 space-y-2 animate-in fade-in duration-100">
                      <div className="text-[11px] font-bold text-red-650 dark:text-red-400">Delete this schedule?</div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 max-w-[180px]">This will wipe out all past actual logs. Cannot be undone.</p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(s.id);
                          }}
                          className="px-3 py-1 bg-red-650 hover:bg-red-600 text-white text-[10px] font-bold rounded transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 dark:bg-slate-850 dark:border-slate-700 dark:text-slate-350 text-[10px] font-bold rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

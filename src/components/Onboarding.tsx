import React, { useState } from 'react';
import { Zap, Home, Briefcase, Heart, Plus } from 'lucide-react';
import { getTodayString } from '../lib/dates';
import type { PowerSchedule, PowerState } from '../lib/scheduleEngine';
import { scheduleRepository } from '../services/db';

interface OnboardingProps {
  onScheduleCreated: () => void;
}

const ICONS = {
  home: Home,
  office: Briefcase,
  family: Heart,
  general: Zap,
};

const COLORS = [
  { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-600', border: 'border-emerald-600', text: 'text-emerald-400' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-600', border: 'border-blue-600', text: 'text-blue-400' },
  { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-600', border: 'border-indigo-600', text: 'text-indigo-400' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-600', border: 'border-amber-600', text: 'text-amber-400' },
  { name: 'Rose', value: 'rose', bg: 'bg-rose-600', border: 'border-rose-600', text: 'text-rose-400' },
];

export const Onboarding: React.FC<OnboardingProps> = ({ onScheduleCreated }) => {
  const [showCustomForm, setShowCustomForm] = useState(false);
  
  // Custom Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [onDays, setOnDays] = useState(3);
  const [offDays, setOffDays] = useState(1);
  const [referenceDate, setReferenceDate] = useState(getTodayString());
  const [referenceState, setReferenceState] = useState<PowerState>('on');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof ICONS>('home');
  const [selectedColor, setSelectedColor] = useState('emerald');
  const [error, setError] = useState('');

  const handleCreateTemplate = async (onD: number, offD: number, label: string) => {
    const today = getTodayString();
    const newSchedule: PowerSchedule = {
      id: crypto.randomUUID(),
      name: label,
      description: `Default ${onD} ON / ${offD} OFF schedule`,
      onDays: onD,
      offDays: offD,
      referenceDate: today,
      referenceState: 'on',
      icon: 'general',
      color: 'emerald',
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

    try {
      await scheduleRepository.create(newSchedule);
      onScheduleCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule');
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Schedule name is required');
      return;
    }
    if (onDays <= 0 || offDays <= 0) {
      setError('ON and OFF days must be greater than 0');
      return;
    }

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

    try {
      await scheduleRepository.create(newSchedule);
      onScheduleCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center my-auto">
      <h1 className="text-xl font-bold text-slate-805 dark:text-slate-100 mb-2">
        Welcome to LightCycle
      </h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6 text-xs leading-normal">
        Track recurring electricity and power availability schedules offline. Create your first schedule to get started.
      </p>

      {error && (
        <div className="w-full max-w-sm p-3 mb-4 text-xs font-medium text-red-650 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-500/20 rounded-lg">
          {error}
        </div>
      )}

      {!showCustomForm ? (
        <div className="w-full max-w-sm space-y-3">
          <div className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase text-left mb-1">
            Popular Templates
          </div>
          
          <button
            onClick={() => handleCreateTemplate(3, 1, 'Home (3 ON / 1 OFF)')}
            className="flex items-center justify-between w-full p-3.5 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg transition-colors group"
          >
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-205 group-hover:text-emerald-500">3 Days ON / 1 Day OFF</div>
              <div className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">Common residential rotational cycle</div>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-650 group-hover:bg-emerald-500 transition-colors" />
          </button>

          <button
            onClick={() => handleCreateTemplate(2, 2, 'Office (2 ON / 2 OFF)')}
            className="flex items-center justify-between w-full p-3.5 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg transition-colors group"
          >
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-205 group-hover:text-emerald-500">2 Days ON / 2 Days OFF</div>
              <div className="text-[10px] text-slate-455 dark:text-slate-500 mt-0.5">Equally split load shedding schedule</div>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-650 group-hover:bg-emerald-500 transition-colors" />
          </button>

          <button
            onClick={() => handleCreateTemplate(1, 1, 'Apartment (1 ON / 1 OFF)')}
            className="flex items-center justify-between w-full p-3.5 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg transition-colors group"
          >
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-205 group-hover:text-emerald-500">1 Day ON / 1 Day OFF</div>
              <div className="text-[10px] text-slate-455 dark:text-slate-500 mt-0.5">Alternating day power cycle</div>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-slate-650 group-hover:bg-emerald-500 transition-colors" />
          </button>

          <div className="relative my-4 flex py-1 items-center">
            <div className="flex-grow border-t border-slate-100 dark:border-slate-850"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase">or</span>
            <div className="flex-grow border-t border-slate-100 dark:border-slate-850"></div>
          </div>

          <button
            onClick={() => setShowCustomForm(true)}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus size={14} />
            Create Custom Schedule
          </button>
        </div>
      ) : (
        <form onSubmit={handleCustomSubmit} className="w-full max-w-sm text-left bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-5 rounded-lg space-y-4">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Custom Setup</h2>
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Back
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Schedule Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home, Office"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-950 placeholder-slate-400 dark:text-slate-200 text-xs outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Generator backup active"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-955 placeholder-slate-400 dark:text-slate-200 text-xs outline-none focus:border-slate-400 transition-colors"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-950 dark:text-slate-200 text-xs outline-none focus:border-slate-400"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-950 dark:text-slate-200 text-xs outline-none focus:border-slate-400"
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
              className="w-full px-3 py-2 bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-950 dark:text-slate-200 text-xs outline-none focus:border-slate-400"
            />
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-normal">
              A past or present date where you knew the power status.
            </p>
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
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-450'
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
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-450'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Power OFF
              </button>
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-550 dark:text-slate-405 mb-2">Icon</label>
            <div className="flex gap-2">
              {Object.entries(ICONS).map(([key, IconComponent]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedIcon(key as keyof typeof ICONS)}
                  className={`p-2.5 rounded-lg border transition-colors ${
                    selectedIcon === key
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-350 dark:border-slate-700 text-slate-900 dark:text-white'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-850'
                  }`}
                >
                  <IconComponent size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-555 dark:text-slate-405 mb-2">Theme Color</label>
            <div className="flex gap-2.5">
              {COLORS.map((col) => (
                <button
                  key={col.value}
                  type="button"
                  onClick={() => setSelectedColor(col.value)}
                  className={`w-5 h-5 rounded-full ${col.bg} transition-transform ${
                    selectedColor === col.value ? 'ring-2 ring-slate-400 dark:ring-slate-100 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={col.name}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 mt-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            Save Schedule
          </button>
        </form>
      )}
    </div>
  );
};

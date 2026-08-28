import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, actualStatusRepository } from '../services/db';
import { useSchedules } from '../context/ScheduleContext';
import { calculateStatus } from '../lib/scheduleEngine';
import { getTodayString, formatDisplayDate, addDays } from '../lib/dates';
import { Zap, Home as HomeIcon, Briefcase, Heart, Settings, ChevronDown, Calendar, AlertTriangle, Power } from 'lucide-react';

interface HomeProps {
  onNavigate: (tab: 'home' | 'calendar' | 'schedules' | 'settings') => void;
  installPrompt?: any;
  onInstallApp?: () => void;
}

const ICONS = {
  home: HomeIcon,
  office: Briefcase,
  family: Heart,
  general: Zap,
};

export const Home: React.FC<HomeProps> = ({ onNavigate, installPrompt, onInstallApp }) => {
  const { schedules, activeSchedule, setActiveScheduleId } = useSchedules();
  const [showSelector, setShowSelector] = useState(false);
  const todayStr = getTodayString();

  // Reactively fetch today's actual status override from Dexie
  const todayActual = useLiveQuery(
    async () => {
      if (!activeSchedule) return undefined;
      return db.actualStatuses.get(`${activeSchedule.id}_${todayStr}`);
    },
    [activeSchedule, todayStr]
  );

  if (!activeSchedule) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <AlertTriangle className="text-amber-500 mb-4" size={48} />
        <p className="text-slate-600 dark:text-slate-300 font-semibold mb-2">No Active Schedule</p>
        <button
          onClick={() => onNavigate('schedules')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
        >
          Manage Schedules
        </button>
      </div>
    );
  }

  // Calculate status from the schedule engine
  const expectedStatus = calculateStatus(activeSchedule, todayStr);
  const tomorrowStatus = calculateStatus(activeSchedule, addDays(todayStr, 1));
  const ScheduleIcon = ICONS[activeSchedule.icon as keyof typeof ICONS] || Zap;

  // Determine current active reality (expected vs overridden)
  const currentActualState = todayActual?.status || 'none';
  const displayState = currentActualState !== 'none' ? currentActualState : expectedStatus.state;
  const isOverridden = currentActualState !== 'none' && currentActualState !== expectedStatus.state;

  const handleToggleActual = async (status: 'on' | 'off' | 'none') => {
    await actualStatusRepository.record(activeSchedule.id, todayStr, status);
  };

  // Setup theme-based accent classes
  const colorMap: Record<string, { bg: string; text: string; fill: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-950/20', text: 'text-emerald-500 dark:text-emerald-400', fill: 'fill-emerald-500', border: 'border-emerald-500/20' },
    blue: { bg: 'bg-blue-500/10 dark:bg-blue-950/20', text: 'text-blue-500 dark:text-blue-400', fill: 'fill-blue-500', border: 'border-blue-500/20' },
    indigo: { bg: 'bg-indigo-500/10 dark:bg-indigo-950/20', text: 'text-indigo-500 dark:text-indigo-400', fill: 'fill-indigo-500', border: 'border-indigo-500/20' },
    amber: { bg: 'bg-amber-500/10 dark:bg-amber-950/20', text: 'text-amber-500 dark:text-amber-400', fill: 'fill-amber-500', border: 'border-amber-500/20' },
    rose: { bg: 'bg-rose-500/10 dark:bg-rose-950/20', text: 'text-rose-500 dark:text-rose-400', fill: 'fill-rose-500', border: 'border-rose-500/20' },
  };

  const activeColor = colorMap[activeSchedule.color || 'emerald'] || colorMap.emerald;

  return (
    <div className="flex-grow flex flex-col p-6 space-y-6 overflow-y-auto pb-24">
      {/* Header Switcher */}
      <div className="flex items-center justify-between relative flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg font-medium text-xs transition-colors text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 active:scale-[0.98]"
          >
            <ScheduleIcon size={14} className={activeColor.text} />
            <span>{activeSchedule.name}</span>
            <ChevronDown size={12} className="text-slate-400 dark:text-slate-500" />
          </button>

          {showSelector && (
            <div className="absolute top-9 left-0 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="p-1.5 space-y-0.5">
                <div className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase px-2.5 py-1">Switch Schedule</div>
                {schedules.map((s) => {
                  const SIcon = ICONS[s.icon as keyof typeof ICONS] || Zap;
                  const itemColor = colorMap[s.color || 'emerald'] || colorMap.emerald;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveScheduleId(s.id);
                        setShowSelector(false);
                      }}
                      className={`flex items-center justify-between w-full p-2.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-left transition-colors text-xs ${
                        s.id === activeSchedule.id ? 'bg-slate-50 dark:bg-slate-850/60 font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <SIcon size={14} className={itemColor.text} />
                        <div>
                          <div>{s.name}</div>
                          <div className="text-[9px] text-slate-400 dark:text-slate-500">{s.onDays} ON / {s.offDays} OFF</div>
                        </div>
                      </div>
                      <span className={`w-1.5 h-1.5 rounded-full ${calculateStatus(s, todayStr).state === 'on' ? 'bg-emerald-500' : 'bg-slate-350 dark:bg-slate-650'}`} />
                    </button>
                  );
                })}
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => {
                    setShowSelector(false);
                    onNavigate('schedules');
                  }}
                  className="w-full py-2 text-center bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 text-[10px] font-semibold rounded-md transition-colors"
                >
                  + Add & Manage Schedules
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate('settings')}
          className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Install App Banner */}
      {installPrompt && (
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800/80 p-3 rounded-lg flex items-center justify-between text-xs flex-shrink-0 animate-in fade-in duration-200">
          <div className="flex-grow pr-2 text-left">
            <span className="font-semibold text-slate-800 dark:text-white">Install LightCycle PWA</span>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5 leading-normal">Add to home screen for offline access and timely notifications.</p>
          </div>
          <button
            onClick={onInstallApp}
            className="px-2.5 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-[10px] font-bold rounded-lg transition-colors flex-shrink-0 cursor-pointer"
          >
            Install
          </button>
        </div>
      )}

      {/* Date Display */}
      <div className="flex-shrink-0">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Today</div>
        <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{formatDisplayDate(todayStr, 'long')}</div>
      </div>

      {/* Main Status Block */}
      <div className="flex flex-col items-center justify-center p-6 border border-slate-100 dark:border-slate-800/80 rounded-xl bg-slate-50 dark:bg-slate-950 text-center relative overflow-hidden flex-shrink-0">
        <div className="relative flex items-center justify-center mb-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${
            displayState === 'on' ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-550'
          }`}>
            <Power size={32} className={displayState === 'off' ? 'rotate-180' : ''} />
          </div>
        </div>

        <h2 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100 mb-1">
          {displayState === 'on' ? 'Power ON' : 'Power OFF'}
        </h2>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {displayState === expectedStatus.state ? (
            `Day ${expectedStatus.dayInState} of ${expectedStatus.totalInState} (${expectedStatus.state.toUpperCase()} cycle)`
          ) : (
            <span className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-1 justify-center">
              ⚠️ Manually Overridden to {displayState.toUpperCase()}
            </span>
          )}
        </p>

        {isOverridden && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            Expected: {expectedStatus.state.toUpperCase()} Day {expectedStatus.dayInState}/{expectedStatus.totalInState}
          </p>
        )}
      </div>

      {/* Forecast & State Transitions Row */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 flex-shrink-0">
        <div className="grid grid-cols-2 gap-6 divide-x divide-slate-100 dark:divide-slate-800/80">
          <div>
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">Tomorrow</div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className={`w-1.5 h-1.5 rounded-full ${tomorrowStatus.state === 'on' ? 'bg-emerald-500' : 'bg-slate-350 dark:bg-slate-650'}`} />
              <span>{tomorrowStatus.state === 'on' ? 'Power ON' : 'Power OFF'}</span>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Day {tomorrowStatus.dayInState} of {tomorrowStatus.totalInState}
            </div>
          </div>
          <div className="pl-6">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-1">
              Next {expectedStatus.state === 'on' ? 'OFF' : 'ON'} Transition
            </div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {formatDisplayDate(expectedStatus.nextStateChange, 'short')}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {formatDisplayDate(expectedStatus.nextStateChange, 'weekday')}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reality Override / Status Correction */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 flex flex-col space-y-3 flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Is this prediction accurate?</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Mark manual override if the schedule is currently deviating.</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleToggleActual('on')}
            className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
              currentActualState === 'on'
                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700'
            }`}
          >
            ON
          </button>
          <button
            onClick={() => handleToggleActual('off')}
            className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
              currentActualState === 'off'
                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700'
            }`}
          >
            OFF
          </button>
          <button
            onClick={() => handleToggleActual('none')}
            className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
              currentActualState === 'none'
                ? 'bg-slate-100 border-slate-200 text-slate-750 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-350 dark:hover:border-slate-700'
            }`}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Navigation Shortcut to Calendar */}
      <button
        onClick={() => onNavigate('calendar')}
        className="flex items-center justify-center gap-1.5 w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-200 font-semibold rounded-lg transition-colors border border-slate-200 dark:border-slate-800/80 flex-shrink-0 text-xs"
      >
        <Calendar size={14} />
        View Calendar logs
      </button>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ThemeProvider } from './context/ThemeContext';
import { ScheduleProvider, useSchedules } from './context/ScheduleContext';
import { Onboarding } from './components/Onboarding';
import { Home } from './pages/Home';
import { CalendarPage } from './pages/CalendarPage';
import { Schedules } from './pages/Schedules';
import { Settings } from './pages/Settings';
import { Home as HomeIcon, Calendar as CalendarIcon, Sliders, Settings as SettingsIcon } from 'lucide-react';
import { notificationScheduler } from './services/notificationScheduler';

const AppContent: React.FC = () => {
  const { schedules, isLoading, activeSchedule } = useSchedules();
  const [currentTab, setCurrentTab] = useState<'home' | 'calendar' | 'schedules' | 'settings'>('home');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Register PWA Service Worker with HMR/prompts
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker Registered successfully:', r);
    },
    onRegisterError(err) {
      console.error('Service Worker Registration failed:', err);
    },
  });

  // Track network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for beforeinstallprompt to show local installer trigger
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsInstalled(!!checkStandalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`PWA install prompt outcome: ${outcome}`);
    setInstallPrompt(null);
  };

  // Sync notification reminders whenever the active schedule changes
  useEffect(() => {
    if (activeSchedule) {
      notificationScheduler.start(activeSchedule);
    } else {
      notificationScheduler.stop();
    }
    return () => {
      notificationScheduler.stop();
    };
  }, [activeSchedule]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold text-slate-550 dark:text-slate-400 uppercase tracking-widest">Loading LightCycle...</p>
      </div>
    );
  }

  // If no schedules exist, force onboarding flow
  if (schedules.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex items-center justify-center py-8">
        <Onboarding onScheduleCreated={() => setCurrentTab('home')} />
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'home':
        return <Home onNavigate={(tab) => setCurrentTab(tab)} installPrompt={installPrompt} onInstallApp={handleInstallApp} />;
      case 'calendar':
        return <CalendarPage onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'schedules':
        return <Schedules />;
      case 'settings':
        return <Settings installPrompt={installPrompt} isInstalled={isInstalled} onInstallApp={handleInstallApp} />;
      default:
        return <Home onNavigate={(tab) => setCurrentTab(tab)} installPrompt={installPrompt} onInstallApp={handleInstallApp} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-955 flex flex-col md:py-8 md:px-4">
      {/* Desktop/Tablet centered container wrapper */}
      <div className="fixed inset-0 md:relative md:inset-auto w-full max-w-md mx-auto flex bg-white dark:bg-slate-900 border-0 md:border border-slate-200 dark:border-slate-800 md:rounded-2xl flex-col shadow-sm overflow-hidden h-[100dvh] md:h-[85vh] md:max-h-[850px] lg:max-w-lg">
        
        {/* Offline Banner */}
        <div className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/80 py-2 px-5 flex justify-between items-center text-xs font-medium text-slate-550 dark:text-slate-400">
          <span className="font-semibold tracking-tight text-slate-800 dark:text-slate-200">
            LightCycle
          </span>
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            <span>{isOnline ? 'Offline Ready' : 'Offline'}</span>
          </span>
        </div>

        {/* Dynamic page contents */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {renderActiveTab()}
        </div>

        {/* Bottom Tab Navigation Bar */}
        <nav className="absolute bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-around px-6 z-40">
          <button
            onClick={() => setCurrentTab('home')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentTab === 'home'
                ? 'text-slate-900 dark:text-white font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <HomeIcon size={18} />
            <span className="text-[10px] tracking-tight">Dashboard</span>
          </button>
          <button
            onClick={() => setCurrentTab('calendar')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentTab === 'calendar'
                ? 'text-slate-900 dark:text-white font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <CalendarIcon size={18} />
            <span className="text-[10px] tracking-tight">Calendar</span>
          </button>
          <button
            onClick={() => setCurrentTab('schedules')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentTab === 'schedules'
                ? 'text-slate-900 dark:text-white font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <Sliders size={18} />
            <span className="text-[10px] tracking-tight">Schedules</span>
          </button>
          <button
            onClick={() => setCurrentTab('settings')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              currentTab === 'settings'
                ? 'text-slate-900 dark:text-white font-semibold'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <SettingsIcon size={18} />
            <span className="text-[10px] tracking-tight">Settings</span>
          </button>
        </nav>

        {/* PWA Update Banner */}
        {needRefresh && (
          <div className="absolute bottom-20 left-4 right-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 p-4 rounded-xl shadow-md z-50 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex-grow">
              <div className="text-xs font-semibold">New version available</div>
              <p className="text-[10px] opacity-80 leading-normal mt-0.5">
                Update to enjoy the latest local improvements.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => updateServiceWorker(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg transition-colors"
              >
                Update
              </button>
              <button
                onClick={() => setNeedRefresh(false)}
                className="px-2.5 py-1.5 bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 text-white dark:text-slate-900 text-[10px] font-semibold rounded-lg"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ScheduleProvider>
        <AppContent />
      </ScheduleProvider>
    </ThemeProvider>
  );
};

export default App;

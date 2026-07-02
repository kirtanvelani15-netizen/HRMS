import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import ChatWidget from '../components/common/ChatWidget';

const WelcomePopup = () => {
  const [name, setName] = useState(null);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const stored = sessionStorage.getItem('showWelcome');
    if (!stored) return;
    sessionStorage.removeItem('showWelcome');
    setName(stored);

    const start = Date.now();
    const duration = 10000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct === 0) clearInterval(interval);
    }, 50);

    const timer = setTimeout(() => setName(null), duration);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  return (
    <AnimatePresence>
      {name && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          <div className="px-5 py-4">
            <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-0.5">Welcome back</p>
            <p className="text-white text-[17px] font-bold leading-snug">{name} 👋</p>
            <p className="text-white/60 text-xs mt-1">Have a great session!</p>
          </div>
          <div className="h-1 bg-white/20">
            <motion.div
              className="h-full bg-white/70 rounded-full"
              style={{ width: `${progress}%`, transition: 'width 0.05s linear' }}
            />
          </div>
          <button
            onClick={() => setName(null)}
            className="absolute top-3 right-3 text-white/50 hover:text-white text-lg leading-none"
          >×</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isDesktop;
};

const DashboardLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const isDesktop = useIsDesktop();

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/20 overflow-hidden">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onExpandChange={setSidebarExpanded}
      />

      {/* Main content — animates left margin to match sidebar width */}
      <motion.div
        animate={{ marginLeft: isDesktop ? (sidebarExpanded ? 248 : 64) : 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <Navbar onMenuClick={() => setMobileSidebarOpen(o => !o)} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </motion.div>

      <ChatWidget />
      <WelcomePopup />
    </div>
  );
};

export default DashboardLayout;

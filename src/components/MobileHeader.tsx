import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="xl:hidden bg-white/60 dark:bg-[#0B0F19]/60 backdrop-blur-md border-b border-slate-200/50 dark:border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="bg-white dark:bg-neutral-900 rounded-full p-1.5 flex items-center justify-center shadow-sm">
          <img src="/logo.png" alt="DEECO Logo" className="w-6 h-6 object-contain" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-tight">DEECO</h1>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-tight">Admin Portal</p>
        </div>
      </div>
      <button
        onClick={onMenuClick}
        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors active:bg-slate-200 dark:active:bg-white/20"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>
    </header>
  );
}

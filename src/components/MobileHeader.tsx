import { Menu } from 'lucide-react';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="xl:hidden bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shadow-xs">
          DE
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-none">DE-ECO</h1>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
            Admin
          </span>
        </div>
      </div>
      <button
        onClick={onMenuClick}
        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
    </header>
  );
}

import { Menu, BookOpen } from 'lucide-react';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-gradient-to-r from-blue-900 to-blue-800 text-white px-4 py-3 flex items-center justify-between shadow-lg sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6" />
        <div>
          <h1 className="text-lg font-bold">DE-ECO</h1>
          <p className="text-xs text-blue-200">Admin Portal</p>
        </div>
      </div>
      <button
        onClick={onMenuClick}
        className="p-2 hover:bg-blue-700 rounded-lg transition-colors active:bg-blue-600"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>
    </header>
  );
}

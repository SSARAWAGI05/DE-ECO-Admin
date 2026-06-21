import {
  BookOpen,
  Bell,
  Video,
  Users,
  FileText,
  PlayCircle,
  LayoutDashboard,
  TrendingUp,
  X,
  Mail,
  DollarSign,
  History,
  BarChart,
  Receipt,
  Moon,
  Sun
} from 'lucide-react'

import { useDarkMode } from '../hooks/useDarkMode'

type Section =
  | 'dashboard'
  | 'announcements'
  | 'classes'
  | 'courses'          
  | 'enrollments'
  | 'notes'
  | 'recordings'
  | 'market_pulse'
  | 'contact_messages'
  | 'billing'
  | 'invoices'
  | 'past_history'
  | 'earnings_analytics'

interface SidebarProps {
  activeSection: Section
  setActiveSection: (section: Section) => void
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({
  activeSection,
  setActiveSection,
  isOpen,
  onClose,
}: SidebarProps) {
  const { isDark, toggleDarkMode } = useDarkMode()

  const menuItems = [
    { id: 'dashboard' as Section, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'announcements' as Section, label: 'Announcements', icon: Bell },
    { id: 'classes' as Section, label: 'Live Classes', icon: Video },
    { id: 'courses' as Section, label: 'Courses', icon: BookOpen },
    { id: 'enrollments' as Section, label: 'Enrollments', icon: Users },
    { id: 'notes' as Section, label: 'Class Notes', icon: FileText },
    { id: 'recordings' as Section, label: 'Recordings', icon: PlayCircle },
    { id: 'market_pulse' as Section, label: 'Market Pulse', icon: TrendingUp },
    { id: 'contact_messages' as Section, label: 'Contact Messages', icon: Mail },
    { id: 'billing' as Section, label: 'Student Billing', icon: DollarSign },
    { id: 'invoices' as Section, label: 'Invoices', icon: Receipt },
    { id: 'earnings_analytics' as Section, label: 'Earnings Analytics', icon: BarChart },
    { id: 'past_history' as Section, label: 'Past Class History', icon: History },
  ]

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 lg:w-64
        bg-white/80 dark:bg-white/[0.02] backdrop-blur-3xl border-r border-slate-200/50 dark:border-white/10 shadow-2xl
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="flex flex-col h-full">
        {/* LOGO & HEADER */}
        <div className="p-6 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DEECO Logo" className="w-10 h-10 object-contain drop-shadow-md" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">DEECO</h1>
              <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Admin Portal</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <nav className="space-y-1.5">
            <div className="px-3 mb-3">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Main Menu</p>
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-bold group border border-transparent ${
                    isActive
                      ? 'bg-indigo-500/10 dark:bg-[#4ade80]/10 border-indigo-500/30 dark:border-[#4ade80]/30 text-indigo-700 dark:text-[#4ade80] shadow-[0_0_15px_rgba(99,102,241,0.3)] dark:shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/[0.05] dark:hover:border-white/10 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600 dark:text-[#4ade80]' : 'text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-white'}`} />
                  <span className="text-left tracking-wide">
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* FOOTER & TOGGLES */}
        <div className="p-4 border-t border-slate-200/50 dark:border-white/5 shrink-0">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white group"
          >
            {isDark ? (
              <Sun className="w-5 h-5 flex-shrink-0 text-amber-500 group-hover:scale-110 transition-transform" />
            ) : (
              <Moon className="w-5 h-5 flex-shrink-0 text-indigo-500 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-left tracking-wide">
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>
    </aside>
  )
}

import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, BookOpen, Video, Users, FileText, PlayCircle,
  DollarSign, Receipt, BarChart, History,
  Bell, Mail, TrendingUp, Moon, Sun, ChevronDown, X
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

interface NavbarProps {
  activeSection: Section
  setActiveSection: (section: Section) => void
  sidebarOpen: boolean
  setSidebarOpen: (isOpen: boolean) => void
}

export default function Navbar({ activeSection, setActiveSection, sidebarOpen, setSidebarOpen }: NavbarProps) {
  const { isDark, toggleDarkMode } = useDarkMode()
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleNavClick = (section: Section) => {
    setActiveSection(section)
    setActiveDropdown(null)
    setSidebarOpen(false)
  }

  const topLevelNav = [
    { id: 'dashboard' as Section, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'enrollments' as Section, label: 'Enrollments', icon: Users },
    { id: 'classes' as Section, label: 'Live Classes', icon: Video },
    { id: 'billing' as Section, label: 'Student Billing', icon: DollarSign },
    { id: 'invoices' as Section, label: 'Invoices', icon: Receipt },
    { id: 'earnings_analytics' as Section, label: 'Earnings', icon: BarChart },
    { id: 'past_history' as Section, label: 'Class History', icon: History },
  ]

  const otherTabs = [
    { id: 'announcements' as Section, label: 'Announcements', icon: Bell },
    { id: 'courses' as Section, label: 'Courses', icon: BookOpen },
    { id: 'notes' as Section, label: 'Class Notes', icon: FileText },
    { id: 'recordings' as Section, label: 'Recordings', icon: PlayCircle },
    { id: 'market_pulse' as Section, label: 'Market Pulse', icon: TrendingUp },
    { id: 'contact_messages' as Section, label: 'Messages', icon: Mail },
  ]

  const isOtherTabsActive = otherTabs.some(item => item.id === activeSection)

  return (
    <>
      <nav 
        ref={navRef}
        className="hidden lg:flex fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[98%] h-14 bg-white/40 dark:bg-[#020617]/30 backdrop-blur-3xl rounded-full border border-white/60 dark:border-white/10 shadow-2xl shadow-indigo-500/10 dark:shadow-[#0ea5e9]/10 items-center justify-between px-3 transition-all"
      >
      {/* BRANDING */}
      <div className="flex items-center gap-2 shrink-0 pl-1">
        <img src="/logo.png" alt="DEECO Logo" className="w-6 h-6 object-contain drop-shadow-lg" />
        <div>
          <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none">DEECO</h1>
        </div>
      </div>

      {/* NAVIGATION ITEMS */}
      <div className="hidden md:flex items-center gap-1 xl:gap-2">
        {/* Top Level Nav Items */}
        {topLevelNav.map(item => {
          const ItemIcon = item.icon
          const isActive = activeSection === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-full transition-all duration-300 text-[10px] lg:text-xs font-bold border border-transparent whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-500/10 dark:bg-[#4ade80]/10 border-indigo-500/30 dark:border-[#4ade80]/30 text-indigo-700 dark:text-[#4ade80] shadow-[0_0_15px_rgba(99,102,241,0.3)] dark:shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ItemIcon className={`w-3 h-3 lg:w-3.5 lg:h-3.5 ${isActive ? 'text-indigo-600 dark:text-[#4ade80]' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="hidden xl:inline">{item.label}</span>
            </button>
          )
        })}

        {/* Other Tabs Dropdown */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'others' ? null : 'others')}
            className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-full transition-all duration-300 text-[10px] lg:text-xs font-bold border border-transparent whitespace-nowrap ${
              isOtherTabsActive || activeDropdown === 'others'
                ? 'bg-indigo-500/10 dark:bg-[#4ade80]/10 border-indigo-500/30 dark:border-[#4ade80]/30 text-indigo-700 dark:text-[#4ade80] shadow-[0_0_15px_rgba(99,102,241,0.3)] dark:shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'others' ? 'rotate-180' : ''}`} />
            Other Tabs
          </button>

          {/* Dropdown Menu */}
          {activeDropdown === 'others' && (
            <div className="absolute top-full right-0 mt-3 w-56 bg-white/80 dark:bg-[#0B0F19]/90 backdrop-blur-3xl border border-white/60 dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-4 duration-200 z-50">
              {otherTabs.map(item => {
                const ItemIcon = item.icon
                const isItemActive = activeSection === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-semibold group ${
                      isItemActive
                        ? 'bg-indigo-50 dark:bg-[#4ade80]/10 text-indigo-700 dark:text-[#4ade80]'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5'
                    }`}
                  >
                    <ItemIcon className={`w-4 h-4 ${isItemActive ? 'text-indigo-600 dark:text-[#4ade80]' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-white'}`} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT ACTIONS */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm border border-transparent dark:border-white/5"
          aria-label="Toggle Dark Mode"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
        {/* Mobile menu button could go here, but omitted for simplicity assuming primarily desktop/tablet dash */}
      </div>
    </nav>

      {/* MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-full w-72 bg-white/95 dark:bg-[#020617]/95 backdrop-blur-2xl z-50 transform transition-transform duration-300 ease-in-out border-r border-slate-200/50 dark:border-white/10 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:hidden flex flex-col`}>
        <div className="p-4 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between shrink-0 h-16">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DEECO Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">DEECO</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-2">Main Menu</div>
          {topLevelNav.map(item => {
            const ItemIcon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-bold border border-transparent ${
                  isActive
                    ? 'bg-indigo-500/10 dark:bg-[#4ade80]/10 border-indigo-500/30 dark:border-[#4ade80]/30 text-indigo-700 dark:text-[#4ade80] shadow-[0_0_15px_rgba(99,102,241,0.2)] dark:shadow-[0_0_15px_rgba(74,222,128,0.15)]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <ItemIcon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-[#4ade80]' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.label}
              </button>
            )
          })}

          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-2 mt-6">Other Tools</div>
          {otherTabs.map(item => {
            const ItemIcon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-bold border border-transparent ${
                  isActive
                    ? 'bg-indigo-500/10 dark:bg-[#4ade80]/10 border-indigo-500/30 dark:border-[#4ade80]/30 text-indigo-700 dark:text-[#4ade80] shadow-[0_0_15px_rgba(99,102,241,0.2)] dark:shadow-[0_0_15px_rgba(74,222,128,0.15)]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <ItemIcon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-[#4ade80]' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-slate-200/50 dark:border-white/10 shrink-0">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-sm font-bold"
          >
            <span className="flex items-center gap-3">
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}

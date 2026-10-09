import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, BookOpen, Video, Users, FileText, PlayCircle,
  DollarSign, Receipt, BarChart, History,
  Bell, Mail, TrendingUp, Moon, Sun, ChevronDown, X, Award
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
  | 'exams'

interface NavbarProps {
  activeSection: Section
  setActiveSection: (section: Section) => void
  sidebarOpen: boolean
  setSidebarOpen: (isOpen: boolean) => void
}

export default function Navbar({ activeSection, setActiveSection, sidebarOpen, setSidebarOpen }: NavbarProps) {
  const { isDark, toggleDarkMode } = useDarkMode()
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [mobileOthersOpen, setMobileOthersOpen] = useState(false)
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
    { id: 'exams' as Section, label: 'Exams & Grading', icon: Award },
    { id: 'billing' as Section, label: 'Student Billing', icon: DollarSign },
    { id: 'invoices' as Section, label: 'Invoices', icon: Receipt },
    { id: 'earnings_analytics' as Section, label: 'Earnings', icon: BarChart },
    { id: 'past_history' as Section, label: 'Class History', icon: History },
    { id: 'notes' as Section, label: 'Class Notes', icon: FileText },
  ]

  const otherTabs = [
    { id: 'announcements' as Section, label: 'Announcements', icon: Bell },
    { id: 'courses' as Section, label: 'Courses', icon: BookOpen },
    { id: 'recordings' as Section, label: 'Recordings', icon: PlayCircle },
    { id: 'market_pulse' as Section, label: 'Market Pulse', icon: TrendingUp },
    { id: 'contact_messages' as Section, label: 'Messages', icon: Mail },
  ]

  const isOtherTabsActive = otherTabs.some(item => item.id === activeSection)

  return (
    <>
      {/* DOCKED FULL-WIDTH TOP NAVIGATION BAR */}
      <nav 
        ref={navRef}
        className="hidden xl:flex fixed top-0 left-0 right-0 z-40 h-16 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800/80 px-6 items-center justify-between transition-colors shadow-2xs"
      >
        {/* BRANDING */}
        <div 
          className="flex items-center gap-3 shrink-0 cursor-pointer select-none" 
          onClick={() => handleNavClick('dashboard')}
        >
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

        {/* NAVIGATION ITEMS */}
        <div className="flex items-center gap-1">
          {topLevelNav.map(item => {
            const ItemIcon = item.icon
            const isActive = activeSection === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <ItemIcon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            )
          })}

          {/* More Tabs Dropdown */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'others' ? null : 'others')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold cursor-pointer ${
                isOtherTabsActive || activeDropdown === 'others'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === 'others' ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {activeDropdown === 'others' && (
              <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in duration-150">
                {otherTabs.map(item => {
                  const ItemIcon = item.icon
                  const isItemActive = activeSection === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs font-semibold text-left cursor-pointer ${
                        isItemActive
                          ? 'bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-white font-bold'
                          : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <ItemIcon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
            aria-label="Toggle Dark Mode"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </nav>

      {/* MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs z-40 xl:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-[#0f172a] z-50 transform transition-transform duration-200 ease-in-out border-r border-slate-200 dark:border-slate-800 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} xl:hidden flex flex-col`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shadow-xs">
              DE
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none">DE-ECO</h1>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Admin Console</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1">Main Menu</div>
          {topLevelNav.map(item => {
            const ItemIcon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-xs font-semibold cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ItemIcon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}

          <button 
            onClick={() => setMobileOthersOpen(!mobileOthersOpen)}
            className="w-full flex items-center justify-between px-3 mt-4 mb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
          >
            <span>Other Sections</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileOthersOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`space-y-1 overflow-hidden transition-all duration-200 ease-in-out ${mobileOthersOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            {otherTabs.map(item => {
              const ItemIcon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition text-xs font-semibold cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ItemIcon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-semibold cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}

import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, BookOpen, Video, Users, FileText, PlayCircle,
  DollarSign, Receipt, BarChart, History,
  Bell, Mail, TrendingUp, Moon, Sun, ChevronDown
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
}

export default function Navbar({ activeSection, setActiveSection }: NavbarProps) {
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
  }

  const navGroups = [
    {
      id: 'academics',
      label: 'Academics',
      icon: BookOpen,
      items: [
        { id: 'courses' as Section, label: 'Courses', icon: BookOpen },
        { id: 'enrollments' as Section, label: 'Enrollments', icon: Users },
        { id: 'classes' as Section, label: 'Live Classes', icon: Video },
        { id: 'notes' as Section, label: 'Class Notes', icon: FileText },
        { id: 'recordings' as Section, label: 'Recordings', icon: PlayCircle },
      ]
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: DollarSign,
      items: [
        { id: 'billing' as Section, label: 'Student Billing', icon: DollarSign },
        { id: 'invoices' as Section, label: 'Invoices', icon: Receipt },
        { id: 'earnings_analytics' as Section, label: 'Earnings', icon: BarChart },
        { id: 'past_history' as Section, label: 'Class History', icon: History },
      ]
    },
    {
      id: 'comms',
      label: 'Comms',
      icon: Mail,
      items: [
        { id: 'announcements' as Section, label: 'Announcements', icon: Bell },
        { id: 'contact_messages' as Section, label: 'Messages', icon: Mail },
        { id: 'market_pulse' as Section, label: 'Market Pulse', icon: TrendingUp },
      ]
    }
  ]

  const isGroupActive = (groupId: string) => {
    const group = navGroups.find(g => g.id === groupId)
    return group?.items.some(item => item.id === activeSection)
  }

  return (
    <nav 
      ref={navRef}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl h-16 bg-white/40 dark:bg-[#020617]/30 backdrop-blur-3xl rounded-full border border-white/60 dark:border-white/10 shadow-2xl shadow-indigo-500/10 dark:shadow-[#0ea5e9]/10 flex items-center justify-between px-6 transition-all"
    >
      {/* BRANDING */}
      <div className="flex items-center gap-3 shrink-0">
        <img src="/logo.png" alt="DEECO Logo" className="w-8 h-8 object-contain drop-shadow-lg" />
        <div>
          <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">DEECO</h1>
        </div>
      </div>

      {/* NAVIGATION ITEMS */}
      <div className="hidden md:flex items-center gap-2">
        {/* Dashboard Standalone */}
        <button
          onClick={() => handleNavClick('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 text-sm font-bold border border-transparent ${
            activeSection === 'dashboard'
              ? 'bg-indigo-500/10 dark:bg-[#4ade80]/10 border-indigo-500/30 dark:border-[#4ade80]/30 text-indigo-700 dark:text-[#4ade80] shadow-[0_0_15px_rgba(99,102,241,0.3)] dark:shadow-[0_0_15px_rgba(74,222,128,0.2)]'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${activeSection === 'dashboard' ? 'text-indigo-600 dark:text-[#4ade80]' : 'text-slate-400 dark:text-slate-500'}`} />
          Dashboard
        </button>

        {/* Dropdown Groups */}
        {navGroups.map(group => {
          const isActive = isGroupActive(group.id)
          const isOpen = activeDropdown === group.id
          const GroupIcon = group.icon

          return (
            <div key={group.id} className="relative">
              <button
                onClick={() => setActiveDropdown(isOpen ? null : group.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 text-sm font-bold border border-transparent ${
                  isActive || isOpen
                    ? 'bg-indigo-500/10 dark:bg-[#4ade80]/10 border-indigo-500/30 dark:border-[#4ade80]/30 text-indigo-700 dark:text-[#4ade80] shadow-[0_0_15px_rgba(99,102,241,0.3)] dark:shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GroupIcon className={`w-4 h-4 ${isActive || isOpen ? 'text-indigo-600 dark:text-[#4ade80]' : 'text-slate-400 dark:text-slate-500'}`} />
                {group.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div className="absolute top-full left-0 mt-3 w-56 bg-white/80 dark:bg-[#0B0F19]/90 backdrop-blur-3xl border border-white/60 dark:border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-4 duration-200">
                  {group.items.map(item => {
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
          )
        })}
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
  )
}

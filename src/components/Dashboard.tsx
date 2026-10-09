import { useEffect, useState } from 'react'
import {
  Users, Video, Award, DollarSign, Receipt,
  FileText, PlayCircle, Bell, ArrowRight,
  TrendingUp, Plus, MessageSquare, History, Globe, ChevronRight
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface DashboardProps {
  setActiveSection?: (section: any) => void
}

export default function Dashboard({ setActiveSection }: DashboardProps) {
  const [stats, setStats] = useState({
    studentsCount: 0,
    classesCount: 0,
    examsCount: 0,
    invoicesCount: 0,
    loading: true
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const [
          { count: studentsCount },
          { count: classesCount },
          { count: examsCount },
          { count: invoicesCount }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('live_classes').select('*', { count: 'exact', head: true }),
          supabase.from('exams').select('*', { count: 'exact', head: true }),
          supabase.from('invoices').select('*', { count: 'exact', head: true })
        ])

        setStats({
          studentsCount: studentsCount || 0,
          classesCount: classesCount || 0,
          examsCount: examsCount || 0,
          invoicesCount: invoicesCount || 0,
          loading: false
        })
      } catch (err) {
        console.error('Error loading dashboard stats:', err)
        setStats(prev => ({ ...prev, loading: false }))
      }
    }

    loadStats()
  }, [])

  // Direct Action Handlers (opens modal/drawer immediately in target screen)
  const handleDirectNewClass = () => {
    localStorage.setItem('admin_auto_action', 'new_class')
    setActiveSection?.('classes')
  }

  const handleDirectAddExam = () => {
    localStorage.setItem('admin_auto_action', 'new_exam')
    setActiveSection?.('exams')
  }

  // 4 Top Priority Navigation Portals
  const priorityPortals = [
    {
      id: 'enrollments',
      title: 'Enrollments',
      subtitle: 'Student roster & access',
      count: stats.loading ? '...' : `${stats.studentsCount} Students`,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200/60 dark:border-blue-800/40'
    },
    {
      id: 'classes',
      title: 'Live Classes',
      subtitle: 'Sessions & timetable',
      count: stats.loading ? '...' : `${stats.classesCount} Classes`,
      icon: Video,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200/60 dark:border-emerald-800/40'
    },
    {
      id: 'earnings_analytics',
      title: 'Earning',
      subtitle: 'Revenue & analytics',
      count: 'Performance',
      icon: TrendingUp,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      border: 'border-violet-200/60 dark:border-violet-800/40'
    },
    {
      id: 'billing',
      title: 'Student Billing',
      subtitle: 'Rates & statements',
      count: 'Billing Console',
      icon: DollarSign,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200/60 dark:border-amber-800/40'
    }
  ]

  // Secondary Tools (Clean, compact list/grid at the bottom)
  const secondaryTools = [
    { id: 'invoices', title: 'Invoices', icon: Receipt, meta: `${stats.invoicesCount} Issued` },
    { id: 'exams', title: 'All Exams', icon: Award, meta: `${stats.examsCount} Tests` },
    { id: 'notes', title: 'Class Notes', icon: FileText, meta: 'Curriculum' },
    { id: 'recordings', title: 'Recordings', icon: PlayCircle, meta: 'Archive' },
    { id: 'past_history', title: 'History', icon: History, meta: 'Past logs' },
    { id: 'contact_messages', title: 'Messages', icon: MessageSquare, meta: 'Inquiries' },
    { id: 'announcements', title: 'Notices', icon: Bell, meta: 'Bulletins' },
    { id: 'market_pulse', title: 'Market Pulse', icon: Globe, meta: 'Economics' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 px-1 sm:px-0">
      {/* 1. COMPACT MOBILE-FIRST GREETING */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
              Online
            </span>
            <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">DE-ECO Admin</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome, Rishika
          </h1>
        </div>
      </div>

      {/* 2. TOP PRIORITY: 2 DIRECT ACTION BUTTONS (HIGH THUMB ACCESSIBILITY) */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Quick Actions
        </span>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* New Class Direct Button */}
          <button
            type="button"
            onClick={handleDirectNewClass}
            className="flex items-center justify-center gap-2 sm:gap-2.5 h-13 sm:h-14 px-3 sm:px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm shadow-sm hover:opacity-95 active:scale-[0.98] transition cursor-pointer select-none"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 dark:bg-slate-900/10 flex items-center justify-center shrink-0">
              <Plus size={15} strokeWidth={2.5} />
            </div>
            <span className="truncate">New Class</span>
          </button>

          {/* Add Exam Direct Button */}
          <button
            type="button"
            onClick={handleDirectAddExam}
            className="flex items-center justify-center gap-2 sm:gap-2.5 h-13 sm:h-14 px-3 sm:px-5 rounded-xl bg-white dark:bg-[#0f172a] border-2 border-slate-900 dark:border-white text-slate-900 dark:text-white font-bold text-xs sm:text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition cursor-pointer select-none"
          >
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Plus size={15} strokeWidth={2.5} />
            </div>
            <span className="truncate">Add Exam</span>
          </button>
        </div>
      </div>

      {/* 3. CORE 4 NAVIGATION PORTALS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Main Portals
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">4 Core</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          {priorityPortals.map((portal) => {
            const Icon = portal.icon
            return (
              <div
                key={portal.id}
                onClick={() => setActiveSection?.(portal.id)}
                className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] active:bg-slate-50 dark:active:bg-slate-800/60 transition cursor-pointer group flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${portal.bg} ${portal.color} flex items-center justify-center border ${portal.border}`}>
                      <Icon size={18} />
                    </div>
                    <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {portal.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                    {portal.subtitle}
                  </p>
                </div>

                <div className="pt-2.5 mt-2.5 sm:pt-3 sm:mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {portal.count}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    Open
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. COMPACT SECONDARY TOOLS (Low profile, clean grid so no clutter on mobile) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            More Tools
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Quick Access</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {secondaryTools.map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveSection?.(tool.id)}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 text-left hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98] transition cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {tool.title}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {tool.meta}
                    </p>
                  </div>
                </div>
                <ArrowRight size={12} className="text-slate-300 dark:text-slate-600 shrink-0 ml-1" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}


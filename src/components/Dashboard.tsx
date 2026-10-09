import { useEffect, useState } from 'react'
import {
  Users, Video, Award, DollarSign, Receipt,
  BarChart, FileText, PlayCircle, Bell, ArrowRight,
  TrendingUp, Calendar, CheckCircle2
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

  const modules = [
    {
      id: 'exams',
      title: 'Exams & Grading',
      description: 'Create tests, assign to students, evaluate descriptive answers, and download report cards.',
      icon: Award,
      badge: 'Academic',
      count: stats.examsCount > 0 ? `${stats.examsCount} Exams` : 'Manage Tests'
    },
    {
      id: 'enrollments',
      title: 'Student Enrollments',
      description: 'Manage registered students, course allocations, hourly rates, and active statuses.',
      icon: Users,
      badge: 'Students',
      count: stats.studentsCount > 0 ? `${stats.studentsCount} Students` : 'Directory'
    },
    {
      id: 'classes',
      title: 'Live Classes',
      description: 'Schedule upcoming 1-on-1 and group live interactive economics sessions.',
      icon: Video,
      badge: 'Schedule',
      count: stats.classesCount > 0 ? `${stats.classesCount} Classes` : 'Timetable'
    },
    {
      id: 'billing',
      title: 'Student Billing',
      description: 'View student hourly rates, compute billable hours, and generate fee statements.',
      icon: DollarSign,
      badge: 'Finance',
      count: 'Billing Console'
    },
    {
      id: 'invoices',
      title: 'Invoices',
      description: 'Issue verified PDF invoices, track payment receipts, and monitor outstanding dues.',
      icon: Receipt,
      badge: 'Accounts',
      count: stats.invoicesCount > 0 ? `${stats.invoicesCount} Invoices` : 'Records'
    },
    {
      id: 'earnings_analytics',
      title: 'Earnings & Analytics',
      description: 'Inspect monthly revenue performance, class hour trends, and growth indicators.',
      icon: BarChart,
      badge: 'Analytics',
      count: 'Performance'
    },
    {
      id: 'notes',
      title: 'Class Notes & Curriculum',
      description: 'Upload study modules, reading lists, and PDF reference sheets for enrolled batches.',
      icon: FileText,
      badge: 'Materials',
      count: 'Library'
    },
    {
      id: 'recordings',
      title: 'Class Recordings',
      description: 'Archive lecture video recordings and provide playback access to students.',
      icon: PlayCircle,
      badge: 'Media',
      count: 'Video Archive'
    },
    {
      id: 'announcements',
      title: 'Announcements',
      description: 'Broadcast batch notices, schedule adjustments, and urgent student bulletins.',
      icon: Bell,
      badge: 'Updates',
      count: 'Bulletin'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 1. CLEAN EXECUTIVE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Console Operational
            </span>
            <span className="text-slate-400 dark:text-slate-600 text-xs">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">DE-ECO Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome, Rishika
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor students, conduct live classes, author exams, and manage tuition billing.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection && setActiveSection('exams')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition hover:opacity-90 shadow-2xs cursor-pointer"
          >
            <Award size={14} />
            <span>Create Exam</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection && setActiveSection('classes')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            <Video size={14} />
            <span>Schedule Class</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div 
          onClick={() => setActiveSection && setActiveSection('enrollments')}
          className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Enrolled Students</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {stats.loading ? '...' : stats.studentsCount}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
              <span>View full directory</span>
              <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div 
          onClick={() => setActiveSection && setActiveSection('classes')}
          className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Live Classes</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition">
              <Video size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {stats.loading ? '...' : stats.classesCount}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
              <span>Inspect timetable</span>
              <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => setActiveSection && setActiveSection('exams')}
          className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Exams & Tests</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition">
              <Award size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {stats.loading ? '...' : stats.examsCount}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
              <span>Author & grade papers</span>
              <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={() => setActiveSection && setActiveSection('invoices')}
          className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Invoices</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition">
              <Receipt size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {stats.loading ? '...' : stats.invoicesCount}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
              <span>Review accounts</span>
              <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>
      </div>

      {/* 3. CORE MODULES GRID */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Administrative Modules
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">9 Portals</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => {
            const ModIcon = mod.icon
            return (
              <div
                key={mod.id}
                onClick={() => setActiveSection && setActiveSection(mod.id)}
                className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition">
                      <ModIcon size={18} />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {mod.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {mod.count}
                  </span>
                  <span className="text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white flex items-center gap-1 font-semibold transition">
                    <span>Open</span>
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

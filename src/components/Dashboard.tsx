import { useEffect, useState } from 'react'
import {
  Calendar,
  Clock,
  Users,
  Mail,
  Plus,
  FileText,
  PlayCircle,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabaseClient'

/* ================= TYPES ================= */

interface LiveClass {
  id: string
  title: string
  instructor_name: string
  scheduled_datetime: string
  end_datetime: string
  duration_minutes: number
}

interface Activity {
  label: string
  time: string
}

/* ================= COMPONENT ================= */

interface DashboardProps {
  setActiveSection?: (section: any) => void
}

export default function Dashboard({ setActiveSection }: DashboardProps) {
  const [stats, setStats] = useState({
    upcoming: 0,
    ongoing: 0,
    enrollments: 0,
    messages: 0,
  })

  const [classes, setClasses] = useState<LiveClass[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState('INR')
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['INR'])
  // We need to store raw month data to instantly switch without refetching
  const [rawMonthsData, setRawMonthsData] = useState<Record<string, Record<string, number>>>({})

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    await Promise.all([
      fetchStats(),
      fetchClasses(),
      fetchActivity(),
      fetchEarnings(),
    ])
  }

  /* ================= DATA ================= */

  const fetchStats = async () => {
    const now = new Date().toISOString()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [{ count: upcoming }, { count: ongoing }, { count: enrollments }, { count: messages }] =
      await Promise.all([
        supabase
          .from('live_classes')
          .select('id', { count: 'exact', head: true })
          .gt('scheduled_datetime', now),

        supabase
          .from('live_classes')
          .select('id', { count: 'exact', head: true })
          .lte('scheduled_datetime', now)
          .gte('end_datetime', now),

        supabase
          .from('class_enrollments')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),

        supabase
          .from('contact_messages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'new'),
      ])

    setStats({
      upcoming: upcoming ?? 0,
      ongoing: ongoing ?? 0,
      enrollments: enrollments ?? 0,
      messages: messages ?? 0,
    })
  }

  const fetchClasses = async () => {
    const now = new Date().toISOString()

    const { data } = await supabase
      .from('live_classes')
      .select('id, title, instructor_name, scheduled_datetime, end_datetime, duration_minutes')
      .gte('end_datetime', now)
      .order('scheduled_datetime')
      .limit(4)

    setClasses(data ?? [])
  }

  const fetchActivity = async () => {
    const events: Activity[] = []

    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(3)

    enrollments?.forEach(() =>
      events.push({
        label: 'New student enrolled',
        time: 'Recently',
      })
    )

    const { data: reels } = await supabase
      .from('market_reels')
      .select('published_at')
      .order('published_at', { ascending: false })
      .limit(1)

    if (reels?.length) {
      events.push({
        label: 'Market Pulse published',
        time: 'Recently',
      })
    }

    setActivity(events)
  }

  const fetchEarnings = async () => {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('live_classes')
      .select(`
        scheduled_datetime,
        duration_minutes,
        profiles!live_classes_user_id_fkey (
          hourly_rate,
          currency
        )
      `)
      .lt('end_datetime', now)
      .neq('status', 'cancelled')

    const last6Months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      last6Months.push(d.toLocaleString('default', { month: 'short' }))
    }

    const monthsData: Record<string, Record<string, number>> = {}
    const currs = new Set<string>(['INR'])

    if (data) {
      data.forEach((c: any) => {
        const curr = c.profiles?.currency || 'INR'
        currs.add(curr)
      })

      currs.forEach(curr => {
        monthsData[curr] = {}
        last6Months.forEach(m => monthsData[curr][m] = 0)
      })

      data.forEach((c: any) => {
        const d = new Date(c.scheduled_datetime)
        const monthName = d.toLocaleString('default', { month: 'short' })
        const curr = c.profiles?.currency || 'INR'
        if (monthsData[curr] && monthsData[curr][monthName] !== undefined) {
          const rate = c.profiles?.hourly_rate || 0
          const amount = (c.duration_minutes / 60) * rate
          monthsData[curr][monthName] += amount
        }
      })
    }

    setAvailableCurrencies(Array.from(currs))
    setRawMonthsData(monthsData)

    if (!Array.from(currs).includes(selectedCurrency)) {
      setSelectedCurrency(Array.from(currs)[0])
    }
  }

  /* ================= UI ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full ">
      {/* HERO */}
      <div className="pb-4">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2 drop-shadow-sm dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          Welcome back
        </h1>
        <p className="text-slate-500 dark:text-slate-300 font-medium text-lg">
          Here’s what’s happening on DE-ECO today.
        </p>
      </div>

      {/* SIGNAL STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Stat label="Upcoming Classes" value={stats.upcoming} icon={Calendar} accent="indigo" />
        <Stat label="Live Now" value={stats.ongoing} icon={Zap} accent="pink" />
        <Stat label="New Enrollments" value={stats.enrollments} icon={Users} accent="emerald" />
        <Stat label="New Messages" value={stats.messages} icon={Mail} accent="cyan" />
      </div>


      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* CLASSES */}
        <div className="lg:col-span-2 bg-white/60 dark:bg-[#020617]/40 backdrop-blur-3xl rounded-3xl border border-slate-200/50 dark:border-white/10 p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.05)] dark:shadow-[0_0_40px_rgba(0,0,0,0.2)]">
          <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="w-2 h-8 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600 shadow-sm dark:shadow-[0_0_15px_rgba(129,140,248,0.5)]"></span>
            Upcoming Live Classes
          </h2>

          <div className="space-y-4">
            {classes.map((c) => {
              const start = new Date(c.scheduled_datetime)
              const isLive =
                new Date(c.scheduled_datetime) <= new Date() &&
                new Date(c.end_datetime) >= new Date()

              return (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row justify-between sm:items-center bg-white/50 dark:bg-[#0B0F19]/60 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-2xl p-5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors group"
                >
                  <div>
                    <p className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {c.title}
                    </p>
                    <p className="text-sm text-slate-400 mt-1.5 flex items-center gap-2 font-medium">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      {start.toLocaleString()} <span className="text-slate-600">•</span> {c.duration_minutes} min <span className="text-slate-600">•</span> {c.instructor_name}
                    </p>
                  </div>

                  {isLive && (
                    <span className="mt-4 sm:mt-0 inline-flex items-center gap-2 text-xs bg-pink-500/10 text-pink-400 border border-pink-500/30 px-4 py-2 rounded-full font-black tracking-widest uppercase shadow-[0_0_20px_rgba(236,72,153,0.2)]">
                      <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                      LIVE
                    </span>
                  )}
                </div>
              )
            })}

            {!classes.length && (
              <p className="text-slate-400 text-sm italic py-4">
                No upcoming classes scheduled
              </p>
            )}
          </div>
        </div>

        {/* ACTIVITY */}
        <div className="bg-white/60 dark:bg-[#020617]/40 backdrop-blur-3xl rounded-3xl border border-slate-200/50 dark:border-white/10 p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.05)] dark:shadow-[0_0_40px_rgba(0,0,0,0.2)]">
          <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="w-2 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-sm dark:shadow-[0_0_15px_rgba(52,211,153,0.5)]"></span>
            Activity Feed
          </h2>

          <div className="space-y-4">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors">
                <div className="w-2.5 h-2.5 mt-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full shadow-sm dark:shadow-[0_0_10px_rgba(52,211,153,0.8)] shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {a.label}
                  </p>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {a.time}
                  </p>
                </div>
              </div>
            ))}

            {!activity.length && (
              <p className="text-slate-400 text-sm italic py-4">
                No recent activity
              </p>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-white/60 dark:bg-[#020617]/40 backdrop-blur-3xl rounded-3xl border border-slate-200/50 dark:border-white/10 p-6 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.05)] dark:shadow-[0_0_40px_rgba(0,0,0,0.2)]">
        <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <span className="w-2 h-8 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-600 shadow-sm dark:shadow-[0_0_15px_rgba(34,211,238,0.5)]"></span>
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Action icon={Plus} label="Schedule Class" onClick={() => setActiveSection?.('classes')} />
          <Action icon={FileText} label="Post Announcement" onClick={() => setActiveSection?.('announcements')} />
          <Action icon={PlayCircle} label="Add Recording" onClick={() => setActiveSection?.('recordings')} />
          <Action icon={TrendingUp} label="Market Pulse" onClick={() => setActiveSection?.('market_pulse')} />
        </div>
      </div>
    </div>
  )
}

/* ================= SUB COMPONENTS ================= */

function Stat({ label, value, icon: Icon, accent }: any) {
  const accentColors: any = {
    indigo: 'from-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.4)] text-indigo-100',
    pink: 'from-pink-500 to-rose-500 shadow-[0_0_20px_rgba(236,72,153,0.4)] text-pink-100',
    emerald: 'from-emerald-400 to-teal-500 shadow-[0_0_20px_rgba(52,211,153,0.4)] text-emerald-100',
    cyan: 'from-cyan-400 to-blue-500 shadow-[0_0_20px_rgba(34,211,238,0.4)] text-cyan-100',
  }

  const iconColors: any = {
    indigo: 'text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.8)]',
    pink: 'text-pink-300 drop-shadow-[0_0_8px_rgba(249,168,212,0.8)]',
    emerald: 'text-emerald-300 drop-shadow-[0_0_8px_rgba(110,231,183,0.8)]',
    cyan: 'text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]',
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br ${accentColors[accent] || accentColors.indigo} flex items-center gap-6 group hover:scale-[1.02] transition-transform duration-300 border border-white/20`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
      <div className="relative z-10 p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
        <Icon className={`w-8 h-8 ${iconColors[accent] || iconColors.indigo}`} />
      </div>
      <div className="relative z-10">
        <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-80 mb-1">{label}</p>
        <p className="text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">{value}</p>
      </div>
    </div>
  )
}

function Action({ icon: Icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 bg-white/50 dark:bg-[#0B0F19]/50 hover:bg-white/80 dark:hover:bg-white/10 backdrop-blur-md border border-slate-200/50 dark:border-white/10 rounded-2xl p-5 transition-all duration-300 text-slate-900 dark:text-white group shadow-sm dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    >
      <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-bold tracking-wide">{label}</span>
    </button>
  )
}

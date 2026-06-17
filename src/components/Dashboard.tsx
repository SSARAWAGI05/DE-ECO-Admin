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
      <div className="pb-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 mb-1">
          Welcome back
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Here’s what’s happening on DE-ECO today.
        </p>
      </div>

      {/* SIGNAL STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Stat label="Upcoming Classes" value={stats.upcoming} icon={Calendar} accent="indigo" />
        <Stat label="Live Now" value={stats.ongoing} icon={Zap} accent="rose" />
        <Stat label="New Enrollments" value={stats.enrollments} icon={Users} accent="emerald" />
        <Stat label="New Messages" value={stats.messages} icon={Mail} accent="slate" />
      </div>

      {/* EARNINGS CHART */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 p-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 tracking-tight">Earnings Overview</h2>
          <select 
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-50 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-50 font-medium text-sm"
          >
            {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e293b" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} tickFormatter={(value) => selectedCurrency === 'INR' ? `₹${value}` : `${selectedCurrency} ${value}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f172a', padding: '12px' }}
                itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                formatter={(value: any) => [selectedCurrency === 'INR' ? `₹${value}` : `${selectedCurrency} ${value}`, 'Earnings']}
              />
              <Area type="monotone" dataKey="Earnings" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CLASSES */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 dark:bg-white rounded-xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold mb-5 text-slate-900 dark:text-slate-50 tracking-tight">
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
                  className="flex justify-between items-center border rounded-xl p-4 hover:shadow-md transition"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {c.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {start.toLocaleString()} · {c.duration_minutes} min · {c.instructor_name}
                    </p>
                  </div>

                  {isLive && (
                    <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                      LIVE
                    </span>
                  )}
                </div>
              )
            })}

            {!classes.length && (
              <p className="text-gray-500 text-sm">
                No upcoming classes scheduled
              </p>
            )}
          </div>
        </div>

        {/* ACTIVITY */}
        <div className="bg-white dark:bg-neutral-900 dark:bg-white rounded-xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold mb-5 text-slate-900 dark:text-slate-50 tracking-tight">
            Activity Feed
          </h2>

          <div className="space-y-5">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-2 h-2 mt-2 bg-green-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {a.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.time}
                  </p>
                </div>
              </div>
            ))}

            {!activity.length && (
              <p className="text-gray-500 text-sm">
                No recent activity
              </p>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-white dark:bg-neutral-900 dark:bg-white rounded-xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-6">
        <h2 className="text-lg font-semibold mb-5 text-slate-900 dark:text-slate-50 tracking-tight">
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
  return (
    <div className="bg-white dark:bg-neutral-900 dark:bg-white rounded-xl p-5 border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 flex items-center gap-4">
      <div className="p-3 bg-slate-50 dark:bg-neutral-800/50 text-slate-700 dark:text-slate-300 rounded-lg">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{value}</p>
      </div>
    </div>
  )
}

function Action({ icon: Icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 rounded-xl p-5 hover:bg-slate-50 dark:hover:bg-neutral-800 dark:hover:bg-slate-200/50 dark:bg-neutral-800/50 hover:border-slate-300 dark:border-neutral-700 transition bg-white dark:bg-neutral-900 dark:bg-white text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50 group"
    >
      <Icon className="w-6 h-6 text-slate-400 group-hover:text-slate-900 dark:text-slate-50 transition-colors" />
      <span className="text-sm font-semibold tracking-tight">{label}</span>
    </button>
  )
}

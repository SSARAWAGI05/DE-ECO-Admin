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
          hourly_rate
        )
      `)
      .lt('end_datetime', now)
      .neq('status', 'cancelled')

    const months: Record<string, number> = {}
    
    for(let i=5; i>=0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthName = d.toLocaleString('default', { month: 'short' })
      months[monthName] = 0
    }

    if (data) {
      data.forEach((c: any) => {
        const d = new Date(c.scheduled_datetime)
        const monthName = d.toLocaleString('default', { month: 'short' })
        if (months[monthName] !== undefined) {
          const rate = c.profiles?.hourly_rate || 0
          const amount = (c.duration_minutes / 60) * rate
          months[monthName] += amount
        }
      })
    }

    const formattedData = Object.keys(months).map(m => ({
      name: m,
      Earnings: Math.round(months[m])
    }))

    setChartData(formattedData)
  }

  /* ================= UI ================= */

  return (
    <div className="p-6 lg:p-8 space-y-10 bg-gray-50 min-h-full">
      {/* HERO */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-md border border-slate-800">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">
          Welcome back 👋
        </h1>
        <p className="text-slate-400 font-medium">
          Here’s what’s happening on DE-ECO today
        </p>
      </div>

      {/* SIGNAL STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Stat label="Upcoming Classes" value={stats.upcoming} icon={Calendar} accent="indigo" />
        <Stat label="Live Now" value={stats.ongoing} icon={Zap} accent="rose" />
        <Stat label="New Enrollments" value={stats.enrollments} icon={Users} accent="emerald" />
        <Stat label="New Messages" value={stats.messages} icon={Mail} accent="slate" />
      </div>

      {/* EARNINGS CHART */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold mb-6 text-slate-900">Earnings Overview (Last 6 Months)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} tickFormatter={(value) => `₹${value}`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ color: '#0f172a', fontWeight: 700 }}
                formatter={(value: any) => [`₹${value}`, 'Earnings']}
              />
              <Area type="monotone" dataKey="Earnings" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CLASSES */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-5">
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
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-5">
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
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-xl font-bold mb-5 text-slate-900">
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function Action({ icon: Icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm transition bg-white text-slate-700 hover:text-indigo-700 group"
    >
      <Icon className="w-7 h-7 text-slate-400 group-hover:text-indigo-600 transition-colors" />
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </button>
  )
}

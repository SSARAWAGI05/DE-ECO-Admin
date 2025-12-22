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

export default function Dashboard() {
  const [stats, setStats] = useState({
    upcoming: 0,
    ongoing: 0,
    enrollments: 0,
    messages: 0,
  })

  const [classes, setClasses] = useState<LiveClass[]>([])
  const [activity, setActivity] = useState<Activity[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    await Promise.all([
      fetchStats(),
      fetchClasses(),
      fetchActivity(),
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

  /* ================= UI ================= */

  return (
    <div className="p-6 lg:p-8 space-y-10 bg-gray-50 min-h-full">
      {/* HERO */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-1">
          Welcome back 👋
        </h1>
        <p className="opacity-90">
          Here’s what’s happening on DE-ECO today
        </p>
      </div>

      {/* SIGNAL STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Stat label="Upcoming Classes" value={stats.upcoming} icon={Calendar} accent="green" />
        <Stat label="Live Now" value={stats.ongoing} icon={Zap} accent="red" />
        <Stat label="New Enrollments" value={stats.enrollments} icon={Users} accent="purple" />
        <Stat label="New Messages" value={stats.messages} icon={Mail} accent="blue" />
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
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-5">
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Action icon={Plus} label="Schedule Class" />
          <Action icon={FileText} label="Post Announcement" />
          <Action icon={PlayCircle} label="Add Recording" />
          <Action icon={TrendingUp} label="Market Pulse" />
        </div>
      </div>
    </div>
  )
}

/* ================= SUB COMPONENTS ================= */

function Stat({ label, value, icon: Icon, accent }: any) {
  const colors: any = {
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

function Action({ icon: Icon, label }: any) {
  return (
    <button className="flex flex-col items-center justify-center gap-2 border rounded-xl p-5 hover:shadow-md transition bg-gray-50">
      <Icon className="w-6 h-6 text-green-600" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

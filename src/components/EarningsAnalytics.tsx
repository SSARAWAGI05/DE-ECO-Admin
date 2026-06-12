import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import { Calendar, TrendingUp, DollarSign, Users, ChevronDown } from 'lucide-react'

// --- TYPES ---
interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  hourly_rate: number
  billing_currency: string
}

interface LiveClass {
  id: string
  user_id: string
  title: string
  duration_minutes: number
  scheduled_datetime: string
}

type Timeframe = 'daily' | 'weekly' | 'monthly'

// Constants
const CURRENCY_SYMBOL: Record<string, string> = {
  INR: '₹', USD: '$', CHF: '₣', EUR: '€', GBP: '£'
}

export default function EarningsAnalytics() {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [timeframe, setTimeframe] = useState<Timeframe>('daily')
  const [loading, setLoading] = useState(true)
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    // Fetch profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, hourly_rate, billing_currency')

    const profileMap: Record<string, Profile> = {}
    if (profilesData) {
      profilesData.forEach(p => {
        profileMap[p.id] = p
      })
    }
    setProfiles(profileMap)

    // Fetch classes
    const { data: classesData } = await supabase
      .from('live_classes')
      .select('id, user_id, title, duration_minutes, scheduled_datetime, status')
      .neq('status', 'cancelled')
      .order('scheduled_datetime', { ascending: true })

    if (classesData) {
      setClasses(classesData)
    }

    setLoading(false)
  }

  // --- AGGREGATION LOGIC ---
  const chartData = useMemo(() => {
    if (!classes.length || Object.keys(profiles).length === 0) return []

    const aggregated: Record<string, { key: string, label: string, totalINR: number, classes: any[] }> = {}

    classes.forEach(c => {
      // Ignore if scheduled in the future? No, user might want to see projected earnings.
      // Or maybe only past? The prompt says "earning trends properly". We will show all.
      
      const date = new Date(c.scheduled_datetime)
      // Check invalid date
      if (isNaN(date.getTime())) return

      const profile = profiles[c.user_id]
      if (!profile) return

      const hours = c.duration_minutes / 60
      const rate = profile.hourly_rate || 0
      let earned = hours * rate

      // Normalize to INR for aggregate chart if currencies differ
      // Hardcoded rough conversion for demonstration if needed, but assuming most are INR.
      // If CHF, multiply by ~95. USD by ~83.
      if (profile.billing_currency === 'CHF') earned *= 95
      else if (profile.billing_currency === 'USD') earned *= 83
      else if (profile.billing_currency === 'EUR') earned *= 90
      else if (profile.billing_currency === 'GBP') earned *= 105

      // Timeframe Key Generation
      let key = ''
      let label = ''

      if (timeframe === 'daily') {
        key = date.toISOString().split('T')[0] // YYYY-MM-DD
        label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      } else if (timeframe === 'weekly') {
        // Find start of week (Sunday)
        const d = new Date(date)
        d.setDate(d.getDate() - d.getDay())
        key = d.toISOString().split('T')[0]
        label = `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      } else if (timeframe === 'monthly') {
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        label = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      }

      if (!aggregated[key]) {
        aggregated[key] = { key, label, totalINR: 0, classes: [] }
      }

      aggregated[key].totalINR += earned
      aggregated[key].classes.push({
        ...c,
        earnedOriginal: hours * rate,
        currency: profile.billing_currency || 'INR',
        studentName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'
      })
    })

    const sortedData = Object.values(aggregated).sort((a, b) => a.key.localeCompare(b.key))
    
    return sortedData
  }, [classes, profiles, timeframe])

  useEffect(() => {
    // Auto-select latest date key if none selected
    if (chartData.length > 0) {
      const exists = chartData.find(d => d.key === selectedDateKey)
      if (!exists && timeframe !== 'daily') {
        setSelectedDateKey(chartData[chartData.length - 1].key)
      } else if (!exists && timeframe === 'daily' && !selectedDateKey) {
        setSelectedDateKey(chartData[chartData.length - 1].key)
      }
    }
  }, [chartData, selectedDateKey, timeframe])

  // --- DERIVED VIEW DATA ---
  const selectedDetails = useMemo(() => {
    if (!selectedDateKey) return null
    return chartData.find(d => d.key === selectedDateKey)
  }, [chartData, selectedDateKey])

  const totalAllTime = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.totalINR, 0)
  }, [chartData])

  // --- UI ---
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full flex flex-col min-h-screen">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-1">Earnings Analytics</h1>
          <p className="text-slate-500 font-medium">Track your revenue trends and student contributions.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-lg shadow-inner">
            {(['daily', 'weekly', 'monthly'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf)
                  setSelectedDateKey(null)
                }}
                className={`px-5 py-2 rounded-md text-sm font-bold capitalize transition-colors ${
                  timeframe === tf ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SUMMARY HERO CARD */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 mb-8 text-white shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative z-10">
          <h2 className="text-slate-400 font-medium tracking-wide uppercase text-sm mb-2">
            Earnings for {selectedDetails ? selectedDetails.label : 'Selected Period'}
          </h2>
          <div className="text-4xl sm:text-5xl font-black">
            ₹{selectedDetails ? Math.round(selectedDetails.totalINR).toLocaleString() : '0'}
          </div>
        </div>
        <div className="relative z-10 flex items-center">
          {timeframe === 'daily' ? (
            <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
              <Calendar size={18} className="text-slate-400 ml-2" />
              <input 
                type="date"
                value={selectedDateKey || ''}
                onChange={(e) => setSelectedDateKey(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-900 outline-none pr-2 cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
              <Calendar size={18} className="text-slate-400 ml-2" />
              <select 
                value={selectedDateKey || ''}
                onChange={(e) => setSelectedDateKey(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-900 outline-none pr-8 cursor-pointer"
              >
                <option value="" disabled>Select {timeframe}</option>
                {chartData.map(d => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {/* Decorative background circle */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-50 pointer-events-none" />
      </div>

      <div className="flex flex-col gap-8">
        {/* CONTRIBUTIONS BREAKDOWN */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users size={18} className="text-slate-400" />
            Class Breakdown
          </h3>
          
          {!selectedDetails || selectedDetails.classes.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center text-slate-400">
              <Calendar size={32} className="opacity-20 mb-3" />
              <p className="font-medium">No classes scheduled for this period.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDetails.classes.map((cls, idx) => (
                <div key={idx} className="flex flex-col gap-3 p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-bold text-slate-900 text-lg">{cls.studentName}</div>
                    <div className="text-right shrink-0 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md">
                      <div className="font-bold text-sm">
                        {CURRENCY_SYMBOL[cls.currency] || cls.currency}{Math.round(cls.earnedOriginal).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium border-t border-slate-100 pt-3">
                    <div className="text-slate-500 truncate pr-2">
                      {cls.title}
                    </div>
                    <div className="text-slate-600 shrink-0 flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded">
                      <TrendingUp size={14} className="text-slate-400" />
                      {cls.duration_minutes}m
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* REVENUE TREND CHART */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-slate-400" />
            Revenue Trend ({timeframe})
          </h3>
          
          <div className="w-full h-[240px]">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} onClick={(e) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    setSelectedDateKey(e.activePayload[0].payload.key)
                  }
                }}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(val) => `₹${val}`}
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700">
                            <p className="font-bold mb-1">{data.label}</p>
                            <p className="text-emerald-400 font-medium">₹{Math.round(data.totalINR).toLocaleString()}</p>
                            <p className="text-xs text-slate-400 mt-1">{data.classes.length} classes</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalINR" 
                    stroke="#0f172a" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorEarnings)" 
                    activeDot={{ r: 6, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

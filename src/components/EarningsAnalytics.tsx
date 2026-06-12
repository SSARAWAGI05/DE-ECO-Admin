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
  const [timeframe, setTimeframe] = useState<Timeframe>('monthly')
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
    
    // Auto-select latest date key if none selected
    if (sortedData.length > 0 && (!selectedDateKey || !aggregated[selectedDateKey])) {
      setSelectedDateKey(sortedData[sortedData.length - 1].key)
    }

    return sortedData
  }, [classes, profiles, timeframe])

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
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full flex flex-col h-full space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-1">Earnings Analytics</h1>
          <p className="text-slate-500 font-medium">Track your revenue trends and student contributions over time.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg shrink-0">
          {(['daily', 'weekly', 'monthly'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                setTimeframe(tf)
                setSelectedDateKey(null)
              }}
              className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-colors ${
                timeframe === tf ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* TOP STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            Total Earnings (Est. INR)
          </div>
          <div className="text-3xl font-black text-slate-900">₹{Math.round(totalAllTime).toLocaleString()}</div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            Selected Period ({selectedDetails?.label || '-'})
          </div>
          <div className="text-3xl font-black text-slate-900">
            ₹{selectedDetails ? Math.round(selectedDetails.totalINR).toLocaleString() : '0'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-slate-500 font-medium mb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users size={20} />
            </div>
            Active Students
          </div>
          <div className="text-3xl font-black text-slate-900">
            {Object.keys(profiles).length}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT STACK */}
      <div className="flex flex-col gap-6">
        
        {/* CHART SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-slate-400" />
            Revenue Trend ({timeframe})
          </h2>
          
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
          <p className="text-center text-xs text-slate-400 mt-4 font-medium">
            *Click on a data point to see the breakdown below. Foreign currencies are roughly converted to INR.
          </p>
        </div>

        {/* DETAILS SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              Contributions Breakdown
            </h2>
            
            {timeframe === 'daily' ? (
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Date</label>
                <input 
                  type="date"
                  value={selectedDateKey || ''}
                  onChange={(e) => setSelectedDateKey(e.target.value)}
                  className="w-full border border-slate-300 p-2 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium mt-1">
                {selectedDetails ? selectedDetails.label : 'Select a point on the chart'}
              </p>
            )}
          </div>
          
          <div className="p-4 sm:p-6 bg-white">
            {!selectedDetails || selectedDetails.classes.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Users size={32} className="opacity-20" />
                <p className="font-medium text-sm">No classes for this period.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedDetails.classes.map((cls, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-4 rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-slate-900">{cls.studentName}</div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-emerald-600">
                          {CURRENCY_SYMBOL[cls.currency] || cls.currency}{Math.round(cls.earnedOriginal).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end text-xs font-medium mt-1">
                      <div className="text-slate-500 truncate pr-2">
                        {cls.title}
                      </div>
                      <div className="text-slate-400 shrink-0 bg-white border border-slate-200 px-2 py-1 rounded">
                        {cls.duration_minutes}m
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

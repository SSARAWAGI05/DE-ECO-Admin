import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import { Calendar, TrendingUp, DollarSign, Users, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

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

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'custom'

// Constants
const CURRENCY_SYMBOL: Record<string, string> = {
  INR: '₹', USD: '$', CHF: '₣', EUR: '€', GBP: '£'
}

interface CourseEnrollment {
  user_id: string
  custom_hourly_rate: number | null
  courses: {
    title: string
  }
}

export default function EarningsAnalytics() {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([])
  const [timeframe, setTimeframe] = useState<Timeframe>('daily')
  const [loading, setLoading] = useState(true)
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchData()
    fetch('https://open.er-api.com/v6/latest/INR')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setExchangeRates(data.rates)
        }
      })
      .catch(err => console.error('Failed to fetch exchange rates', err))
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

    const { data: courseEnrollData } = await supabase
      .from('course_enrollments')
      .select('user_id, custom_hourly_rate, courses(title)')

    if (courseEnrollData) {
      setCourseEnrollments(courseEnrollData)
    }

    setLoading(false)
  }

  // --- AGGREGATION LOGIC ---
  const { chartData, availableCurrencies } = useMemo(() => {
    if (!classes.length || Object.keys(profiles).length === 0) return { chartData: [], availableCurrencies: ['INR'] }

    const aggregated: Record<string, { key: string, label: string, totals: Record<string, number>, classes: any[] }> = {}
    const currs = new Set<string>()

    classes.forEach(c => {
      // Ignore if scheduled in the future? No, user might want to see projected earnings.
      // Or maybe only past? The prompt says "earning trends properly". We will show all.
      
      const date = new Date(c.scheduled_datetime)
      // Check invalid date
      if (isNaN(date.getTime())) return

      const profile = profiles[c.user_id]
      if (!profile) return

      const hours = c.duration_minutes / 60
      
      const userEnrollments = courseEnrollments.filter(e => e.user_id === c.user_id)
      const match = userEnrollments.find(e => {
        const courseTitle = Array.isArray(e.courses) ? e.courses[0]?.title : e.courses?.title;
        return (courseTitle || '').trim().toLowerCase() === (c.title || '').trim().toLowerCase();
      })
      const rate = match && match.custom_hourly_rate != null ? match.custom_hourly_rate : (profile.hourly_rate || 0)
      
      const earned = hours * rate
      const currency = profile.billing_currency || 'INR'
      currs.add(currency)

      // Timeframe Key Generation
      let key = ''
      let label = ''

      if (timeframe === 'daily') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        key = `${year}-${month}-${day}`
        label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      } else if (timeframe === 'weekly') {
        // Find start of week (Sunday)
        const start = new Date(date)
        start.setDate(start.getDate() - start.getDay())
        
        // Find end of week (Saturday)
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        
        const year = start.getFullYear();
        const month = String(start.getMonth() + 1).padStart(2, '0');
        const day = String(start.getDate()).padStart(2, '0');
        key = `${year}-${month}-${day}`
        const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
        label = `${start.toLocaleDateString(undefined, formatOpts)} - ${end.toLocaleDateString(undefined, formatOpts)}`
      } else if (timeframe === 'monthly') {
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        label = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      } else if (timeframe === 'custom') {
        if (customStart && date < new Date(customStart)) return
        if (customEnd && date > new Date(customEnd + 'T23:59:59.999Z')) return
        key = 'custom'
        label = `${customStart || 'Start'} to ${customEnd || 'End'}`
      }

      if (!aggregated[key]) {
        aggregated[key] = { key, label, totals: {}, classes: [] }
      }

      aggregated[key].totals[currency] = (aggregated[key].totals[currency] || 0) + earned
      aggregated[key].classes.push({
        ...c,
        earnedOriginal: earned,
        currency,
        studentName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'
      })
    })

    const sortedData = Object.values(aggregated).sort((a, b) => a.key.localeCompare(b.key))
    const availCurrs = Array.from(currs).length > 0 ? Array.from(currs) : ['INR']
    
    return { chartData: sortedData, availableCurrencies: availCurrs }
  }, [classes, profiles, timeframe, customStart, customEnd, courseEnrollments])

  useEffect(() => {
    if (timeframe === 'custom') {
      setSelectedDateKey('custom')
    } else if (chartData.length > 0) {
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
    const totals: Record<string, number> = {}
    chartData.forEach(d => {
      Object.entries(d.totals).forEach(([curr, amount]) => {
        totals[curr] = (totals[curr] || 0) + amount
      })
    })
    return totals
  }, [chartData])

  // --- UI ---
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 border-t-slate-900 rounded-full" />
      </div>
    )
  }

  const handlePrev = () => {
    if (timeframe === 'daily') {
      if (!selectedDateKey) return
      const [y, m, d_num] = selectedDateKey.split('-').map(Number)
      const d = new Date(y, m - 1, d_num)
      d.setDate(d.getDate() - 1)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      setSelectedDateKey(`${year}-${month}-${day}`)
    } else {
      const idx = chartData.findIndex(d => d.key === selectedDateKey)
      if (idx > 0) {
        setSelectedDateKey(chartData[idx - 1].key)
      }
    }
  }

  const handleNext = () => {
    if (timeframe === 'daily') {
      if (!selectedDateKey) return
      const [y, m, d_num] = selectedDateKey.split('-').map(Number)
      const d = new Date(y, m - 1, d_num)
      d.setDate(d.getDate() + 1)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      setSelectedDateKey(`${year}-${month}-${day}`)
    } else {
      const idx = chartData.findIndex(d => d.key === selectedDateKey)
      if (idx !== -1 && idx < chartData.length - 1) {
        setSelectedDateKey(chartData[idx + 1].key)
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full flex flex-col min-h-screen">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight mb-1">Earnings Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Track your revenue trends and student contributions.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-neutral-800 p-1.5 rounded-lg shadow-inner">
            {(['daily', 'weekly', 'monthly', 'custom'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf)
                  setSelectedDateKey(null)
                }}
                className={`px-5 py-2 rounded-md text-sm font-bold capitalize transition-colors ${
                  timeframe === tf ? 'bg-white dark:bg-neutral-900 dark:bg-white shadow-sm text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SUMMARY HERO CARD */}
      <div className="bg-slate-900 dark:bg-white rounded-2xl p-6 sm:p-8 mb-8 text-white dark:text-slate-900 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative z-10">
          <h2 className="text-slate-400 font-medium tracking-wide uppercase text-sm mb-2">
            Earnings for {selectedDetails ? selectedDetails.label : 'Selected Period'}
          </h2>
          <div className="flex flex-col gap-1">
            {!selectedDetails || Object.keys(selectedDetails.totals).length === 0 ? (
              <div className="text-4xl sm:text-5xl font-black">₹0</div>
            ) : (
              Object.entries(selectedDetails.totals).map(([curr, amount]) => (
                <div key={curr} className="text-3xl sm:text-4xl font-black">
                  {CURRENCY_SYMBOL[curr] || curr}{Math.round(amount).toLocaleString()}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          {timeframe !== 'custom' && (
            <button onClick={handlePrev} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors border border-slate-700/50">
              <ChevronLeft size={18} />
            </button>
          )}
          
          {timeframe === 'custom' ? (
            <div className="flex items-center gap-2">
              <input 
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-white dark:bg-neutral-900 dark:bg-white text-sm font-bold text-slate-900 dark:text-slate-50 outline-none p-2 rounded-lg cursor-pointer"
              />
              <span className="text-slate-400">to</span>
              <input 
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-white dark:bg-neutral-900 dark:bg-white text-sm font-bold text-slate-900 dark:text-slate-50 outline-none p-2 rounded-lg cursor-pointer"
              />
            </div>
          ) : timeframe === 'daily' ? (
            <div className="flex items-center gap-3 bg-white dark:bg-neutral-900 dark:bg-white border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-2 rounded-lg shadow-sm">
              <Calendar size={18} className="text-slate-400 ml-2" />
              <input 
                type="date"
                value={selectedDateKey || ''}
                onChange={(e) => setSelectedDateKey(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-900 dark:text-slate-50 outline-none pr-2 cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white dark:bg-neutral-900 dark:bg-white border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-2 rounded-lg shadow-sm">
              <Calendar size={18} className="text-slate-400 ml-2" />
              <select 
                value={selectedDateKey || ''}
                onChange={(e) => setSelectedDateKey(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-900 dark:text-slate-50 outline-none pr-8 cursor-pointer"
              >
                <option value="" disabled>Select {timeframe}</option>
                {chartData.map(d => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {timeframe !== 'custom' && (
            <button onClick={handleNext} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors border border-slate-700/50">
              <ChevronRight size={18} />
            </button>
          )}
        </div>
        
        {/* Decorative background circle */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-50 pointer-events-none" />
      </div>

      <div className="flex flex-col gap-8">
        {/* CONTRIBUTIONS BREAKDOWN */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
            <Users size={18} className="text-slate-400" />
            Class Breakdown
          </h3>
          
          {!selectedDetails || selectedDetails.classes.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 dark:bg-white border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 border-dashed rounded-2xl py-12 flex flex-col items-center justify-center text-slate-400">
              <Calendar size={32} className="opacity-20 mb-3" />
              <p className="font-medium">No classes scheduled for this period.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDetails.classes.map((cls, idx) => (
                <div key={idx} className="flex flex-col gap-3 p-5 rounded-xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 bg-white dark:bg-neutral-900 dark:bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-bold text-slate-900 dark:text-slate-50 text-lg">{cls.studentName}</div>
                    <div className="text-right shrink-0 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md">
                      <div className="font-bold text-sm">
                        {CURRENCY_SYMBOL[cls.currency] || cls.currency}{Math.round(cls.earnedOriginal).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium border-t border-slate-100 dark:border-neutral-800 dark:border-neutral-700/50 pt-3">
                    <div className="text-slate-500 dark:text-slate-400 truncate pr-2">
                      {cls.title}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 shrink-0 flex items-center gap-1.5 bg-slate-100 dark:bg-neutral-800 px-2 py-1 rounded">
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
        <div className="bg-white dark:bg-neutral-900 dark:bg-white rounded-2xl border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 shadow-sm p-4 sm:p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <TrendingUp size={18} className="text-slate-400" />
              Revenue Trend ({timeframe}) (in INR)
            </h3>
          </div>
          
          <div className="w-full h-[240px]">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.map(d => {
                  let inrTotal = 0;
                  Object.entries(d.totals).forEach(([curr, amount]) => {
                    if (curr === 'INR') {
                      inrTotal += amount;
                    } else if (exchangeRates[curr]) {
                      inrTotal += amount / exchangeRates[curr];
                    } else {
                      inrTotal += amount;
                    }
                  });
                  return { ...d, chartTotal: inrTotal };
                })} onClick={(e) => {
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
                          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-3 rounded-lg shadow-xl border border-slate-700">
                            <p className="font-bold mb-1">{data.label}</p>
                            <p className="text-emerald-400 font-medium">₹{Math.round(data.chartTotal).toLocaleString()}</p>
                            <p className="text-xs text-slate-400 mt-1">{data.classes.length} classes</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="chartTotal" 
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

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  DollarSign, Clock, Users, Edit3, Check, X, 
  TrendingUp, Calendar as CalendarIcon, 
  Search, Filter, ArrowUpDown
} from 'lucide-react'

/* ================= TYPES & CONSTANTS ================= */

// We ignore all classes scheduled before this date for billing purposes.
const BILLING_START_DATE = new Date('2026-06-11T00:00:00')

const CURRENCIES = [
  { code: 'INR', symbol: '₹' },
  { code: 'USD', symbol: '$' },
  { code: 'CHF', symbol: '₣' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' }
]

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  hourly_rate: number
  billing_currency: string
}

interface LiveClass {
  id: string
  user_id: string
  duration_minutes: number
  scheduled_datetime: string
  status: string
}

type FilterPeriod = 'current_month' | 'last_month' | 'all_time'
type SortOption = 'name_asc' | 'amount_desc' | 'hours_desc'

/* ================= COMPONENT ================= */

export default function StudentBilling() {
  /* ---------- STATE ---------- */
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  
  // Filters & Sorting
  const [period, setPeriod] = useState<FilterPeriod>('current_month')
  const [searchTerm, setSearchTerm] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('name_asc')
  
  // Inline Editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRate, setEditRate] = useState<string>('')
  const [editCurrency, setEditCurrency] = useState<string>('INR')

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    fetchData()
  }, [])

  /* ================= DATA FETCHING ================= */
  const fetchData = async () => {
    const { data: profilesData, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, hourly_rate, billing_currency')
      .order('first_name')

    if (profilesErr) console.error('Failed to fetch profiles:', profilesErr)
    else setProfiles(profilesData ?? [])

    const { data: classesData, error: classesErr } = await supabase
      .from('live_classes')
      .select('id, user_id, duration_minutes, scheduled_datetime, status')
      .neq('status', 'cancelled')

    if (classesErr) console.error('Failed to fetch classes:', classesErr)
    else setClasses(classesData ?? [])
  }

  /* ================= ACTIONS ================= */
  const startEdit = (profile: Profile) => {
    setEditingId(profile.id)
    setEditRate(profile.hourly_rate?.toString() || '0')
    setEditCurrency(profile.billing_currency || 'INR')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditRate('')
  }

  const saveBillingDetails = async (userId: string) => {
    const numRate = parseFloat(editRate)
    if (isNaN(numRate) || numRate < 0) {
      alert("Please enter a valid rate.")
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        hourly_rate: numRate,
        billing_currency: editCurrency
      })
      .eq('id', userId)

    if (error) {
      console.error("Failed to update billing details", error)
      alert("Failed to update billing details: " + error.message)
      return
    }

    // Optimistic update
    setProfiles((prev) => 
      prev.map(p => p.id === userId ? { ...p, hourly_rate: numRate, billing_currency: editCurrency } : p)
    )
    setEditingId(null)
  }

  /* ================= CALCULATION LOGIC ================= */
  const filteredClasses = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return classes.filter(c => {
      const classDate = new Date(c.scheduled_datetime)
      
      // CRITICAL: Ignore any classes scheduled before Today (June 11, 2026)
      if (classDate < BILLING_START_DATE) return false

      if (period === 'all_time') return true
      if (period === 'current_month') {
        return classDate.getMonth() === currentMonth && classDate.getFullYear() === currentYear
      }
      if (period === 'last_month') {
        let lastMonth = currentMonth - 1
        let year = currentYear
        if (lastMonth < 0) {
          lastMonth = 11
          year -= 1
        }
        return classDate.getMonth() === lastMonth && classDate.getFullYear() === year
      }
      return true
    })
  }, [classes, period])

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || '₹'
  }

  // Calculate stats for a single user
  const getUserStats = (userId: string, rate: number) => {
    const studentClasses = filteredClasses.filter(c => c.user_id === userId)
    const totalMinutes = studentClasses.reduce((sum, c) => sum + c.duration_minutes, 0)
    const totalHours = totalMinutes / 60
    return {
      classCount: studentClasses.length,
      totalHours,
      amountDue: totalHours * (rate || 0)
    }
  }

  // Pre-calculate all stats for filtering and sorting
  const profilesWithStats = useMemo(() => {
    return profiles.map(p => ({
      ...p,
      stats: getUserStats(p.id, p.hourly_rate)
    }))
  }, [profiles, filteredClasses])

  // Apply Search, Filter, and Sort
  const processedProfiles = useMemo(() => {
    let result = [...profilesWithStats]

    // 1. Search Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p => 
        p.first_name?.toLowerCase().includes(term) ||
        p.last_name?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term)
      )
    }

    // 2. Active Only Filter
    if (showActiveOnly) {
      result = result.filter(p => p.stats.classCount > 0)
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'amount_desc') {
        return b.stats.amountDue - a.stats.amountDue
      } else if (sortBy === 'hours_desc') {
        return b.stats.totalHours - a.stats.totalHours
      } else {
        // default: name_asc
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim()
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim()
        return nameA.localeCompare(nameB)
      }
    })

    return result
  }, [profilesWithStats, searchTerm, showActiveOnly, sortBy])

  // Summary Stats
  const summaryStats = useMemo(() => {
    let activeStudents = 0
    let totalScheduledHours = 0
    
    profilesWithStats.forEach(p => {
      if (p.stats.classCount > 0) activeStudents++
      totalScheduledHours += p.stats.totalHours
    })

    return { activeStudents, totalScheduledHours }
  }, [profilesWithStats])

  /* ================= UI ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-gray-50 overflow-hidden">
      
      {/* HEADER & TIME PERIOD CONTROL */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Student Billing</h1>
          <p className="text-gray-500">Manage hourly rates and auto-calculate invoice amounts.</p>
        </div>

        <div className="flex items-center bg-white border rounded-lg shadow-sm p-1">
          <CalendarIcon size={18} className="text-gray-400 ml-3 mr-2" />
          <select
            className="p-2 border-none bg-transparent focus:ring-0 font-medium text-gray-700 cursor-pointer"
            value={period}
            onChange={(e) => setPeriod(e.target.value as FilterPeriod)}
          >
            <option value="current_month">Current Month</option>
            <option value="last_month">Last Month</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Students (Filtered)</p>
            <p className="text-2xl font-bold text-gray-900">{summaryStats.activeStudents}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-lg text-green-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Scheduled Hours</p>
            <p className="text-2xl font-bold text-gray-900">{summaryStats.totalScheduledHours.toFixed(1)} hrs</p>
          </div>
        </div>
      </div>

      {/* CONTROL PANEL: Search, Filter, Sort */}
      <div className="bg-white p-4 rounded-t-xl border border-b-0 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Active Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors bg-gray-50 px-3 py-2 rounded-lg border">
            <Filter size={16} className={showActiveOnly ? "text-blue-600" : "text-gray-400"} />
            <span className="hidden sm:inline">Active Only</span>
            <input 
              type="checkbox" 
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
            />
          </label>

          {/* Sort Dropdown */}
          <div className="flex items-center bg-gray-50 border rounded-lg px-3 py-2">
            <ArrowUpDown size={16} className="text-gray-400 mr-2" />
            <select
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 cursor-pointer p-0 pr-6"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="name_asc">Sort: A-Z</option>
              <option value="amount_desc">Sort: Highest Due</option>
              <option value="hours_desc">Sort: Most Hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE DATA */}
      <div className="bg-white rounded-b-xl shadow-sm border overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1 relative">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider bg-gray-50">Student</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider bg-gray-50">Hourly Rate</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider bg-gray-50">Activity</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider bg-gray-50">Total Hours</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider bg-gray-50">Amount Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                      <Search className="text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900">No students found</p>
                    <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                processedProfiles.map((profile) => {
                  const stats = profile.stats
                  const currencySymbol = getCurrencySymbol(profile.billing_currency || 'INR')
                  const isActive = stats.classCount > 0

                  return (
                    <tr key={profile.id} className="hover:bg-blue-50/50 transition-colors">
                      {/* Name */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {profile.first_name} {profile.last_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{profile.email}</div>
                      </td>

                      {/* Hourly Rate Editor */}
                      <td className="p-4 whitespace-nowrap">
                        {editingId === profile.id ? (
                          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border">
                            <select 
                              className="bg-transparent border-r border-gray-300 pr-2 py-1 text-sm font-medium text-gray-700 focus:outline-none"
                              value={editCurrency}
                              onChange={(e) => setEditCurrency(e.target.value)}
                            >
                              {CURRENCIES.map(c => (
                                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              className="w-16 bg-transparent border-none p-1 text-sm font-medium focus:ring-0"
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              placeholder="Rate"
                              autoFocus
                            />
                            <div className="flex border-l border-gray-300 pl-1">
                              <button onClick={() => saveBillingDetails(profile.id)} className="text-green-600 hover:bg-green-100 p-1.5 rounded transition-colors">
                                <Check size={16} />
                              </button>
                              <button onClick={cancelEdit} className="text-red-500 hover:bg-red-100 p-1.5 rounded transition-colors">
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 group">
                            <span className="font-semibold text-gray-800 bg-gray-100 px-3 py-1 rounded-md">
                              {currencySymbol} {profile.hourly_rate || 0}
                            </span>
                            <button 
                              onClick={() => startEdit(profile)}
                              className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-all p-1 bg-blue-50 hover:bg-blue-100 rounded"
                              title="Edit Rate & Currency"
                            >
                              <Edit3 size={14} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Activity Status */}
                      <td className="p-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium text-xs border border-green-200">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            {stats.classCount} Classes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium text-xs border border-gray-200">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Total Hours */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                          <Clock size={16} className={isActive ? "text-blue-500" : "text-gray-300"} />
                          {stats.totalHours.toFixed(1)} <span className="text-sm font-normal text-gray-500">hrs</span>
                        </span>
                      </td>

                      {/* Amount Due */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center font-bold text-lg ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {currencySymbol} {stats.amountDue.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  DollarSign, Clock, Users, Edit3, Check, X, 
  TrendingUp, Calendar as CalendarIcon, 
  Search, Filter, ArrowUpDown, AlertCircle, History
} from 'lucide-react'

/* ================= TYPES & CONSTANTS ================= */

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
  is_active: boolean
  total_paid: number // Added to track manual settlements
  manual_outstanding: number // Track manual extra charges
}

interface LiveClass {
  id: string
  user_id: string
  duration_minutes: number
  scheduled_datetime: string
  status: string
}

interface BillingHistory {
  id: string
  user_id: string
  type: 'SETTLEMENT' | 'CHARGE'
  amount: number
  description: string | null
  created_at: string
  undone: boolean
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
  const [showActiveOnly, setShowActiveOnly] = useState(true) // User requested default to active
  const [sortBy, setSortBy] = useState<SortOption>('name_asc')

  // Settlement Modal State
  const [settleProfile, setSettleProfile] = useState<Profile | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [isSettling, setIsSettling] = useState(false)

  // Add Charge Modal State
  const [chargeProfile, setChargeProfile] = useState<Profile | null>(null)
  const [chargeAmount, setChargeAmount] = useState('')
  const [isCharging, setIsCharging] = useState(false)

  // History Modal State
  const [historyProfile, setHistoryProfile] = useState<Profile | null>(null)
  const [historyData, setHistoryData] = useState<BillingHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  
  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    fetchData()
  }, [])

  /* ================= DATA FETCHING ================= */
  const fetchData = async () => {
    const { data: profilesData, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, hourly_rate, billing_currency, is_active, total_paid, manual_outstanding')
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

  /* ================= CALCULATION LOGIC ================= */
  const filteredClasses = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return classes.filter(c => {
      const classDate = new Date(c.scheduled_datetime)

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
  const getUserStats = (userId: string, rate: number, isActiveProfile: boolean, totalPaid: number, manualOutstanding: number) => {
    const studentClasses = filteredClasses.filter(c => c.user_id === userId)
    const allTimeClasses = classes.filter(c => c.user_id === userId)
    
    // Period specific
    const periodMinutes = studentClasses.reduce((sum, c) => sum + c.duration_minutes, 0)
    const periodHours = periodMinutes / 60
    
    // All time specific (for total due calculation)
    const allTimeMinutes = allTimeClasses.reduce((sum, c) => sum + c.duration_minutes, 0)
    const allTimeHours = allTimeMinutes / 60
    
    const allTimeDue = (allTimeHours * (rate || 0)) + (manualOutstanding || 0) - (totalPaid || 0)

    return {
      classCount: studentClasses.length,
      totalHours: periodHours,
      periodAmountDue: periodHours * (rate || 0),
      totalDue: allTimeDue, // Overall remaining balance
      isEnrolled: isActiveProfile
    }
  }

  // Pre-calculate all stats for filtering and sorting
  const profilesWithStats = useMemo(() => {
    return profiles.map(p => ({
      ...p,
      stats: getUserStats(p.id, p.hourly_rate, p.is_active, p.total_paid, p.manual_outstanding)
    }))
  }, [profiles, filteredClasses, classes])

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
    // In the billing context, "Active" means they are officially enrolled (is_active) AND have classes scheduled.
    if (showActiveOnly) {
      result = result.filter(p => p.stats.classCount > 0 && p.stats.isEnrolled)
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'amount_desc') {
        return b.stats.totalDue - a.stats.totalDue
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
    let totalOutstandingDue: Record<string, number> = {}
    
    profilesWithStats.forEach(p => {
      if (p.stats.classCount > 0 && p.stats.isEnrolled) activeStudents++
      totalScheduledHours += p.stats.totalHours
      
      if (p.stats.totalDue > 0) {
        const currency = p.billing_currency || 'INR'
        totalOutstandingDue[currency] = (totalOutstandingDue[currency] || 0) + p.stats.totalDue
      }
    })

    return { activeStudents, totalScheduledHours, totalOutstandingDue }
  }, [profilesWithStats])

  /* ================= HANDLERS ================= */
  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settleProfile) return
    
    const amount = parseFloat(settleAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive amount.")
      return
    }

    setIsSettling(true)
    const newTotalPaid = (settleProfile.total_paid || 0) + amount

    const { error } = await supabase
      .from('profiles')
      .update({ total_paid: newTotalPaid })
      .eq('id', settleProfile.id)

    setIsSettling(false)

    if (error) {
      console.error("Failed to settle amount:", error)
      alert("Failed to settle: Make sure 'total_paid' column exists in 'profiles' table.")
      return
    }

    // Insert history record
    await supabase.from('billing_history').insert({
      user_id: settleProfile.id,
      type: 'SETTLEMENT',
      amount: amount,
      description: 'Manual settlement added'
    })

    setSettleProfile(null)
    setSettleAmount('')
    fetchData() // Refresh data
  }

  const handleAddChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chargeProfile) return
    
    const amount = parseFloat(chargeAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive amount.")
      return
    }

    setIsCharging(true)
    const newManualOutstanding = (chargeProfile.manual_outstanding || 0) + amount

    const { error } = await supabase
      .from('profiles')
      .update({ manual_outstanding: newManualOutstanding })
      .eq('id', chargeProfile.id)

    setIsCharging(false)

    if (error) {
      console.error("Failed to add charge:", error)
      alert("Failed to add charge: Make sure 'manual_outstanding' column exists in 'profiles' table.")
      return
    }

    // Insert history record
    await supabase.from('billing_history').insert({
      user_id: chargeProfile.id,
      type: 'CHARGE',
      amount: amount,
      description: 'Manual charge added'
    })

    setChargeProfile(null)
    setChargeAmount('')
    fetchData() // Refresh data
  }

  const handleViewHistory = async (profile: Profile) => {
    setHistoryProfile(profile)
    setIsLoadingHistory(true)
    
    const { data, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error("Error fetching history", error)
      alert("Make sure you created the billing_history table in Supabase!")
    } else {
      setHistoryData(data as BillingHistory[])
    }
    
    setIsLoadingHistory(false)
  }

  const handleUndo = async (record: BillingHistory) => {
    if (!historyProfile || record.undone) return
    if (!confirm(`Are you sure you want to undo this ${record.type}?`)) return
    
    setIsLoadingHistory(true)
    
    // Reverse the amount in profiles
    if (record.type === 'SETTLEMENT') {
      const newTotalPaid = (historyProfile.total_paid || 0) - record.amount
      await supabase.from('profiles').update({ total_paid: newTotalPaid }).eq('id', historyProfile.id)
      historyProfile.total_paid = newTotalPaid // local update
    } else if (record.type === 'CHARGE') {
      const newManualOutstanding = (historyProfile.manual_outstanding || 0) - record.amount
      await supabase.from('profiles').update({ manual_outstanding: newManualOutstanding }).eq('id', historyProfile.id)
      historyProfile.manual_outstanding = newManualOutstanding // local update
    }

    // Mark as undone
    await supabase.from('billing_history').update({ undone: true }).eq('id', record.id)
    
    fetchData() // Refresh overall data
    
    // Refresh modal
    const { data } = await supabase
      .from('billing_history')
      .select('*')
      .eq('user_id', historyProfile.id)
      .order('created_at', { ascending: false })
      
    setHistoryData((data as BillingHistory[]) || [])
    setIsLoadingHistory(false)
  }

  /* ================= UI ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full ">
      
      {/* HEADER & TIME PERIOD CONTROL */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 shrink-0 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-1">Student Billing</h1>
          <p className="text-slate-500 font-medium">Auto-calculate and settle invoice amounts for enrolled students.</p>
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 focus-within:ring-2 focus-within:ring-slate-900 transition-shadow">
          <CalendarIcon size={18} className="text-slate-400 ml-3 mr-2" />
          <select
            className="p-2.5 border-none bg-transparent focus:ring-0 font-semibold text-slate-700 cursor-pointer outline-none"
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 shrink-0">
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="bg-slate-50 p-3.5 rounded-lg text-slate-700">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Students</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{summaryStats.activeStudents}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="bg-slate-50 p-3.5 rounded-lg text-slate-700">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Scheduled Hours</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{summaryStats.totalScheduledHours.toFixed(1)} hrs</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 flex items-start gap-4">
          <div className="bg-slate-50 p-3.5 rounded-lg text-slate-700 shrink-0">
            <DollarSign size={24} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Outstanding</p>
            <div className="space-y-1 mt-1">
              {Object.keys(summaryStats.totalOutstandingDue).length === 0 ? (
                <p className="text-xl font-bold text-slate-900 tracking-tight">₹ 0.00</p>
              ) : (
                Object.entries(summaryStats.totalOutstandingDue).map(([currency, amount]) => (
                  <p key={currency} className="text-xl font-bold text-slate-900 tracking-tight">
                    <span className="text-slate-400 mr-2 text-sm font-semibold">{currency}</span>
                    {getCurrencySymbol(currency)} {amount.toFixed(2)}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTROL PANEL: Search, Filter, Sort */}
      <div className="bg-white p-5 rounded-t-xl border border-b-0 border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 text-sm font-medium outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Active Only Toggle */}
          <label className={`flex items-center gap-2 cursor-pointer text-sm font-semibold transition-colors px-4 py-3 rounded-lg border ${showActiveOnly ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-300 text-slate-600 hover:text-slate-900'}`}>
            <Filter size={16} className={showActiveOnly ? "text-white" : "text-slate-400"} />
            <span className="hidden sm:inline">Active Only</span>
            <input 
              type="checkbox" 
              className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer hidden"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
            />
          </label>

          {/* Sort Dropdown */}
          <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-slate-900 transition-shadow">
            <ArrowUpDown size={16} className="text-slate-400 mr-2" />
            <select
              className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 cursor-pointer p-0 pr-6 outline-none"
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
      <div className="bg-white rounded-b-xl border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="overflow-auto flex-1 relative">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider bg-slate-50">Student</th>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider bg-slate-50">Base Rate</th>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider bg-slate-50">Activity</th>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider bg-slate-50">Period</th>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider bg-slate-50">Outstanding</th>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider bg-slate-50 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100">
                      <Search className="text-slate-400 w-8 h-8" />
                    </div>
                    <p className="text-lg font-bold text-slate-900">No students found</p>
                    <p className="text-slate-500 font-medium text-sm mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                processedProfiles.map((profile) => {
                  const stats = profile.stats
                  const currencySymbol = getCurrencySymbol(profile.billing_currency || 'INR')
                  
                  // A student is only "Billing Active" if they have > 0 classes AND they are officially enrolled.
                  const hasClasses = stats.classCount > 0
                  const isOfficiallyEnrolled = stats.isEnrolled

                  return (
                    <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {profile.first_name} {profile.last_name}
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">{profile.email}</div>
                      </td>

                      {/* Base Rate (Read-Only) */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          {currencySymbol} {profile.hourly_rate || 0}
                        </span>
                      </td>

                      {/* Activity Status */}
                      <td className="p-4 whitespace-nowrap">
                        {!isOfficiallyEnrolled ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 shadow-sm">
                            Unenrolled
                          </span>
                        ) : hasClasses ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            {stats.classCount} Classes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-500 font-bold text-xs border border-slate-200 shadow-sm">
                            No Classes
                          </span>
                        )}
                      </td>

                      {/* Period Hours & Due */}
                      <td className="p-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 font-bold ${(hasClasses && isOfficiallyEnrolled) ? 'text-slate-800' : 'text-slate-400'}`}>
                          <Clock size={16} className={(hasClasses && isOfficiallyEnrolled) ? "text-slate-600" : "text-slate-300"} />
                          {stats.totalHours.toFixed(1)} <span className="text-sm font-medium text-slate-500">hrs</span>
                        </div>
                        {hasClasses && (
                          <div className="text-xs text-slate-500 font-medium mt-1.5">
                            Due: <span className="text-slate-700">{currencySymbol}{stats.periodAmountDue.toFixed(2)}</span>
                          </div>
                        )}
                      </td>

                      {/* Total Amount Due */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center font-bold text-lg ${stats.totalDue > 0 ? 'text-rose-600' : stats.totalDue < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {currencySymbol} {stats.totalDue.toFixed(2)}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td className="p-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                           <button 
                             onClick={() => handleViewHistory(profile)}
                             title="View History"
                             className="bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors flex items-center justify-center"
                           >
                             <History size={16} />
                           </button>
                           <button 
                             onClick={() => setSettleProfile(profile)}
                             disabled={stats.totalDue <= 0}
                             className="bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 px-4 py-2 rounded-lg font-bold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             Settle Due
                           </button>
                           <button 
                             onClick={() => setChargeProfile(profile)}
                             className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                           >
                             Add Manually
                           </button>
                         </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SETTLE MODAL */}
      {settleProfile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Settle Balance</h2>
            <p className="text-sm text-slate-500 mb-6 font-medium">
              Record a payment from <span className="font-bold text-slate-800">{settleProfile.first_name}</span>.
            </p>

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Amount Paid ({getCurrencySymbol(settleProfile.billing_currency)})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder={`e.g. ${settleProfile.stats.totalDue.toFixed(2)}`}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 font-medium"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettleProfile(null)
                    setSettleAmount('')
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettling}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-70"
                >
                  {isSettling ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CHARGE MODAL */}
      {chargeProfile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Add Manual Charge</h2>
            <p className="text-sm text-slate-500 mb-6 font-medium">
              Add an outstanding balance for <span className="font-bold text-slate-800">{chargeProfile.first_name}</span>.
            </p>

            <form onSubmit={handleAddChargeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Charge Amount ({getCurrencySymbol(chargeProfile.billing_currency)})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="e.g. 1500.00"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 font-medium"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setChargeProfile(null)
                    setChargeAmount('')
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCharging}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-70"
                >
                  {isCharging ? 'Adding...' : 'Add Charge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyProfile && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Billing History</h2>
                <p className="text-sm text-slate-500 font-medium mt-0.5">{historyProfile.first_name} {historyProfile.last_name}</p>
              </div>
              <button onClick={() => setHistoryProfile(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="font-medium text-lg text-slate-700">No history found</p>
                  <p className="text-sm mt-1">Manual charges and settlements will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyData.map(record => (
                    <div key={record.id} className={`p-4 rounded-xl border ${record.undone ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            record.type === 'SETTLEMENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {record.type}
                          </span>
                          {record.undone && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                              UNDONE
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {new Date(record.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3">
                        <div className="font-medium text-slate-800 text-sm">
                          {record.description}
                        </div>
                        <div className="text-right">
                          <div className={`font-black text-lg ${record.type === 'SETTLEMENT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {getCurrencySymbol(historyProfile.billing_currency)} {record.amount.toFixed(2)}
                          </div>
                          {!record.undone && (
                            <button 
                              onClick={() => handleUndo(record)}
                              className="text-xs text-rose-600 hover:text-rose-800 font-bold mt-1 underline decoration-rose-300 underline-offset-2 transition-colors"
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

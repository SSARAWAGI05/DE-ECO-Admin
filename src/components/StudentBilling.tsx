import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DollarSign, Clock, Users, Edit3, Check, X, TrendingUp, Calendar as CalendarIcon } from 'lucide-react'

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
}

interface LiveClass {
  id: string
  user_id: string
  duration_minutes: number
  scheduled_datetime: string
  status: string
}

type FilterPeriod = 'current_month' | 'last_month' | 'all_time'

/* ================= COMPONENT ================= */

export default function StudentBilling() {
  /* ---------- STATE ---------- */
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [period, setPeriod] = useState<FilterPeriod>('current_month')
  
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
      if (period === 'all_time') return true

      const classDate = new Date(c.scheduled_datetime)
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

  const calculateStudentStats = (userId: string) => {
    const studentClasses = filteredClasses.filter(c => c.user_id === userId)
    const totalMinutes = studentClasses.reduce((sum, c) => sum + c.duration_minutes, 0)
    return {
      classCount: studentClasses.length,
      totalHours: totalMinutes / 60
    }
  }

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || '₹'
  }

  // Summary Stats
  const summaryStats = useMemo(() => {
    let activeStudents = 0
    let totalScheduledHours = 0
    
    profiles.forEach(p => {
      const stats = calculateStudentStats(p.id)
      if (stats.classCount > 0) activeStudents++
      totalScheduledHours += stats.totalHours
    })

    return { activeStudents, totalScheduledHours }
  }, [profiles, filteredClasses])

  /* ================= UI ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-gray-50">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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

      {/* TABLE DATA */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex-1">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Student</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Hourly Rate</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Activity</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Total Hours</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Amount Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No students found.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => {
                  const stats = calculateStudentStats(profile.id)
                  const amountDue = stats.totalHours * (profile.hourly_rate || 0)
                  const currencySymbol = getCurrencySymbol(profile.billing_currency || 'INR')
                  const isActive = stats.classCount > 0

                  return (
                    <tr key={profile.id} className="hover:bg-blue-50/50 transition-colors">
                      {/* Name */}
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">
                          {profile.first_name} {profile.last_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{profile.email}</div>
                      </td>

                      {/* Hourly Rate Editor */}
                      <td className="p-4">
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
                      <td className="p-4">
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
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                          <Clock size={16} className={isActive ? "text-blue-500" : "text-gray-300"} />
                          {stats.totalHours.toFixed(1)} <span className="text-sm font-normal text-gray-500">hrs</span>
                        </span>
                      </td>

                      {/* Amount Due */}
                      <td className="p-4">
                        <span className={`inline-flex items-center font-bold text-lg ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {currencySymbol} {amountDue.toFixed(2)}
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

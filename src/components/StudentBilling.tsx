import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DollarSign, Clock, Users, Edit3, Check, X } from 'lucide-react'

/* ================= TYPES ================= */

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  hourly_rate: number
}

interface LiveClass {
  id: string
  user_id: string
  duration_minutes: number
  scheduled_datetime: string
  status: string
}

type FilterPeriod = 'all_time' | 'current_month' | 'last_month'

export default function StudentBilling() {
  /* ---------- STATE ---------- */
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [period, setPeriod] = useState<FilterPeriod>('current_month')
  
  // For editing inline rate
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRate, setEditRate] = useState<string>('')

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    fetchData()
  }, [])

  /* ================= DATA FETCHING ================= */
  const fetchData = async () => {
    // 1. Fetch profiles
    const { data: profilesData, error: profilesErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, hourly_rate')
      .order('first_name')

    if (profilesErr) {
      console.error('Failed to fetch profiles:', profilesErr)
    } else {
      setProfiles(profilesData ?? [])
    }

    // 2. Fetch live classes (exclude cancelled)
    const { data: classesData, error: classesErr } = await supabase
      .from('live_classes')
      .select('id, user_id, duration_minutes, scheduled_datetime, status')
      .neq('status', 'cancelled')

    if (classesErr) {
      console.error('Failed to fetch classes:', classesErr)
    } else {
      setClasses(classesData ?? [])
    }
  }

  /* ================= ACTIONS ================= */
  const startEdit = (profile: Profile) => {
    setEditingId(profile.id)
    setEditRate(profile.hourly_rate?.toString() || '0')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditRate('')
  }

  const saveRate = async (userId: string) => {
    const numRate = parseFloat(editRate)
    if (isNaN(numRate) || numRate < 0) {
      alert("Please enter a valid rate.")
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ hourly_rate: numRate })
      .eq('id', userId)

    if (error) {
      console.error("Failed to update rate", error)
      alert("Failed to update rate: " + error.message)
      return
    }

    // Optimistic update
    setProfiles((prev) => 
      prev.map(p => p.id === userId ? { ...p, hourly_rate: numRate } : p)
    )
    setEditingId(null)
  }

  /* ================= CALCULATION LOGIC ================= */
  
  const getFilteredClasses = () => {
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
  }

  const filteredClasses = getFilteredClasses()

  const calculateStudentStats = (userId: string) => {
    const studentClasses = filteredClasses.filter(c => c.user_id === userId)
    const totalMinutes = studentClasses.reduce((sum, c) => sum + c.duration_minutes, 0)
    const totalHours = totalMinutes / 60
    return {
      classCount: studentClasses.length,
      totalHours: totalHours
    }
  }

  /* ================= UI ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Student Billing</h1>
          <p className="text-gray-600">Track scheduled classes and calculate amount due</p>
        </div>

        <select
          className="border p-2.5 rounded-lg shadow-sm bg-white font-medium"
          value={period}
          onChange={(e) => setPeriod(e.target.value as FilterPeriod)}
        >
          <option value="current_month">Current Month</option>
          <option value="last_month">Last Month</option>
          <option value="all_time">All Time</option>
        </select>
      </div>

      {/* TABLE DATA */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex-1">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="p-4 font-semibold text-gray-700">Student Name</th>
                <th className="p-4 font-semibold text-gray-700">Hourly Rate</th>
                <th className="p-4 font-semibold text-gray-700">Classes Scheduled</th>
                <th className="p-4 font-semibold text-gray-700">Total Hours</th>
                <th className="p-4 font-semibold text-gray-700">Amount Due</th>
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

                  return (
                    <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                      {/* Name */}
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">
                          {profile.first_name} {profile.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{profile.email}</div>
                      </td>

                      {/* Hourly Rate */}
                      <td className="p-4">
                        {editingId === profile.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">₹</span>
                            <input
                              type="number"
                              className="w-20 border rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              autoFocus
                            />
                            <button onClick={() => saveRate(profile.id)} className="text-green-600 hover:bg-green-50 p-1 rounded">
                              <Check size={16} />
                            </button>
                            <button onClick={cancelEdit} className="text-red-600 hover:bg-red-50 p-1 rounded">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span className="font-medium text-gray-800">
                              ₹ {profile.hourly_rate || 0}
                            </span>
                            <button 
                              onClick={() => startEdit(profile)}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-all"
                              title="Edit Rate"
                            >
                              <Edit3 size={14} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Classes Scheduled */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-sm">
                          <Users size={14} />
                          {stats.classCount}
                        </span>
                      </td>

                      {/* Total Hours */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-gray-700 font-medium">
                          <Clock size={14} className="text-gray-400" />
                          {stats.totalHours.toFixed(2)} hrs
                        </span>
                      </td>

                      {/* Amount Due */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 font-bold text-lg text-green-700">
                          <DollarSign size={18} />
                          ₹ {amountDue.toFixed(2)}
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

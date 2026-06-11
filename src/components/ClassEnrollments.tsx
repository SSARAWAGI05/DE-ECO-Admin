import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, UserCheck, UserX, AlertCircle, Plus, X } from 'lucide-react'

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
}

interface LiveClass {
  id: string
  title: string
}

/* ================= COMPONENT ================= */

export default function ClassEnrollments() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSaving, setIsSaving] = useState<string | null>(null)

  // Old Class Enrollment Form State
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    class_id: '',
    user_id: '',
  })

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    fetchUsers()
    fetchClasses()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, hourly_rate, billing_currency, is_active')
      .order('first_name')

    if (error) console.error('Failed to fetch users:', error)
    else setProfiles(data ?? [])
  }

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('live_classes')
      .select('id, title')
      .order('scheduled_datetime')

    if (error) console.error('Failed to fetch classes:', error)
    else setClasses(data ?? [])
  }

  /* ================= ACTIONS ================= */

  const handleUpdateProfile = async (id: string, updates: Partial<Profile>) => {
    setIsSaving(id)
    
    // Update locally immediately for optimistic UI
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Update failed:', error)
      alert('Failed to update student: ' + error.message)
      fetchUsers() // Revert on failure
    }
    
    setIsSaving(null)
  }

  const handleAssignClass = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.user_id) {
      alert('Please select a student.')
      return
    }

    const payload = {
      class_id: formData.class_id || null, 
      user_id: formData.user_id,
    }

    const { error } = await supabase
      .from('class_enrollments')
      .insert(payload)

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    setShowForm(false)
    setFormData({ class_id: '', user_id: '' })
    alert('Student successfully assigned to class!')
  }

  /* ================= FILTERING ================= */

  const filteredProfiles = useMemo(() => {
    if (!searchTerm.trim()) return profiles
    const term = searchTerm.toLowerCase()
    return profiles.filter(p => 
      p.first_name?.toLowerCase().includes(term) ||
      p.last_name?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term)
    )
  }, [profiles, searchTerm])

  /* ================= UI ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-gray-50 overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">
            Student Enrollments
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage global student status and base billing rates.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg shadow-sm font-semibold w-full sm:w-auto transition-colors"
        >
          <Plus className="w-5 h-5" />
          Assign to Class
        </button>
      </div>

      {/* ASSIGN CLASS MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <h2 className="text-xl font-bold text-slate-900">Assign to Class</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAssignClass} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Student</label>
                <select
                  className="w-full border border-slate-300 bg-slate-50 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 transition-shadow"
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose a student --</option>
                  {profiles.filter(p => p.is_active).map((u) => (
                    <option key={u.id} value={u.id}>
                      {`${u.first_name || ''} ${u.last_name || ''}`.trim()} ({u.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 font-medium mt-2">Only Active students are shown here.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Live Class</label>
                <select
                  className="w-full border border-slate-300 bg-slate-50 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 transition-shadow"
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                >
                  <option value="">-- Choose a class (Optional) --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-sm transition-colors mt-2"
              >
                Assign Student
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="bg-white p-5 rounded-t-2xl border border-b-0 border-slate-200 shadow-sm shrink-0">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-b-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="overflow-auto flex-1 relative">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider bg-slate-50">Student Details</th>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider bg-slate-50">Enrollment Status</th>
                <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-wider bg-slate-50">Hourly Rate & Currency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100">
                      <Search className="text-slate-400 w-8 h-8" />
                    </div>
                    <p className="text-lg font-bold text-slate-900">No students found</p>
                    <p className="text-slate-500 font-medium text-sm mt-1">Try adjusting your search query.</p>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* STUDENT DETAILS */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {profile.first_name} {profile.last_name}
                      </div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">{profile.email}</div>
                    </td>

                    {/* STATUS TOGGLE */}
                    <td className="p-4 whitespace-nowrap">
                      <button
                        onClick={() => handleUpdateProfile(profile.id, { is_active: !profile.is_active })}
                        disabled={isSaving === profile.id}
                        className={`
                          relative inline-flex items-center w-32 h-10 rounded-full transition-colors focus:outline-none shadow-sm
                          ${profile.is_active ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100 border border-slate-200'}
                          ${isSaving === profile.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                        `}
                      >
                        <div
                          className={`
                            absolute left-1 flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm transition-transform duration-300 border border-slate-100
                            ${profile.is_active ? 'translate-x-22 text-emerald-600' : 'translate-x-0 text-slate-400'}
                          `}
                        >
                          {profile.is_active ? <UserCheck size={16} /> : <UserX size={16} />}
                        </div>
                        <span 
                          className={`
                            w-full text-center text-xs font-bold transition-colors tracking-wide
                            ${profile.is_active ? 'pr-8 pl-2 text-emerald-700' : 'pl-8 pr-2 text-slate-500'}
                          `}
                        >
                          {profile.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </button>
                    </td>

                    {/* HOURLY RATE CONTROLS */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-300 shadow-sm max-w-[200px] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-shadow">
                        <select 
                          className="bg-transparent border-r border-slate-200 pr-2 py-1 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer outline-none"
                          value={profile.billing_currency || 'INR'}
                          onChange={(e) => handleUpdateProfile(profile.id, { billing_currency: e.target.value })}
                          disabled={isSaving === profile.id}
                        >
                          {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-transparent border-none p-1 text-sm font-bold text-slate-900 outline-none focus:ring-0 disabled:opacity-50"
                          value={profile.hourly_rate ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val)) {
                              handleUpdateProfile(profile.id, { hourly_rate: val })
                            }
                          }}
                          disabled={isSaving === profile.id}
                        />
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
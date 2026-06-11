import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, UserCheck, UserX, Save, AlertCircle } from 'lucide-react'

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

/* ================= COMPONENT ================= */

export default function ClassEnrollments() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSaving, setIsSaving] = useState<string | null>(null)

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    // Note: requires `is_active` column in DB
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, hourly_rate, billing_currency, is_active')
      .order('first_name')

    if (error) {
      console.error('Failed to fetch users:', error)
      return
    }
    setProfiles(data ?? [])
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
      // Revert on failure
      fetchUsers()
    }
    
    setIsSaving(null)
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
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col bg-gray-50 overflow-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Student Enrollments
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            Manage global student status and base billing rates.
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-t-xl border border-b-0 shadow-sm shrink-0">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-b-xl shadow-sm border overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-auto flex-1 relative">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Student Details</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Enrollment Status</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase tracking-wider">Hourly Rate & Currency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-gray-500">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-900">No students found.</p>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                    
                    {/* STUDENT DETAILS */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        {profile.first_name} {profile.last_name}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">{profile.email}</div>
                    </td>

                    {/* STATUS TOGGLE */}
                    <td className="p-4 whitespace-nowrap">
                      <button
                        onClick={() => handleUpdateProfile(profile.id, { is_active: !profile.is_active })}
                        disabled={isSaving === profile.id}
                        className={`
                          relative inline-flex items-center w-32 h-10 rounded-full transition-colors focus:outline-none
                          ${profile.is_active ? 'bg-green-100 border border-green-200' : 'bg-gray-100 border border-gray-200'}
                          ${isSaving === profile.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
                        `}
                      >
                        {/* The sliding circle */}
                        <div
                          className={`
                            absolute left-1 flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm transition-transform duration-300
                            ${profile.is_active ? 'translate-x-22 text-green-600' : 'translate-x-0 text-gray-400'}
                          `}
                        >
                          {profile.is_active ? <UserCheck size={16} /> : <UserX size={16} />}
                        </div>
                        
                        {/* Text Label */}
                        <span 
                          className={`
                            w-full text-center text-sm font-bold transition-colors
                            ${profile.is_active ? 'pr-8 pl-2 text-green-700' : 'pl-8 pr-2 text-gray-500'}
                          `}
                        >
                          {profile.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </button>
                    </td>

                    {/* HOURLY RATE CONTROLS */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border shadow-sm max-w-[200px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                        {/* Currency Dropdown */}
                        <select 
                          className="bg-transparent border-r border-gray-200 pr-2 py-1 text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
                          value={profile.billing_currency || 'INR'}
                          onChange={(e) => handleUpdateProfile(profile.id, { billing_currency: e.target.value })}
                          disabled={isSaving === profile.id}
                        >
                          {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                          ))}
                        </select>
                        
                        {/* Hourly Rate Input */}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-transparent border-none p-1 text-sm font-semibold text-gray-900 focus:ring-0 disabled:opacity-50"
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
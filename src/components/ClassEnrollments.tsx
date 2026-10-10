import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, UserCheck, UserX, Plus, X, Settings, Trash2 } from 'lucide-react'

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
  guardian_email?: string | null
  hourly_rate: number
  billing_currency: string
  is_active: boolean
}

interface LiveClass {
  id: string
  title: string
}

interface Course {
  id: string
  title: string
}

/* ================= COMPONENT ================= */

export default function ClassEnrollments() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSaving, setIsSaving] = useState<string | null>(null)

  // Top-Level "New Enrollment" Modal State
  const [showNewEnrollModal, setShowNewEnrollModal] = useState(false)
  const [enrollFormStudentId, setEnrollFormStudentId] = useState('')
  const [enrollFormType, setEnrollFormType] = useState<'course' | 'class'>('course')
  const [enrollFormTargetId, setEnrollFormTargetId] = useState('')
  const [enrollFormCustomRate, setEnrollFormCustomRate] = useState<string>('')
  const [enrollFormStatus, setEnrollFormStatus] = useState<string>('active')
  const [isEnrollingSubmitting, setIsEnrollingSubmitting] = useState(false)

  // Enrollment Modal State
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [userCourseEnrollments, setUserCourseEnrollments] = useState<any[]>([])
  const [userClassEnrollments, setUserClassEnrollments] = useState<any[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)

  // Add Enrollment Form State inside modal
  const [newEnrollmentType, setNewEnrollmentType] = useState<'course' | 'class'>('course')
  const [newEnrollmentId, setNewEnrollmentId] = useState('')

  const resetNewEnrollForm = () => {
    setEnrollFormStudentId('')
    setEnrollFormType('course')
    setEnrollFormTargetId('')
    setEnrollFormCustomRate('')
    setEnrollFormStatus('active')
  }

  const handleCreateNewEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollFormStudentId || !enrollFormTargetId) {
      alert('Please select both a student and a ' + (enrollFormType === 'course' ? 'course' : 'live class') + '.')
      return
    }

    setIsEnrollingSubmitting(true)
    try {
      if (enrollFormType === 'course') {
        const rateVal = enrollFormCustomRate ? parseFloat(enrollFormCustomRate) : null
        const { error } = await supabase.from('course_enrollments').insert({
          user_id: enrollFormStudentId,
          course_id: enrollFormTargetId,
          status: enrollFormStatus || 'active',
          custom_hourly_rate: isNaN(rateVal as number) ? null : rateVal,
          enrolled_at: new Date().toISOString()
        })
        if (error) {
          alert('Failed to enroll student in course: ' + error.message)
        } else {
          alert('Student successfully enrolled in course!')
          setShowNewEnrollModal(false)
          resetNewEnrollForm()
          fetchUsers()
        }
      } else {
        const { error } = await supabase.from('class_enrollments').insert({
          user_id: enrollFormStudentId,
          class_id: enrollFormTargetId
        })
        if (error) {
          alert('Failed to enroll student in live class: ' + error.message)
        } else {
          alert('Student successfully enrolled in live class!')
          setShowNewEnrollModal(false)
          resetNewEnrollForm()
          fetchUsers()
        }
      }
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Enrollment failed'))
    } finally {
      setIsEnrollingSubmitting(false)
    }
  }

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    fetchUsers()
    fetchClasses()
    fetchCourses()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, guardian_email, hourly_rate, billing_currency, is_active')
      .order('first_name')
    if (!error) setProfiles(data ?? [])
  }

  const fetchClasses = async () => {
    const { data, error } = await supabase.from('live_classes').select('id, title').order('scheduled_datetime')
    if (!error) setClasses(data ?? [])
  }

  const fetchCourses = async () => {
    const { data, error } = await supabase.from('courses').select('id, title').order('created_at')
    if (!error) setCourses(data ?? [])
  }

  /* ================= FETCH ENROLLMENTS ================= */
  useEffect(() => {
    if (selectedProfile) {
      fetchUserEnrollments(selectedProfile.id)
    }
  }, [selectedProfile])

  const fetchUserEnrollments = async (userId: string) => {
    setLoadingEnrollments(true)
    
    // Fetch course enrollments
    const { data: coursesData, error: courseError } = await supabase
      .from('course_enrollments')
      .select('id, status, enrolled_at, custom_hourly_rate, courses(id, title)')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false })

    if (courseError) console.error("Error fetching courses:", courseError)
    setUserCourseEnrollments(coursesData ?? [])

    // Fetch class enrollments
    const { data: classesData } = await supabase
      .from('class_enrollments')
      .select('id, live_classes(id, title)')
      .eq('user_id', userId)

    setUserClassEnrollments(classesData ?? [])

    setLoadingEnrollments(false)
  }

  /* ================= ACTIONS ================= */

  const handleUpdateProfile = async (id: string, updates: Partial<Profile>) => {
    setIsSaving(id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    const { error } = await supabase.from('profiles').update(updates).eq('id', id)
    if (error) {
      alert('Failed to update student: ' + error.message)
      fetchUsers()
    }
    setIsSaving(null)
  }

  // Assign new enrollment
  const handleAssignEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProfile || !newEnrollmentId) return

    if (newEnrollmentType === 'course') {
      const { error } = await supabase.from('course_enrollments').insert({
        course_id: newEnrollmentId,
        user_id: selectedProfile.id,
        status: 'active',
        enrolled_at: new Date().toISOString()
      })
      if (error) {
        alert(error.message)
      } else {
        fetchUserEnrollments(selectedProfile.id)
        setNewEnrollmentId('')
      }
    } else {
      const { error } = await supabase.from('class_enrollments').insert({
        class_id: newEnrollmentId,
        user_id: selectedProfile.id
      })
      if (error) {
        alert(error.message)
      } else {
        fetchUserEnrollments(selectedProfile.id)
        setNewEnrollmentId('')
      }
    }
  }

  const handleUpdateCourseStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('course_enrollments').update({ status: newStatus }).eq('id', id)
    if (error) alert(error.message)
    else fetchUserEnrollments(selectedProfile!.id)
  }

  const handleUpdateCourseRate = async (id: string, newRate: number | null) => {
    const { error } = await supabase.from('course_enrollments').update({ custom_hourly_rate: newRate }).eq('id', id)
    if (error) alert(error.message)
    else fetchUserEnrollments(selectedProfile!.id)
  }

  const handleDeleteCourseEnrollment = async (id: string) => {
    if(!confirm("Remove this course enrollment?")) return
    const { error } = await supabase.from('course_enrollments').delete().eq('id', id)
    if (error) alert(error.message)
    else fetchUserEnrollments(selectedProfile!.id)
  }

  const handleDeleteClassEnrollment = async (id: string) => {
    if(!confirm("Remove this class enrollment?")) return
    const { error } = await supabase.from('class_enrollments').delete().eq('id', id)
    if (error) alert(error.message)
    else fetchUserEnrollments(selectedProfile!.id)
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
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full ">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-4 border-b border-slate-200 dark:border-neutral-800 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight mb-1">
            Student Enrollments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Manage global student status, billing rates, and course/class enrollments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetNewEnrollForm()
            setShowNewEnrollModal(true)
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm shadow-sm hover:opacity-95 active:scale-[0.98] transition cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Enrollment</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="shrink-0 mb-6">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-slate-900 dark:focus:ring-white text-sm font-medium outline-none transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-xs"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 flex flex-col min-h-[400px]">
        <div className="overflow-auto flex-1 relative custom-scrollbar">
          <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Student Details</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Account Status</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">Hourly Rate & Currency</th>
                  <th className="px-6 py-3.5 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center">
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">No students found</p>
                      <button
                        type="button"
                        onClick={() => {
                          resetNewEnrollForm()
                          setShowNewEnrollModal(true)
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
                      >
                        <Plus size={14} /> New Enrollment
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {profile.first_name} {profile.last_name}
                        </div>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 mb-2">{profile.email}</div>
                        
                        <div className="text-xs flex flex-col gap-1 max-w-[200px]">
                          <label className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">Guardian Email</label>
                          <input
                            type="email"
                            placeholder="guardian@example.com"
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all disabled:opacity-50 font-medium text-xs"
                            defaultValue={profile.guardian_email || ''}
                            onBlur={(e) => {
                              if (e.target.value !== (profile.guardian_email || '')) {
                                handleUpdateProfile(profile.id, { guardian_email: e.target.value })
                              }
                            }}
                            disabled={isSaving === profile.id}
                          />
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleUpdateProfile(profile.id, { is_active: !profile.is_active })}
                          disabled={isSaving === profile.id}
                          className={`
                            relative inline-flex items-center w-28 h-8 rounded-full transition-colors focus:outline-none border
                            ${profile.is_active ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}
                            ${isSaving === profile.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          <div
                            className={`
                              absolute left-1 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-xs transition-transform duration-200 border border-slate-200 dark:border-slate-700
                              ${profile.is_active ? 'translate-x-20 text-emerald-600 dark:text-emerald-400' : 'translate-x-0 text-slate-400'}
                            `}
                          >
                            {profile.is_active ? <UserCheck size={13} /> : <UserX size={13} />}
                          </div>
                          <span 
                            className={`
                              w-full text-center text-[10px] font-bold transition-colors tracking-wide
                              ${profile.is_active ? 'pr-6 pl-2 text-emerald-700 dark:text-emerald-400' : 'pl-6 pr-2 text-slate-500 dark:text-slate-400'}
                            `}
                          >
                            {profile.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </button>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 max-w-[200px] focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-white transition-all">
                          <select 
                            className="bg-transparent border-r border-slate-200 dark:border-slate-700 pr-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer outline-none"
                            value={profile.billing_currency || 'INR'}
                            onChange={(e) => handleUpdateProfile(profile.id, { billing_currency: e.target.value })}
                            disabled={isSaving === profile.id}
                          >
                            {CURRENCIES.map(c => (
                              <option key={c.code} value={c.code} className="dark:bg-slate-900">{c.code} ({c.symbol})</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full bg-transparent border-none p-0.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-0 disabled:opacity-50"
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

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedProfile(profile)}
                          className="inline-flex items-center gap-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 px-3.5 py-1.5 rounded-lg font-semibold transition-colors text-xs cursor-pointer shadow-xs"
                        >
                          <Settings size={14} /> Manage
                        </button>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW */}
          <div className="md:hidden flex flex-col gap-4 p-4">
            {filteredProfiles.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-base font-bold text-slate-900 dark:text-slate-50 mb-3">No students found</p>
                <button
                  type="button"
                  onClick={() => {
                    resetNewEnrollForm()
                    setShowNewEnrollModal(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
                >
                  <Plus size={14} /> New Enrollment
                </button>
              </div>
            ) : (
              filteredProfiles.map((profile) => (
                <div key={profile.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 rounded-xl p-4 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-50 text-lg">
                        {profile.first_name} {profile.last_name}
                      </div>
                      <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{profile.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Account Status</span>
                    <button
                      onClick={() => handleUpdateProfile(profile.id, { is_active: !profile.is_active })}
                      disabled={isSaving === profile.id}
                      className={`
                        relative inline-flex items-center w-28 h-8 rounded-full transition-colors focus:outline-none shadow-sm
                        ${profile.is_active ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20' : 'bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-800 dark:border-neutral-700'}
                        ${isSaving === profile.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div
                        className={`
                          absolute left-1 flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-sm transition-transform duration-300 border border-slate-100 dark:border-neutral-800 dark:border-neutral-700/50
                          ${profile.is_active ? 'translate-x-20 text-emerald-600 dark:text-emerald-400' : 'translate-x-0 text-slate-400'}
                        `}
                      >
                        {profile.is_active ? <UserCheck size={12} /> : <UserX size={12} />}
                      </div>
                      <span 
                        className={`
                          w-full text-center text-[10px] font-bold transition-colors tracking-wide
                          ${profile.is_active ? 'pr-6 pl-2 text-emerald-700 dark:text-emerald-400' : 'pl-6 pr-2 text-slate-500 dark:text-slate-400'}
                        `}
                      >
                        {profile.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Hourly Rate & Currency</span>
                    <div className="bg-white dark:bg-neutral-800 flex items-center gap-2 bg-slate-50 dark:bg-neutral-800/50 p-1.5 rounded-lg border border-slate-300 dark:border-neutral-700 focus-within:ring-2 focus-within:ring-slate-900 transition-shadow">
                      <select 
                        className="bg-transparent border-r border-slate-200 dark:border-neutral-800 dark:border-neutral-700 pr-2 py-1 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer outline-none"
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
                        className="w-full bg-transparent border-none p-1 text-sm font-bold text-slate-900 dark:text-slate-50 outline-none focus:ring-0 disabled:opacity-50"
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
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setSelectedProfile(profile)}
                      className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-3 rounded-lg font-semibold transition-colors text-sm"
                    >
                      <Settings size={16} /> Manage Enrollments
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MANAGE ENROLLMENTS MODAL */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col animate-modal">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Manage Enrollments
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {selectedProfile.first_name} {selectedProfile.last_name} ({selectedProfile.email})
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedProfile(null)
                  setNewEnrollmentId('')
                }} 
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 dark:hover:bg-slate-200 dark:bg-neutral-800 p-2 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-neutral-800/50/50">
              {loadingEnrollments ? (
                <div className="flex justify-center p-10 text-slate-500 dark:text-slate-400 font-semibold">Loading enrollments...</div>
              ) : (
                <div className="space-y-8">
                  
                  {/* COURSES SECTION */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                      Course Enrollments
                    </h3>
                    {userCourseEnrollments.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-neutral-800 dark:border-neutral-700">No courses enrolled.</p>
                    ) : (
                      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[500px]">
                          <thead className="bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-200 dark:border-neutral-800 dark:border-neutral-700">
                            <tr>
                              <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Course</th>
                              <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                              <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Custom Rate</th>
                              <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 w-24">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {userCourseEnrollments.map(ce => (
                              <tr key={ce.id}>
                                <td className="p-3 font-medium text-slate-900 dark:text-slate-50">{ce.courses?.title || 'Unknown Course'}</td>
                                <td className="p-3">
                                  <select
                                    value={ce.status}
                                    onChange={(e) => handleUpdateCourseStatus(ce.id, e.target.value)}
                                    className="bg-slate-50 dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-slate-900 text-xs font-semibold uppercase"
                                  >
                                    <option value="contacted">Contacted</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="dropped">Dropped</option>
                                  </select>
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Default"
                                    className="bg-slate-50 dark:bg-neutral-800/50 border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-slate-900 text-xs font-semibold w-24"
                                    value={ce.custom_hourly_rate === null || ce.custom_hourly_rate === undefined ? '' : ce.custom_hourly_rate}
                                    onBlur={(e) => {
                                      const val = e.target.value === '' ? null : parseFloat(e.target.value)
                                      handleUpdateCourseRate(ce.id, val)
                                    }}
                                    onChange={(e) => {
                                      const newEnrollments = [...userCourseEnrollments]
                                      const idx = newEnrollments.findIndex(x => x.id === ce.id)
                                      newEnrollments[idx] = { ...ce, custom_hourly_rate: e.target.value === '' ? null : parseFloat(e.target.value) }
                                      setUserCourseEnrollments(newEnrollments)
                                    }}
                                  />
                                </td>
                                <td className="p-3">
                                  <button onClick={() => handleDeleteCourseEnrollment(ce.id)} className="text-slate-400 hover:text-rose-600 dark:text-rose-400 transition-colors p-1 rounded hover:bg-rose-50 dark:bg-rose-500/10">
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* CLASSES SECTION */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                      Live Class Enrollments
                    </h3>
                    {userClassEnrollments.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-neutral-800 dark:border-neutral-700">No live classes enrolled.</p>
                    ) : (
                      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-neutral-800 dark:border-neutral-700 overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[400px]">
                          <thead className="bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-200 dark:border-neutral-800 dark:border-neutral-700">
                            <tr>
                              <th className="p-3 font-semibold text-slate-600 dark:text-slate-400">Class</th>
                              <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 w-24">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                            {userClassEnrollments.map(ce => (
                              <tr key={ce.id}>
                                <td className="p-3 font-medium text-slate-900 dark:text-slate-50">{ce.live_classes?.title || 'Unknown Class'}</td>
                                <td className="p-3">
                                  <button onClick={() => handleDeleteClassEnrollment(ce.id)} className="text-slate-400 hover:text-rose-600 dark:text-rose-400 transition-colors p-1 rounded hover:bg-rose-50 dark:bg-rose-500/10">
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* ADD ENROLLMENT SECTION */}
            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 shrink-0">
              <div className="mb-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-50">Add New Enrollment</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select whether to enroll in a Course or Live Class.</p>
              </div>
              <form onSubmit={handleAssignEnrollment} className="flex flex-col sm:flex-row gap-3">
                <select
                  value={newEnrollmentType}
                  onChange={(e) => {
                    setNewEnrollmentType(e.target.value as 'course' | 'class')
                    setNewEnrollmentId('')
                  }}
                  className="bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900 font-medium text-xs sm:text-sm"
                >
                  <option value="course">Course</option>
                  <option value="class">Live Class</option>
                </select>

                <select
                  value={newEnrollmentId}
                  onChange={(e) => setNewEnrollmentId(e.target.value)}
                  className="bg-white dark:bg-neutral-800 flex-1 border border-slate-300 dark:border-neutral-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900 font-medium text-xs sm:text-sm"
                  required
                >
                  <option value="">
                    {newEnrollmentType === 'course' ? '-- Select a Course to Enroll --' : '-- Select a Live Class to Enroll --'}
                  </option>
                  {newEnrollmentType === 'course' 
                    ? courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                    : classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)
                  }
                </select>

                <button
                  type="submit"
                  disabled={!newEnrollmentId}
                  className="bg-slate-900 dark:bg-indigo-500 w-full sm:w-auto hover:bg-slate-800 dark:hover:bg-indigo-400 text-white px-5 py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
                >
                  Assign
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ================= GLOBAL NEW ENROLLMENT MODAL ================= */}
      {showNewEnrollModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur z-10">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  New Student Enrollment
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Enroll any student into an academic course or live class session
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewEnrollModal(false)
                  resetNewEnrollForm()
                }}
                disabled={isEnrollingSubmitting}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewEnrollment} className="p-5 sm:p-6 space-y-4 text-xs">
              {/* STUDENT SELECTION */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Student <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
                  value={enrollFormStudentId}
                  onChange={(e) => setEnrollFormStudentId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {profiles.map((p) => {
                    const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Student'
                    return (
                      <option key={p.id} value={p.id}>
                        {name} {p.email ? `(${p.email})` : ''} {!p.is_active ? '[Inactive]' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* ENROLLMENT TYPE */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Enrollment Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEnrollFormType('course')
                      setEnrollFormTargetId('')
                    }}
                    className={`p-2.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                      enrollFormType === 'course'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Course Enrollment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEnrollFormType('class')
                      setEnrollFormTargetId('')
                    }}
                    className={`p-2.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
                      enrollFormType === 'class'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Live Class
                  </button>
                </div>
              </div>

              {/* TARGET COURSE OR CLASS */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {enrollFormType === 'course' ? 'Select Course' : 'Select Live Class'} <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
                  value={enrollFormTargetId}
                  onChange={(e) => setEnrollFormTargetId(e.target.value)}
                  required
                >
                  <option value="">
                    {enrollFormType === 'course' ? '-- Choose Course --' : '-- Choose Live Class --'}
                  </option>
                  {enrollFormType === 'course'
                    ? courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))
                    : classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                </select>
              </div>

              {/* IF COURSE: STATUS & CUSTOM RATE */}
              {enrollFormType === 'course' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Status
                    </label>
                    <select
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium uppercase"
                      value={enrollFormStatus}
                      onChange={(e) => setEnrollFormStatus(e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="contacted">Contacted</option>
                      <option value="completed">Completed</option>
                      <option value="dropped">Dropped</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Custom Hourly Rate <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Default rate"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      value={enrollFormCustomRate}
                      onChange={(e) => setEnrollFormCustomRate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isEnrollingSubmitting || !enrollFormStudentId || !enrollFormTargetId}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm shadow-sm hover:opacity-90 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                >
                  {isEnrollingSubmitting ? 'Enrolling...' : 'Confirm & Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
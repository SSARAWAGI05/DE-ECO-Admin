import { useEffect, useState } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  Clock,
  Users,
  Link as LinkIcon,
  Settings,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { sendClassEmail } from '../lib/emailService'

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180]

/* ================= TYPES ================= */

interface LiveClass {
  id: string
  user_id: string
  title: string
  instructor_name: string
  meeting_link: string | null
  scheduled_datetime: string
  end_datetime: string
  duration_minutes: number
}

interface UserFromDB {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  is_active: boolean
}

/* ================= COMPONENT ================= */

export default function LiveClasses() {
  /* ---------- STATE ---------- */
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [users, setUsers] = useState<UserFromDB[]>([])
  const [courses, setCourses] = useState<{id: string, title: string}[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [customDuration, setCustomDuration] = useState(false)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [defaultLink, setDefaultLink] = useState(
    localStorage.getItem('default_meeting_link') || 'https://meet.google.com/qzh-kctw-doa'
  )

  const [formData, setFormData] = useState({
    user_id: '',
    title: '',
    instructor_name: 'Rishika',
    meeting_link: defaultLink,
    scheduled_datetime: '',
    duration_minutes: '60',
    send_email: true,
  })

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    fetchEligibleUsers()
    fetchClasses()
    fetchCourses()
  }, [])

  /* ================= DATA FETCHING ================= */

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').order('created_at')
    if (data) setCourses(data)
  }

  /**
   * Fetch ONLY users who appear in class_enrollments
   */
  const fetchEligibleUsers = async () => {
    // 1️⃣ Get distinct user_ids from class_enrollments
    const { data: enrollments, error: enrollErr } = await supabase
      .from('class_enrollments')
      .select('user_id')

    if (enrollErr || !enrollments) {
      console.error('Failed to fetch enrollments', enrollErr)
      return
    }

    const userIds = Array.from(
      new Set(enrollments.map((e) => e.user_id))
    )

    if (userIds.length === 0) {
      setUsers([])
      return
    }

    // 2️⃣ Fetch only those users from profiles
    const { data: usersData, error: usersErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, is_active')
      .in('id', userIds)
      .order('first_name')

    if (usersErr) {
      console.error('Failed to fetch users', usersErr)
      return
    }

    setUsers(usersData ?? [])
  }

  /**
   * Fetch only upcoming / ongoing classes
   */
  const fetchClasses = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startOfToday = today.toISOString()

    const { data } = await supabase
      .from('live_classes')
      .select('*')
      .gte('scheduled_datetime', startOfToday)
      .gte('scheduled_datetime', '2026-06-11T00:00:00.000Z')
      .order('scheduled_datetime', { ascending: true })

    setClasses(data ?? [])
  }

  /* ================= HELPERS ================= */

  const getUserName = (id: string) => {
    const u = users.find((x) => x.id === id)
    return u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : '—'
  }

  const resetForm = () => {
    setEditingId(null)
    setCustomDuration(false)
    setFormData({
      user_id: '',
      title: '',
      instructor_name: 'Rishika',
      meeting_link: defaultLink,
      scheduled_datetime: '',
      duration_minutes: '60',
      send_email: true,
    })
  }

  /* ================= ACTIONS ================= */

  const openCreate = () => {
    resetForm()
    setPanelOpen(true)
  }

  const openEdit = (c: LiveClass) => {
    setEditingId(c.id)
    setCustomDuration(!DURATION_OPTIONS.includes(c.duration_minutes))

    setFormData({
      user_id: c.user_id,
      title: c.title,
      instructor_name: c.instructor_name || 'Rishika',
      meeting_link: c.meeting_link ?? defaultLink,
      scheduled_datetime: new Date(c.scheduled_datetime)
        .toISOString()
        .slice(0, 16),
      duration_minutes: c.duration_minutes?.toString() || '60',
      send_email: false,
    })

    setPanelOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const scheduledDate = new Date(formData.scheduled_datetime)

    const payload = {
      user_id: formData.user_id,
      title: formData.title,
      instructor_name: formData.instructor_name,
      meeting_link: formData.meeting_link,
      scheduled_datetime: new Date(formData.scheduled_datetime).toISOString(),
      duration_minutes: Number(formData.duration_minutes),
    }

    const query = editingId
      ? supabase.from('live_classes').update(payload).eq('id', editingId)
      : supabase.from('live_classes').insert(payload)

    await query
    
    // Trigger email if it's a new class and send_email is true
    if (!editingId && formData.send_email) {
      const student = users.find(u => u.id === formData.user_id)
      if (student && student.email) {
        const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student'
        const dateStr = new Date(formData.scheduled_datetime).toLocaleString()
        sendClassEmail(student.email, studentName, formData.title, dateStr, formData.meeting_link, formData.instructor_name, Number(formData.duration_minutes))
      } else {
        alert("Warning: Could not send email because this student does not have an email address in the system.");
      }
    }

    setPanelOpen(false)
    fetchClasses()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this class?')) return
    await supabase.from('live_classes').delete().eq('id', id)
    fetchClasses()
  }

  const cleanupOldClasses = async () => {
    if (!confirm('Are you absolutely sure you want to delete all classes scheduled before June 11, 2026? This cannot be undone.')) return
    
    const { error } = await supabase.from('live_classes').delete().lt('scheduled_datetime', '2026-06-11T00:00:00.000Z')
    
    if (error) {
      alert(`Error deleting classes: ${error.message}`)
    } else {
      alert('Successfully deleted all classes scheduled before June 11, 2026!')
      fetchClasses()
    }
  }

  /* ================= UI ================= */

  // Stats calculation
  const upcomingCount = classes.length
  const todayClasses = classes.filter(c => {
    const d = new Date(c.scheduled_datetime)
    const today = new Date()
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).length

  return (
    <div className="p-4 sm:p-6 lg:p-10 w-full flex flex-col min-h-screen overflow-x-hidden">
      {/* HEADER WITH STATS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-2">Live Classes</h1>
          <div className="flex items-center gap-4">
            <p className="text-slate-500 font-medium text-lg">Manage all your scheduled sessions.</p>
            <button onClick={cleanupOldClasses} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg transition-colors">
              Delete pre-June 11 Classes
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex gap-4">
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-5 py-3 flex flex-col flex-1 sm:flex-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Upcoming</span>
              <span className="text-2xl font-black text-slate-900">{upcomingCount}</span>
            </div>
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-5 py-3 flex flex-col flex-1 sm:flex-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Today</span>
              <span className="text-2xl font-black text-indigo-600">{todayClasses}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center gap-2 bg-white border-2 border-slate-200 hover:border-slate-300 transition-colors text-slate-700 px-5 py-4 sm:py-3 rounded-xl font-bold text-sm sm:text-base shadow-sm"
              title="Edit Default Meeting Link"
            >
              <LinkIcon className="w-5 h-5 text-slate-400" />
              Default Link
            </button>
            <button
              onClick={openCreate}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-6 py-4 sm:py-3 rounded-xl font-bold text-sm sm:text-base shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
              New Class
            </button>
          </div>
        </div>
      </div>

      {/* CARD GRID */}
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-center mt-4">
          <Calendar size={48} className="text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Upcoming Classes</h3>
          <p className="text-slate-500">You don't have any classes scheduled right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
          {classes.map((c) => {
            const start = new Date(c.scheduled_datetime)
            const diffHours = (start.getTime() - new Date().getTime()) / (1000 * 60 * 60)
            
            let statusColor = "bg-slate-200 text-slate-700"
            let statusText = "Upcoming"
            let accentBar = "bg-slate-300"

            if (diffHours < 0 && diffHours > -(c.duration_minutes / 60)) {
              statusColor = "bg-rose-100 text-rose-700"
              statusText = "Live Now"
              accentBar = "bg-rose-500"
            } else if (diffHours >= 0 && diffHours <= 24) {
              statusColor = "bg-orange-100 text-orange-800"
              statusText = "Starting Soon"
              accentBar = "bg-orange-400"
            } else if (diffHours > 24) {
              statusColor = "bg-indigo-50 text-indigo-700"
              statusText = "Upcoming"
              accentBar = "bg-indigo-500"
            }

            return (
              <div key={c.id} className="group flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                {/* Accent Bar */}
                <div className={`h-1.5 w-full ${accentBar}`} />
                
                <div className="p-5 flex-1 flex flex-col">
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Class Info */}
                  <h3 className="text-xl font-black text-slate-900 mb-1 line-clamp-1" title={c.title}>{c.title}</h3>
                  <p className="text-sm font-semibold text-slate-500 mb-5 flex items-center gap-1.5">
                    <Users size={16} className="text-slate-400" />
                    {c.instructor_name}
                  </p>

                  {/* Student Info */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl mb-5">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                      {getUserName(c.user_id).charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Student</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{getUserName(c.user_id)}</p>
                    </div>
                  </div>

                  {/* Date/Time Chips */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200">
                      <Calendar size={14} className="text-slate-500" />
                      {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200">
                      <Clock size={14} className="text-slate-500" />
                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-slate-200">
                      {c.duration_minutes}m
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-slate-100 p-3 bg-slate-50/50 flex items-center justify-end gap-2 shrink-0">
                  {c.meeting_link && (
                    <a
                      href={c.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-auto flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
                    >
                      <LinkIcon size={16} /> Join Class
                    </a>
                  )}
                  <button
                    onClick={() => openEdit(c)}
                    className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Edit Class"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                    title="Delete Class"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SIDE PANEL */}
      {panelOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-white">
              <h2 className="text-2xl font-black text-slate-900">
                {editingId ? 'Edit Class' : 'Schedule Class'}
              </h2>
              <button onClick={() => setPanelOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* USER */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Assigned Student</label>
                <select
                  className="w-full border-2 border-slate-200 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium min-w-0 bg-slate-50"
                  value={formData.user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, user_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select enrolled user</option>
                  {users.filter(u => u.is_active).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* TITLE */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Class Title</label>
                <select
                  className="w-full border-2 border-slate-200 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium min-w-0 bg-slate-50"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* INSTRUCTOR */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Instructor</label>
                <input
                  className="w-full border-2 border-slate-200 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium min-w-0 bg-slate-50"
                  value={formData.instructor_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      instructor_name: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {/* MEETING LINK */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Meeting Link</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  className="w-full border-2 border-slate-200 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium min-w-0 bg-slate-50 text-indigo-600"
                  value={formData.meeting_link || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meeting_link: e.target.value,
                    })
                  }
                />
              </div>

              {/* DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Date & Time</label>
                  <input
                    type="datetime-local"
                    className="w-full border-2 border-slate-200 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium text-slate-900 bg-slate-50"
                    value={formData.scheduled_datetime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scheduled_datetime: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              {/* DURATION */}
              <div>
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider block mb-3">
                  Duration
                </label>

                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => {
                        setCustomDuration(false)
                        setFormData({
                          ...formData,
                          duration_minutes: d.toString(),
                        })
                      }}
                      className={`px-5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 ${
                        formData.duration_minutes === d.toString()
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-white text-slate-600 hover:border-slate-300 border-slate-200'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setCustomDuration(true)
                      setFormData({
                        ...formData,
                        duration_minutes: '',
                      })
                    }}
                    className={`px-5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200 ${
                      customDuration
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : 'bg-white text-slate-600 hover:border-slate-300 border-slate-200'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {customDuration && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <input
                      type="number"
                      placeholder="Enter custom minutes"
                      className="w-full border-2 border-slate-200 p-3.5 rounded-xl focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium bg-slate-50"
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_minutes: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 checked:border-indigo-600 checked:bg-indigo-600 transition-all outline-none"
                      checked={formData.send_email}
                      onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                    />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700 select-none">Send email notification to student</span>
                </label>
              </div>

              <div className="pt-6 pb-8">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-indigo-600/20"
                >
                  {editingId ? 'Update Class' : 'Schedule Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xl">Default Meeting Link</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider block mb-2">Meeting Link URL</label>
              <input
                type="url"
                className="w-full border-2 border-slate-200 p-3.5 rounded-xl focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium bg-slate-50 text-indigo-600"
                value={defaultLink}
                onChange={(e) => setDefaultLink(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-3 font-medium">This link will automatically fill the Meeting Link field when scheduling a new class.</p>
              
              <button
                onClick={() => {
                  localStorage.setItem('default_meeting_link', defaultLink)
                  if (!editingId) {
                    setFormData(prev => ({...prev, meeting_link: defaultLink}))
                  }
                  setSettingsOpen(false)
                }}
                className="w-full mt-6 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Save Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

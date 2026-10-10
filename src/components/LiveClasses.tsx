import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  Clock,
  Users,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
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
  const [enrollments, setEnrollments] = useState<{user_id: string, course_id: string}[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [customDuration, setCustomDuration] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

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

  /* ---------- MEMOIZED ACTIONS & FETCHERS ---------- */
  const resetForm = useCallback(() => {
    setEditingId(null)
    setCustomDuration(false)
    const today = new Date().toISOString().slice(0, 10)
    setFormData({
      user_id: '',
      title: '',
      instructor_name: 'Rishika',
      meeting_link: defaultLink,
      scheduled_datetime: `${today}T12:00`,
      duration_minutes: '60',
      send_email: true,
    })
  }, [defaultLink])

  /**
   * Fetch classes for the selected date
   */
  const fetchClasses = useCallback(async () => {
    const startOfDay = new Date(selectedDate + "T00:00:00")
    const endOfDay = new Date(selectedDate + "T23:59:59.999")

    const { data } = await supabase
      .from('live_classes')
      .select('*')
      .gte('scheduled_datetime', startOfDay.toISOString())
      .lte('scheduled_datetime', endOfDay.toISOString())
      .order('scheduled_datetime', { ascending: true })

    setClasses(data ?? [])
  }, [selectedDate])

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    fetchEligibleUsers()
    fetchCourses()

    const auto = localStorage.getItem('admin_auto_action')
    if (auto === 'new_class') {
      localStorage.removeItem('admin_auto_action')
      resetForm()
      setPanelOpen(true)
    }
  }, [resetForm])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  /* ================= DATA FETCHING ================= */

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').order('created_at')
    if (data) setCourses(data)
  }

  /**
   * Fetch ONLY users who appear in class_enrollments
   */
  const fetchEligibleUsers = async () => {
    // 1️⃣ Get distinct user_ids and course_ids from course_enrollments
    const { data: enrollmentsData, error: enrollErr } = await supabase
      .from('course_enrollments')
      .select('user_id, course_id')

    if (enrollErr || !enrollmentsData) {
      console.error('Failed to fetch enrollments', enrollErr)
      return
    }

    setEnrollments(enrollmentsData)

    const userIds = Array.from(
      new Set(enrollmentsData.map((e) => e.user_id))
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

  /* ================= HELPERS ================= */

  const getUserName = (id: string) => {
    const u = users.find((x) => x.id === id)
    return u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : '—'
  }

  /* ================= ACTIONS ================= */

  const openCreate = () => {
    resetForm()
    setPanelOpen(true)
  }

  const openEdit = (c: LiveClass) => {
    setEditingId(c.id)
    setCustomDuration(!DURATION_OPTIONS.includes(c.duration_minutes))

    const d = new Date(c.scheduled_datetime)
    const localDateTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

    setFormData({
      user_id: c.user_id,
      title: c.title,
      instructor_name: c.instructor_name || 'Rishika',
      meeting_link: c.meeting_link ?? defaultLink,
      scheduled_datetime: localDateTime,
      duration_minutes: c.duration_minutes?.toString() || '60',
      send_email: false,
    })

    setPanelOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const scheduledDate = new Date(formData.scheduled_datetime)
    const endDate = new Date(scheduledDate.getTime() + Number(formData.duration_minutes) * 60000)

    const payload = {
      user_id: formData.user_id,
      title: formData.title,
      instructor_name: formData.instructor_name,
      meeting_link: formData.meeting_link,
      scheduled_datetime: scheduledDate.toISOString(),
      end_datetime: endDate.toISOString(),
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

  const changeDate = (days: number) => {
    const d = new Date(selectedDate + "T00:00:00")
    d.setDate(d.getDate() + days)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${year}-${month}-${day}`)
  }

  /* ================= UI ================= */

  // Stats calculation
  const classesOnDate = classes.length
  
  // Format selected date for display
  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="p-4 sm:p-6 lg:p-10 w-full flex flex-col min-h-screen overflow-x-hidden">
      {/* HEADER WITH STATS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight mb-2">Live Classes</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Manage all your scheduled sessions.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex">
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs rounded-xl px-4 py-2 flex items-center gap-2.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Classes on {displayDate}:</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">{classesOnDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-lg font-semibold text-xs shadow-xs cursor-pointer"
              title="Edit Default Meeting Link"
            >
              <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
              Default Link
            </button>
            <button
              onClick={openCreate}
              className="flex items-center justify-center gap-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors text-white dark:text-slate-900 px-3.5 py-2 rounded-lg font-semibold text-xs shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Class
            </button>
          </div>
        </div>
      </div>

      {/* DATE NAVIGATOR */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 shadow-sm p-1.5 rounded-2xl">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) setSelectedDate(e.target.value)
            }}
            className="bg-transparent border-none outline-none text-slate-900 dark:text-slate-50 font-bold px-4 py-2 cursor-pointer [&::-webkit-calendar-picker-indicator]:dark:invert"
          />

          <button
            onClick={() => changeDate(1)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* CARD GRID */}
      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 border-dashed rounded-3xl p-12 text-center">
          <Calendar size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">No Classes on {displayDate}</h3>
          <p className="text-slate-500 dark:text-slate-400">You don't have any classes scheduled for this date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
          {classes.map((c) => {
            const start = new Date(c.scheduled_datetime)
            const diffHours = (start.getTime() - new Date().getTime()) / (1000 * 60 * 60)
            
            let statusColor = "bg-slate-200 text-slate-700 dark:text-slate-300"
            let statusText = "Upcoming"
            let accentBar = "bg-slate-300"

            if (diffHours < -(c.duration_minutes / 60)) {
              statusColor = "bg-emerald-100 text-emerald-800"
              statusText = "Completed"
              accentBar = "bg-emerald-500"
            } else if (diffHours < 0 && diffHours >= -(c.duration_minutes / 60)) {
              statusColor = "bg-rose-100 text-rose-700 dark:text-rose-400"
              statusText = "Live Now"
              accentBar = "bg-rose-500"
            } else if (diffHours >= 0 && diffHours <= 24) {
              statusColor = "bg-orange-100 text-orange-800"
              statusText = "Starting Soon"
              accentBar = "bg-orange-400"
            } else if (diffHours > 24) {
              statusColor = "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
              statusText = "Upcoming"
              accentBar = "bg-indigo-500"
            }

            return (
              <div key={c.id} className="group flex flex-col bg-white dark:bg-[#0f172a] rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                {/* Accent Bar */}
                <div className={`h-1 w-full ${accentBar}`} />
                
                <div className="p-5 flex-1 flex flex-col">
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Class Info */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 line-clamp-1" title={c.title}>{c.title}</h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                    <Users size={14} className="text-slate-400" />
                    {c.instructor_name}
                  </p>

                  {/* Student Info */}
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg mb-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xs shrink-0">
                      {getUserName(c.user_id).charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Student</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{getUserName(c.user_id)}</p>
                    </div>
                  </div>

                  {/* Date/Time Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-auto text-xs">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                      <Calendar size={12} className="text-slate-400" />
                      {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                      <Clock size={12} className="text-slate-400" />
                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                      {c.duration_minutes}m
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 p-3 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end gap-2 shrink-0">
                  {c.meeting_link && (
                    <a
                      href={c.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors px-2.5 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    >
                      <LinkIcon size={13} /> Join Class
                    </a>
                  )}
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Edit Class"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                    title="Delete Class"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SIDE PANEL */}
      {panelOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-[#0f172a]">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingId ? 'Edit Class' : 'Schedule Class'}
              </h2>
              <button onClick={() => setPanelOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* USER */}
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Assigned Student</label>
                <select
                  className="w-full border-2 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium min-w-0 bg-slate-50 dark:bg-neutral-800/50"
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
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Class Title</label>
                <select
                  className="w-full border-2 border-slate-200 dark:border-neutral-700 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium min-w-0 bg-slate-50 dark:bg-neutral-900"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                >
                  <option value="">Select a course</option>
                  {(formData.user_id 
                    ? courses.filter(c => enrollments.some(e => e.user_id === formData.user_id && e.course_id === c.id))
                    : courses
                  ).map(c => (
                    <option key={c.id} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* INSTRUCTOR */}
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Instructor</label>
                <input
                  className="w-full border-2 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium min-w-0 bg-slate-50 dark:bg-neutral-800/50"
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
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Meeting Link</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  className="w-full border-2 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium min-w-0 bg-slate-50 dark:bg-neutral-800/50 text-indigo-600"
                  value={formData.meeting_link || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meeting_link: e.target.value,
                    })
                  }
                />
              </div>

              {/* DATE & TIME SPLIT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    className="w-full border-2 border-slate-200 dark:border-neutral-700 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-neutral-800/50"
                    value={formData.scheduled_datetime?.split('T')[0] || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scheduled_datetime: `${e.target.value}T${formData.scheduled_datetime?.split('T')[1] || '12:00'}`,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Time</label>
                  <input
                    type="time"
                    className="w-full border-2 border-slate-200 dark:border-neutral-700 p-3.5 rounded-xl mt-2 focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-neutral-800/50"
                    value={formData.scheduled_datetime?.split('T')[1] || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scheduled_datetime: `${formData.scheduled_datetime?.split('T')[0] || new Date().toISOString().slice(0, 10)}T${e.target.value}`,
                      })
                    }
                    required
                  />
                </div>
              </div>

              {/* DURATION */}
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-3">
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
                          ? 'bg-indigo-600 text-white dark:text-slate-900 border-indigo-600 shadow-md'
                          : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:border-neutral-700 border-slate-200 dark:border-neutral-800 dark:border-neutral-700'
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
                        ? 'bg-indigo-600 text-white dark:text-slate-900 border-indigo-600 shadow-md'
                        : 'bg-white dark:bg-neutral-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:border-neutral-700 border-slate-200 dark:border-neutral-800 dark:border-neutral-700'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {customDuration && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter custom minutes"
                      className="w-full border-2 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 p-3.5 rounded-xl focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium bg-slate-50 dark:bg-neutral-800/50"
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
                      className="bg-white dark:bg-neutral-800 peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 dark:border-neutral-700 checked:border-indigo-600 checked:bg-indigo-600 transition-all outline-none"
                      checked={formData.send_email}
                      onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                    />
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white dark:text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none">Send email notification to student</span>
                </label>
              </div>

              <div className="pt-6 pb-8">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors text-white dark:text-slate-900 py-4 rounded-xl font-black text-lg shadow-lg shadow-indigo-600/20"
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
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#0f172a] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-modal">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Default Meeting Link</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">Meeting Link URL</label>
              <input
                type="url"
                className="w-full border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-colors text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                value={defaultLink}
                onChange={(e) => setDefaultLink(e.target.value)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-normal">This link will automatically fill the Meeting Link field when scheduling a new class.</p>
              
              <button
                onClick={() => {
                  localStorage.setItem('default_meeting_link', defaultLink)
                  if (!editingId) {
                    setFormData(prev => ({...prev, meeting_link: defaultLink}))
                  }
                  setSettingsOpen(false)
                }}
                className="w-full mt-5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold py-2.5 rounded-lg transition-colors text-xs shadow-xs cursor-pointer"
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

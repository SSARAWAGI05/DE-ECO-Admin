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
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

/* ================= CONSTANTS ================= */

const DEFAULT_MEETING_LINK = 'https://meet.google.com/qzh-kctw-doa'
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
  is_active: boolean
}

/* ================= COMPONENT ================= */

export default function LiveClasses() {
  /* ---------- STATE ---------- */
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [users, setUsers] = useState<UserFromDB[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [customDuration, setCustomDuration] = useState(false)

  const [formData, setFormData] = useState({
    user_id: '',
    title: '',
    instructor_name: 'Rishika',
    meeting_link: DEFAULT_MEETING_LINK,
    scheduled_datetime: '',
    duration_minutes: '60',
  })

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    fetchEligibleUsers()
    fetchClasses()
  }, [])

  /* ================= DATA FETCHING ================= */

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
      .select('id, first_name, last_name, is_active')
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
    const now = new Date().toISOString()

    const { data } = await supabase
      .from('live_classes')
      .select('*')
      .gte('end_datetime', now)
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
      meeting_link: DEFAULT_MEETING_LINK,
      scheduled_datetime: '',
      duration_minutes: '60',
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
      meeting_link: c.meeting_link ?? DEFAULT_MEETING_LINK,
      scheduled_datetime: new Date(c.scheduled_datetime)
        .toISOString()
        .slice(0, 16),
      duration_minutes: c.duration_minutes.toString(),
    })

    setPanelOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
    setPanelOpen(false)
    fetchClasses()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this class?')) return
    await supabase.from('live_classes').delete().eq('id', id)
    fetchClasses()
  }

  /* ================= UI ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full ">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-4 border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-1">Live Classes</h1>
          <p className="text-slate-500 font-medium">
            Manage scheduled live sessions
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 transition-colors text-white px-5 py-2.5 rounded-lg font-semibold w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          New Class
        </button>
      </div>

      {/* LIST */}
      <div className="grid gap-4 shrink-0">
        {classes.map((c) => {
          const start = new Date(c.scheduled_datetime)

          return (
            <div
              key={c.id}
              className="grid grid-cols-12 gap-4 bg-white rounded-xl border border-slate-200 p-5 items-center hover:shadow-sm transition-shadow"
            >
              <div className="col-span-12 md:col-span-3">
                <div className="font-semibold text-slate-900">{c.title}</div>
                <div className="text-sm text-slate-500">
                  {c.instructor_name}
                </div>
              </div>

              <div className="col-span-6 md:col-span-2 text-sm text-slate-600 font-medium">
                <Calendar size={14} className="inline mr-1 text-slate-400" />
                {start.toLocaleDateString()}
              </div>

              <div className="col-span-6 md:col-span-2 text-sm text-slate-600 font-medium">
                <Clock size={14} className="inline mr-1 text-slate-400" />
                {start.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {c.duration_minutes}m
              </div>

              <div className="col-span-12 md:col-span-3 text-sm text-slate-600">
                <span className="text-slate-400 mr-1">Assigned:</span> 
                <span className="font-medium text-slate-900">{getUserName(c.user_id)}</span>
              </div>

              <div className="col-span-12 md:col-span-2 flex justify-end gap-1">
                {c.meeting_link && (
                  <a
                    href={c.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <LinkIcon size={18} />
                  </a>
                )}
                <button
                  onClick={() => openEdit(c)}
                  className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* SIDE PANEL */}
      {panelOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Edit Class' : 'Create Class'}
              </h2>
              <button onClick={() => setPanelOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* USER */}
              <div>
                <label className="text-sm font-semibold text-slate-700">Assigned User</label>
                <select
                  className="w-full border border-slate-300 p-2.5 rounded-lg mt-1.5 focus:ring-2 focus:ring-slate-900 outline-none transition-shadow"
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
                <label className="text-sm font-semibold text-slate-700">Class Title</label>
                <input
                  className="w-full border border-slate-300 p-2.5 rounded-lg mt-1.5 focus:ring-2 focus:ring-slate-900 outline-none transition-shadow"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              {/* INSTRUCTOR */}
              <div>
                <label className="text-sm font-semibold text-slate-700">Instructor</label>
                <input
                  className="w-full border border-slate-300 p-2.5 rounded-lg mt-1.5 focus:ring-2 focus:ring-slate-900 outline-none transition-shadow"
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
                <label className="text-sm font-semibold text-slate-700">Meeting Link</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  className="w-full border border-slate-300 p-2.5 rounded-lg mt-1.5 focus:ring-2 focus:ring-slate-900 outline-none transition-shadow"
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
              <div>
                <label className="text-sm font-semibold text-slate-700">Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full border border-slate-300 p-2.5 rounded-lg mt-1.5 focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-700"
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

              {/* DURATION */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">
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
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        formData.duration_minutes === d.toString()
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
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
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      customDuration
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    Other
                  </button>
                </div>

                {customDuration && (
                  <input
                    type="number"
                    placeholder="Custom duration (minutes)"
                    className="w-full border border-slate-300 p-2.5 rounded-lg mt-3 focus:ring-2 focus:ring-slate-900 outline-none transition-shadow"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: e.target.value,
                      })
                    }
                    required
                  />
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 transition-colors text-white py-4 rounded-xl font-bold"
                >
                  {editingId ? 'Update Class' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

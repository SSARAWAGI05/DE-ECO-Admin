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
      .select('id, first_name, last_name')
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
    <div className="relative h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div>
          <h1 className="text-2xl font-bold">Live Classes</h1>
          <p className="text-gray-600">
            Manage scheduled live sessions
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg"
        >
          <Plus size={18} />
          New Class
        </button>
      </div>

      {/* LIST */}
      <div className="p-6 space-y-3">
        {classes.map((c) => {
          const start = new Date(c.scheduled_datetime)

          return (
            <div
              key={c.id}
              className="grid grid-cols-12 gap-4 bg-white rounded-xl border p-4 items-center"
            >
              <div className="col-span-12 md:col-span-3">
                <div className="font-semibold">{c.title}</div>
                <div className="text-sm text-gray-500">
                  {c.instructor_name}
                </div>
              </div>

              <div className="col-span-6 md:col-span-2 text-sm">
                <Calendar size={14} className="inline mr-1" />
                {start.toLocaleDateString()}
              </div>

              <div className="col-span-6 md:col-span-2 text-sm">
                <Clock size={14} className="inline mr-1" />
                {start.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {c.duration_minutes}m
              </div>

              <div className="col-span-12 md:col-span-3 text-sm">
                Assigned: {getUserName(c.user_id)}
              </div>

              <div className="col-span-12 md:col-span-2 flex justify-end gap-2">
                {c.meeting_link && (
                  <a
                    href={c.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <LinkIcon size={16} />
                  </a>
                )}
                <button
                  onClick={() => openEdit(c)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* SIDE PANEL */}
      {panelOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">
                {editingId ? 'Edit Class' : 'Create Class'}
              </h2>
              <button onClick={() => setPanelOpen(false)}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* USER */}
              <div>
                <label className="text-sm font-medium">Assigned User</label>
                <select
                  className="w-full border p-2.5 rounded-lg mt-1"
                  value={formData.user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, user_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select enrolled user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* TITLE */}
              <div>
                <label className="text-sm font-medium">Class Title</label>
                <input
                  className="w-full border p-2.5 rounded-lg mt-1"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              {/* INSTRUCTOR */}
              <div>
                <label className="text-sm font-medium">Instructor</label>
                <input
                  className="w-full border p-2.5 rounded-lg mt-1"
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

              {/* DATE */}
              <div>
                <label className="text-sm font-medium">Date & Time</label>
                <input
                  type="datetime-local"
                  className="w-full border p-2.5 rounded-lg mt-1"
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
                <label className="text-sm font-medium mb-2 block">
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
                      className={`px-4 py-2 rounded-md border text-sm ${
                        formData.duration_minutes === d.toString()
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white hover:bg-gray-100'
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
                    className={`px-4 py-2 rounded-md border text-sm ${
                      customDuration
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    Other
                  </button>
                </div>

                {customDuration && (
                  <input
                    type="number"
                    placeholder="Custom duration (minutes)"
                    className="w-full border p-2.5 rounded-lg mt-3"
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

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium mt-6"
              >
                {editingId ? 'Update Class' : 'Create Class'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

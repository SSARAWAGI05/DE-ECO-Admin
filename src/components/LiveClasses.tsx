import { useEffect, useState } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Calendar,
  Clock,
  Users,
  Link,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

/* ================= CONSTANT ================= */

// 🔗 Default / common meeting link
const DEFAULT_MEETING_LINK = 'https://meet.google.com/iep-zvtx-avk'

/* ================= TYPES ================= */

interface LiveClass {
  id: string
  user_id: string
  title: string
  instructor_name: string
  meeting_link: string | null
  scheduled_date: string
  start_time: string
  duration_minutes: number
  current_participants: number
}

interface UserFromDB {
  id: string
  first_name: string | null
  last_name: string | null
}

/* ================= COMPONENT ================= */

export default function LiveClasses() {
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [users, setUsers] = useState<UserFromDB[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    user_id: '',
    title: '',
    instructor_name: '',
    meeting_link: DEFAULT_MEETING_LINK, // ✅ DEFAULT
    scheduled_date: '',
    start_time: '',
    duration_minutes: '',
  })

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    fetchUsers()
    fetchClasses()
  }, [])

  /* ================= FETCH USERS ================= */

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .order('first_name')

    if (error) {
      console.error('Failed to fetch users:', error)
      return
    }

    setUsers(data ?? [])
  }

  /* ================= FETCH CLASSES ================= */

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('live_classes')
      .select('*')
      .order('scheduled_date', { ascending: true })

    if (error) {
      console.error('Failed to fetch classes:', error)
      return
    }

    setClasses(data ?? [])
  }

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.user_id) {
      alert('Please select a user')
      return
    }

    const payload = {
      user_id: formData.user_id,
      title: formData.title,
      instructor_name: formData.instructor_name,
      meeting_link: formData.meeting_link || DEFAULT_MEETING_LINK,
      scheduled_date: formData.scheduled_date,
      start_time: formData.start_time,
      end_time: calculateEndTime(
        formData.start_time,
        Number(formData.duration_minutes)
      ),
      duration_minutes: Number(formData.duration_minutes),
    }

    const { error } = editingId
      ? await supabase
          .from('live_classes')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('live_classes').insert(payload)

    if (error) {
      console.error('Insert/Update failed:', error)
      alert(error.message)
      return
    }

    closeForm()
    fetchClasses()
  }

  /* ================= EDIT ================= */

  const handleEdit = (liveClass: LiveClass) => {
    setFormData({
      user_id: liveClass.user_id,
      title: liveClass.title,
      instructor_name: liveClass.instructor_name,
      meeting_link:
        liveClass.meeting_link ?? DEFAULT_MEETING_LINK,
      scheduled_date: liveClass.scheduled_date,
      start_time: liveClass.start_time,
      duration_minutes: liveClass.duration_minutes.toString(),
    })

    setEditingId(liveClass.id)
    setShowForm(true)
  }

  /* ================= DELETE ================= */

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('live_classes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete failed:', error)
      alert(error.message)
      return
    }

    fetchClasses()
  }

  /* ================= HELPERS ================= */

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      user_id: '',
      title: '',
      instructor_name: '',
      meeting_link: DEFAULT_MEETING_LINK,
      scheduled_date: '',
      start_time: '',
      duration_minutes: '',
    })
  }

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return '—'
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  }

  const calculateEndTime = (
    startTime: string,
    durationMinutes: number
  ): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes + durationMinutes, 0, 0)
    return date.toTimeString().slice(0, 5)
  }

  /* ================= UI ================= */

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Classes</h1>
          <p className="text-gray-600">
            Schedule and manage live class sessions
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow"
        >
          <Plus className="w-5 h-5" />
          Schedule Class
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingId ? 'Edit Class' : 'New Class'}
              </h2>
              <button onClick={closeForm}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* USER */}
              <select
                className="w-full border p-2 rounded"
                value={formData.user_id}
                onChange={(e) =>
                  setFormData({ ...formData, user_id: e.target.value })
                }
                required
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>

              <input
                placeholder="Class Title"
                className="w-full border p-2 rounded"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />

              <input
                placeholder="Instructor Name"
                className="w-full border p-2 rounded"
                value={formData.instructor_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    instructor_name: e.target.value,
                  })
                }
                required
              />

              {/* MEETING LINK */}
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="url"
                  placeholder={DEFAULT_MEETING_LINK}
                  className="w-full border p-2 pl-9 rounded"
                  value={formData.meeting_link}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meeting_link: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="border p-2 rounded"
                  value={formData.scheduled_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_date: e.target.value,
                    })
                  }
                  required
                />
                <input
                  type="time"
                  className="border p-2 rounded"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      start_time: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <input
                type="number"
                placeholder="Duration (minutes)"
                className="w-full border p-2 rounded"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: e.target.value,
                  })
                }
                required
              />

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded"
              >
                {editingId ? 'Update Class' : 'Create Class'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-4">
        {classes.map((c) => (
          <div key={c.id} className="bg-white p-6 rounded-xl shadow">
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold text-lg">{c.title}</h3>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <div className="flex gap-2 items-center">
                    <Users size={14} /> {c.instructor_name}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Calendar size={14} /> {c.scheduled_date}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Clock size={14} /> {c.start_time} ·{' '}
                    {c.duration_minutes} min
                  </div>

                  {c.meeting_link && (
                    <a
                      href={c.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-600 text-sm underline"
                    >
                      Join Meeting
                    </a>
                  )}

                  <div className="text-gray-500">
                    Assigned to: {getUserName(c.user_id)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => handleEdit(c)}>
                  <Edit2 className="text-green-600" />
                </button>
                <button onClick={() => handleDelete(c.id)}>
                  <Trash2 className="text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

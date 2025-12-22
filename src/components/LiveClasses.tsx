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

const DEFAULT_MEETING_LINK = 'https://meet.google.com/iep-zvtx-avk'

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
    meeting_link: DEFAULT_MEETING_LINK,

    // UI-only field
    scheduled_datetime: '',  // ✅ NEW
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
      .order('scheduled_datetime', { ascending: true })

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

    if (!formData.scheduled_datetime) {  // ✅ NEW
      alert('Please select date and time')
      return
    }

    const scheduledDatetime = new Date(formData.scheduled_datetime).toISOString()  // ✅ NEW

    const payload = {
      user_id: formData.user_id,
      title: formData.title,
      instructor_name: formData.instructor_name,
      meeting_link: formData.meeting_link || DEFAULT_MEETING_LINK,
      scheduled_datetime: scheduledDatetime,
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
    const dt = new Date(liveClass.scheduled_datetime)

    setFormData({
      user_id: liveClass.user_id,
      title: liveClass.title,
      instructor_name: liveClass.instructor_name,
      meeting_link: liveClass.meeting_link ?? DEFAULT_MEETING_LINK,

      scheduled_datetime: dt.toISOString().slice(0, 16), // ✅ NEW: "YYYY-MM-DDTHH:mm"
      duration_minutes: liveClass.duration_minutes.toString(),
    })

    setEditingId(liveClass.id)
    setShowForm(true)
  }

  /* ================= DELETE ================= */

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this class?')) return

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
      scheduled_datetime: '',  // ✅ NEW
      duration_minutes: '',
    })
  }

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return '—'
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  }

  /* ================= UI ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
            Live Classes
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Schedule and manage live class sessions
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-green-600 active:bg-green-700 text-white px-5 py-3 rounded-lg shadow text-sm sm:text-base w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Schedule
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl sm:text-2xl font-bold">
                {editingId ? 'Edit Class' : 'New Class'}
              </h2>
              <button onClick={closeForm} className="p-2 -mr-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <select
                className="w-full border p-3 rounded-lg text-base"
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
                className="w-full border p-3 rounded-lg text-base"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />

              <input
                placeholder="Instructor Name"
                className="w-full border p-3 rounded-lg text-base"
                value={formData.instructor_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    instructor_name: e.target.value,
                  })
                }
                required
              />

              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="url"
                  placeholder={DEFAULT_MEETING_LINK}
                  className="w-full border p-3 pl-10 rounded-lg text-base"
                  value={formData.meeting_link}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      meeting_link: e.target.value,
                    })
                  }
                />
              </div>

              <input
                type="datetime-local"
                className="w-full border p-3 rounded-lg text-base"
                value={formData.scheduled_datetime}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scheduled_datetime: e.target.value,
                  })
                }
                required
              />

              <input
                type="number"
                placeholder="Duration (minutes)"
                className="w-full border p-3 rounded-lg text-base"
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
                className="w-full bg-green-600 active:bg-green-700 text-white py-3.5 rounded-lg font-medium text-base"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-3 sm:gap-4">
        {classes.map((c) => {
          const start = new Date(c.scheduled_datetime)

          return (
            <div
              key={c.id}
              className="bg-white p-4 sm:p-6 rounded-xl shadow-md active:shadow-lg transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg sm:text-xl mb-2">
                    {c.title}
                  </h3>

                  <div className="text-sm sm:text-base text-gray-600 space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <Users size={16} />
                      {c.instructor_name}
                    </div>

                    <div className="flex gap-2 items-center">
                      <Calendar size={16} />
                      {start.toLocaleDateString()}
                    </div>

                    <div className="flex gap-2 items-center">
                      <Clock size={16} />
                      {start.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {c.duration_minutes} min
                    </div>

                    {c.meeting_link && (
                      <a
                        href={c.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-green-600 text-sm font-medium underline"
                      >
                        <Link size={14} /> Join Meeting
                      </a>
                    )}

                    <div className="text-gray-500 text-sm truncate">
                      Assigned to: {getUserName(c.user_id)}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2">
                  <button
                    onClick={() => handleEdit(c)}
                    className="p-2.5 text-green-600 active:bg-green-50 rounded-lg"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2.5 text-red-600 active:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X, Play } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

/* ================= TYPES ================= */

interface ClassRecording {
  id: string
  class_id: string | null
  user_id: string
  title: string
  video_url: string
}

interface LiveClass {
  id: string
  title: string
}

interface UserProfile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}


/* ================= COMPONENT ================= */

export default function ClassRecordings() {
  const [recordings, setRecordings] = useState<ClassRecording[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    class_id: '', // optional
    user_id: '',  // required
    title: '',    // required
    video_url: '',// required
  })

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    fetchRecordings()
    fetchClasses()
    fetchUsers()
  }, [])

  /* ================= FETCH RECORDINGS ================= */

  const fetchRecordings = async () => {
    const { data, error } = await supabase
      .from('class_recordings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch recordings:', error)
      return
    }

    setRecordings(data ?? [])
  }

  /* ================= FETCH CLASSES ================= */

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('live_classes')
      .select('id, title')
      .order('scheduled_date')

    if (error) {
      console.error('Failed to fetch classes:', error)
      return
    }

    setClasses(data ?? [])
  }

  /* ================= FETCH USERS ================= */

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .order('first_name')

    if (error) {
      console.error('Failed to fetch users:', error)
      return
    }

    setUsers(data ?? [])
  }

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 🔒 REQUIRED VALIDATION
    if (!formData.user_id || !formData.title || !formData.video_url) {
      alert('User, title and video URL are required')
      return
    }

    const payload = {
      class_id: formData.class_id || null, // optional
      user_id: formData.user_id,
      title: formData.title,
      video_url: formData.video_url,
    }

    const { error } = editingId
      ? await supabase
          .from('class_recordings')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('class_recordings').insert(payload)

    if (error) {
      console.error('Save failed:', error)
      alert(error.message)
      return
    }

    closeForm()
    fetchRecordings()
  }

  /* ================= EDIT ================= */

  const handleEdit = (recording: ClassRecording) => {
    setFormData({
      class_id: recording.class_id ?? '',
      user_id: recording.user_id,
      title: recording.title,
      video_url: recording.video_url,
    })

    setEditingId(recording.id)
    setShowForm(true)
  }

  /* ================= DELETE ================= */

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('class_recordings')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete failed:', error)
      alert(error.message)
      return
    }

    fetchRecordings()
  }

  /* ================= HELPERS ================= */

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      class_id: '',
      user_id: '',
      title: '',
      video_url: '',
    })
  }

  const getClassTitle = (classId: string | null) => {
    if (!classId) return '—'
    return classes.find((c) => c.id === classId)?.title ?? '—'
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Class Recordings</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Upload and manage recorded class sessions
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-pink-600 active:bg-pink-700 text-white px-5 py-3 rounded-lg shadow text-sm sm:text-base w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl sm:text-2xl font-bold">
                {editingId ? 'Edit Recording' : 'Add Recording'}
              </h2>
              <button onClick={closeForm} className="p-2 -mr-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {/* CLASS (OPTIONAL) */}
              <select
                className="w-full border p-3 rounded-lg text-base"
                value={formData.class_id}
                onChange={(e) =>
                  setFormData({ ...formData, class_id: e.target.value })
                }
              >
                <option value="">No class (optional)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              {/* USER (REQUIRED) */}
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
                    {`${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()}
                    {u.email ? ` (${u.email})` : ''}
                  </option>
                ))}
              </select>

              <input
                placeholder="Title"
                className="w-full border p-3 rounded-lg text-base"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />

              <input
                type="url"
                placeholder="Video URL"
                className="w-full border p-3 rounded-lg text-base"
                value={formData.video_url}
                onChange={(e) =>
                  setFormData({ ...formData, video_url: e.target.value })
                }
                required
              />

              <button
                type="submit"
                className="w-full bg-pink-600 active:bg-pink-700 text-white py-3.5 rounded-lg font-medium text-base"
              >
                {editingId ? 'Update' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-3 sm:gap-4">
        {recordings.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-xl shadow-md active:shadow-lg transition-shadow p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="bg-pink-100 p-3 rounded-lg flex-shrink-0 h-fit">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg mb-1 truncate">{r.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">
                    Class: {getClassTitle(r.class_id)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mb-2 truncate">
                    User: {getUserName(r.user_id)}
                  </p>
                  <a
                    href={r.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-pink-600 text-sm inline-flex items-center gap-1 font-medium"
                  >
                    <Play size={14} /> Watch
                  </a>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2">
                <button
                  onClick={() => handleEdit(r)}
                  className="flex-1 sm:flex-initial p-2.5 text-pink-600 active:bg-pink-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="flex-1 sm:flex-initial p-2.5 text-red-600 active:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
  is_active: boolean
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
      .select('id, first_name, last_name, email, is_active')
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
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-full">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-1">Class Recordings</h1>
          <p className="text-slate-500 font-medium mt-1">
            Upload and manage recorded class sessions
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-6 py-2.5 rounded-lg shadow-sm font-semibold w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Recording
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {editingId ? 'Edit Recording' : 'Add Recording'}
              </h2>
              <button onClick={closeForm} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* CLASS (OPTIONAL) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Class (Optional)</label>
                <select
                  className="w-full border border-slate-300 p-3.5 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 transition-shadow bg-slate-50"
                  value={formData.class_id}
                  onChange={(e) =>
                    setFormData({ ...formData, class_id: e.target.value })
                  }
                >
                  <option value="">No class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* USER (REQUIRED) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Student</label>
                <select
                  className="w-full border border-slate-300 p-3.5 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 transition-shadow bg-slate-50"
                  value={formData.user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, user_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select user</option>
                  {users.filter(u => u.is_active).map((u) => (
                    <option key={u.id} value={u.id}>
                      {`${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()}
                      {u.email ? ` (${u.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  placeholder="e.g. Session 1 Recording"
                  className="w-full border border-slate-300 p-3.5 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 transition-shadow placeholder:text-slate-400"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Video URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full border border-slate-300 p-3.5 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 transition-shadow placeholder:text-slate-400"
                  value={formData.video_url}
                  onChange={(e) =>
                    setFormData({ ...formData, video_url: e.target.value })
                  }
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-base transition-colors shadow-sm"
                >
                  {editingId ? 'Update Recording' : 'Add Recording'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recordings.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow p-6 flex flex-col"
          >
            <div className="flex gap-4 flex-1">
              <div className="bg-indigo-50 p-3.5 rounded-xl flex-shrink-0 h-fit">
                <Play className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-slate-900 mb-1.5 truncate" title={r.title}>{r.title}</h3>
                
                <div className="space-y-1 mb-4">
                  <p className="text-sm font-medium text-slate-500 truncate">
                    <span className="text-slate-400 mr-1">Class:</span> {getClassTitle(r.class_id)}
                  </p>
                  <p className="text-sm font-medium text-slate-500 truncate">
                    <span className="text-slate-400 mr-1">Student:</span> {getUserName(r.user_id)}
                  </p>
                </div>

                <a
                  href={r.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5 font-bold transition-colors"
                >
                  <Play size={16} /> Watch
                </a>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={() => handleEdit(r)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

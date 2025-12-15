import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X, Download, FileText } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

/* ================= TYPES ================= */

interface ClassNote {
  id: string
  class_id: string | null
  user_id: string
  uploaded_by: string | null
  title: string
  file_url: string
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

export default function ClassNotes() {
  const [notes, setNotes] = useState<ClassNote[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    class_id: '',     // optional
    user_id: '',      // required
    title: '',        // required
    file_url: '',     // required
  })

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    fetchNotes()
    fetchClasses()
    fetchUsers()
  }, [])

  /* ================= FETCH NOTES ================= */

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('class_notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch notes:', error)
      return
    }

    setNotes(data ?? [])
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
    if (!formData.user_id || !formData.title || !formData.file_url) {
      alert('User, Title, and File URL are required')
      return
    }

    const payload = {
      class_id: formData.class_id || null, // ✅ OPTIONAL
      user_id: formData.user_id,            // ✅ REQUIRED
      title: formData.title,
      file_url: formData.file_url,
    }

    const { error } = editingId
      ? await supabase
          .from('class_notes')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('class_notes').insert(payload)

    if (error) {
      console.error('Save failed:', error)
      alert(error.message)
      return
    }

    closeForm()
    fetchNotes()
  }

  /* ================= EDIT ================= */

  const handleEdit = (note: ClassNote) => {
    setFormData({
      class_id: note.class_id ?? '',
      user_id: note.user_id,
      title: note.title,
      file_url: note.file_url,
    })

    setEditingId(note.id)
    setShowForm(true)
  }

  /* ================= DELETE ================= */

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('class_notes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete failed:', error)
      alert(error.message)
      return
    }

    fetchNotes()
  }

  /* ================= HELPERS ================= */

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ class_id: '', user_id: '', title: '', file_url: '' })
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
    <div className="p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Class Notes</h1>
          <p className="text-gray-600">Upload and manage class study materials</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg shadow"
        >
          <Plus className="w-5 h-5" />
          Upload Notes
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingId ? 'Edit Notes' : 'Upload Notes'}
              </h2>
              <button onClick={closeForm}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* CLASS (OPTIONAL) */}
              <select
                className="w-full border p-2 rounded"
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
                    {`${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()}
                    {u.email ? ` (${u.email})` : ''}
                  </option>
                ))}
              </select>

              <input
                placeholder="Title"
                className="w-full border p-2 rounded"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />

              <input
                type="url"
                placeholder="File URL"
                className="w-full border p-2 rounded"
                value={formData.file_url}
                onChange={(e) =>
                  setFormData({ ...formData, file_url: e.target.value })
                }
                required
              />

              <button
                type="submit"
                className="w-full bg-orange-600 text-white py-2 rounded"
              >
                {editingId ? 'Update Notes' : 'Upload Notes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-white rounded-xl shadow p-6 flex justify-between"
          >
            <div className="flex gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold">{note.title}</h3>
                <p className="text-sm text-gray-600">
                  Class: {getClassTitle(note.class_id)}
                </p>
                <p className="text-sm text-gray-600">
                  User: {getUserName(note.user_id)}
                </p>
                <a
                  href={note.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-600 text-sm inline-flex items-center gap-1 mt-1"
                >
                  <Download size={14} /> Download
                </a>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleEdit(note)}>
                <Edit2 className="text-orange-600" />
              </button>
              <button onClick={() => handleDelete(note.id)}>
                <Trash2 className="text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Plus, Trash2, X, Search } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

/* ================= TYPES ================= */

interface Enrollment {
  id: string
  class_id: string
  user_id: string
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

export default function ClassEnrollments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    class_id: '',
    user_id: '',
  })

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    fetchEnrollments()
    fetchClasses()
    fetchUsers()
  }, [])

  /* ================= FETCH ENROLLMENTS ================= */

  const fetchEnrollments = async () => {
    const { data, error } = await supabase
      .from('class_enrollments')
      .select('*')
      .order('enrollment_date', { ascending: false })

    if (error) {
      console.error('Failed to fetch enrollments:', error)
      return
    }

    setEnrollments(data ?? [])
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

  if (!formData.user_id) {
    alert('Please select a user')
    return
  }

  const payload = {
    class_id: formData.class_id || null, // ✅ OPTIONAL
    user_id: formData.user_id,           // ✅ REQUIRED
  }

  const { error } = await supabase
    .from('class_enrollments')
    .insert(payload)

  if (error) {
    console.error(error)
    alert(error.message)
    return
  }

  closeForm()
  fetchEnrollments()
}


  /* ================= DELETE ================= */

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('class_enrollments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete failed:', error)
      alert(error.message)
      return
    }

    fetchEnrollments()
  }

  /* ================= HELPERS ================= */

  const closeForm = () => {
    setShowForm(false)
    setFormData({ class_id: '', user_id: '' })
  }

  const getClassTitle = (classId: string) => {
    return classes.find((c) => c.id === classId)?.title ?? '—'
  }

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return '—'
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
  }

  const filteredEnrollments = enrollments.filter(
    (e) =>
      getClassTitle(e.class_id)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      getUserName(e.user_id)
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  )

  /* ================= UI ================= */

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Class Enrollments</h1>
          <p className="text-gray-600">
            Manage student enrollments in classes
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg shadow"
        >
          <Plus className="w-5 h-5" />
          Enroll Student
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex justify-between p-6 border-b">
              <h2 className="text-xl font-bold">New Enrollment</h2>
              <button onClick={closeForm}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <select
                className="w-full border p-2 rounded"
                value={formData.class_id}
                onChange={(e) =>
                  setFormData({ ...formData, class_id: e.target.value })
                }
              >
                <option value="">No Class (Optional)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

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

              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-2 rounded"
              >
                Enroll Student
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            placeholder="Search by class or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold">
                Enrollment ID
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold">
                Class
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold">
                User
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredEnrollments.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{e.id}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                    {getClassTitle(e.class_id)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    {getUserName(e.user_id)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEnrollments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No enrollments found
          </div>
        )}
      </div>
    </div>
  )
}

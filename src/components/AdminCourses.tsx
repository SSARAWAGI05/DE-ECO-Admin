import { useEffect, useState } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Clock,
  Users,
  Calendar,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

/* ================= TYPES ================= */

interface Course {
  id: string
  title: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  duration_weeks: number | null
  thumbnail_url: string | null
  enrollment_deadline: string | null
  price: number | null
  instructor_name: string | null
  what_you_learn: string[] | null
  prerequisites: string[] | null
  is_active: boolean
  created_at: string
}

/* ================= COMPONENT ================= */

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    duration_weeks: '',
    thumbnail_url: '',
    enrollment_deadline: '',
    price: '',
    instructor_name: '',
    what_you_learn: '',
    prerequisites: '',
    is_active: true,
  })

  /* ================= FETCH ================= */

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch failed:', error)
      return
    }

    setCourses(data ?? [])
  }

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      title: formData.title,
      description: formData.description,
      level: formData.level,
      duration_weeks: formData.duration_weeks
        ? Number(formData.duration_weeks)
        : null,
      thumbnail_url: formData.thumbnail_url || null,
      enrollment_deadline: formData.enrollment_deadline || null,
      price: formData.price ? Number(formData.price) : null,
      instructor_name: formData.instructor_name || null,
      what_you_learn: formData.what_you_learn
        ? formData.what_you_learn.split('\n').filter(Boolean)
        : [],
      prerequisites: formData.prerequisites
        ? formData.prerequisites.split('\n').filter(Boolean)
        : [],
      is_active: formData.is_active,
    }

    const { error } = editingId
      ? await supabase
          .from('courses')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('courses').insert(payload)

    if (error) {
      alert(error.message)
      return
    }

    closeForm()
    fetchCourses()
  }

  /* ================= EDIT ================= */

  const handleEdit = (course: Course) => {
    setFormData({
      title: course.title,
      description: course.description,
      level: course.level,
      duration_weeks: course.duration_weeks?.toString() ?? '',
      thumbnail_url: course.thumbnail_url ?? '',
      enrollment_deadline: course.enrollment_deadline?.slice(0, 10) ?? '',
      price: course.price?.toString() ?? '',
      instructor_name: course.instructor_name ?? '',
      what_you_learn: course.what_you_learn?.join('\n') ?? '',
      prerequisites: course.prerequisites?.join('\n') ?? '',
      is_active: course.is_active,
    })

    setEditingId(course.id)
    setShowForm(true)
  }

  /* ================= DELETE ================= */

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course?')) return

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    fetchCourses()
  }

  /* ================= HELPERS ================= */

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      title: '',
      description: '',
      level: 'beginner',
      duration_weeks: '',
      thumbnail_url: '',
      enrollment_deadline: '',
      price: '',
      instructor_name: '',
      what_you_learn: '',
      prerequisites: '',
      is_active: true,
    })
  }

  /* ================= UI ================= */

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Courses Admin</h1>
          <p className="text-gray-600">Manage all courses</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg"
        >
          <Plus /> Add Course
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold">
                {editingId ? 'Edit Course' : 'New Course'}
              </h2>
              <button onClick={closeForm}><X /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">

              <input
                className="w-full border p-3 rounded-lg"
                placeholder="Course Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />

              <textarea
                className="w-full border p-3 rounded-lg"
                placeholder="Short Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />

              <select
                className="border p-3 rounded-lg w-full"
                value={formData.level}
                onChange={(e) =>
                  setFormData({ ...formData, level: e.target.value as any })
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              <input
                type="number"
                className="w-full border p-3 rounded-lg"
                placeholder="Duration (weeks)"
                value={formData.duration_weeks}
                onChange={(e) =>
                  setFormData({ ...formData, duration_weeks: e.target.value })
                }
              />

              <input
                className="w-full border p-3 rounded-lg"
                placeholder="Instructor Name"
                value={formData.instructor_name}
                onChange={(e) =>
                  setFormData({ ...formData, instructor_name: e.target.value })
                }
              />

              <input
                type="number"
                className="w-full border p-3 rounded-lg"
                placeholder="Price (INR)"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
              />

              <input
                type="date"
                className="w-full border p-3 rounded-lg"
                value={formData.enrollment_deadline}
                onChange={(e) =>
                  setFormData({ ...formData, enrollment_deadline: e.target.value })
                }
              />

              <textarea
                className="w-full border p-3 rounded-lg"
                placeholder="What you'll learn (one per line)"
                value={formData.what_you_learn}
                onChange={(e) =>
                  setFormData({ ...formData, what_you_learn: e.target.value })
                }
              />

              <textarea
                className="w-full border p-3 rounded-lg"
                placeholder="Prerequisites (one per line)"
                value={formData.prerequisites}
                onChange={(e) =>
                  setFormData({ ...formData, prerequisites: e.target.value })
                }
              />

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
                Active
              </label>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
              >
                {editingId ? 'Update Course' : 'Create Course'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-4">
        {courses.map((c) => (
          <div
            key={c.id}
            className="bg-white p-5 rounded-xl shadow flex justify-between"
          >
            <div>
              <h3 className="font-bold text-lg">{c.title}</h3>
              <p className="text-sm text-gray-600">{c.description}</p>

              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <span><Users size={14} /> {c.level}</span>
                <span><Clock size={14} /> {c.duration_weeks ?? '—'} weeks</span>
                <span><Calendar size={14} /> {c.enrollment_deadline ?? '—'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(c)}
                className="p-2 text-blue-600"
              >
                <Edit2 />
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="p-2 text-red-600"
              >
                <Trash2 />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

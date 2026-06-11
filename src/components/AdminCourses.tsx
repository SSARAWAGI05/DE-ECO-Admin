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
      ? await supabase.from('courses').update(payload).eq('id', editingId)
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

    const { error } = await supabase.from('courses').delete().eq('id', id)

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
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full ">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-4 border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-1">Courses Admin</h1>
          <p className="text-slate-500 font-medium">Manage all courses and curriculum</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 transition-colors text-white px-5 py-2.5 rounded-lg font-semibold w-full sm:w-auto"
        >
          <Plus size={18} /> Add Course
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Edit Course' : 'New Course'}
              </h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"><X /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              <input
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                placeholder="Course Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />

              <textarea
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                placeholder="Short Description (Optional)"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />

              <select
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900"
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
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                placeholder="Duration (weeks)"
                value={formData.duration_weeks}
                onChange={(e) =>
                  setFormData({ ...formData, duration_weeks: e.target.value })
                }
              />

              {/* THUMBNAIL URL */}
              <input
                type="url"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                placeholder="Thumbnail Image URL (https://...)"
                value={formData.thumbnail_url}
                onChange={(e) =>
                  setFormData({ ...formData, thumbnail_url: e.target.value })
                }
              />

              {formData.thumbnail_url && (
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={formData.thumbnail_url}
                    alt="Thumbnail preview"
                    className="w-full h-auto block"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}

              <input
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                placeholder="Instructor Name"
                value={formData.instructor_name}
                onChange={(e) =>
                  setFormData({ ...formData, instructor_name: e.target.value })
                }
              />

              <input
                type="number"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                placeholder="Price (INR)"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
              />

              <input
                type="date"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-700"
                value={formData.enrollment_deadline}
                onChange={(e) =>
                  setFormData({ ...formData, enrollment_deadline: e.target.value })
                }
              />

              <textarea
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                placeholder="What you'll learn (one per line)"
                value={formData.what_you_learn}
                onChange={(e) =>
                  setFormData({ ...formData, what_you_learn: e.target.value })
                }
              />

              <textarea
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                placeholder="Prerequisites (one per line)"
                value={formData.prerequisites}
                onChange={(e) =>
                  setFormData({ ...formData, prerequisites: e.target.value })
                }
              />

              <label className="flex items-center gap-3 cursor-pointer text-slate-700 font-medium">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                />
                Active
              </label>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-bold transition-colors"
                >
                  {editingId ? 'Update Course' : 'Create Course'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-5">
        {courses.map((c) => (
          <div
            key={c.id}
            className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between gap-4 hover:shadow-sm transition-shadow"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-xl text-slate-900">{c.title}</h3>
                {!c.is_active && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-4 max-w-2xl">{c.description}</p>

              <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1.5"><Users size={16} className="text-slate-400"/> <span className="capitalize">{c.level}</span></span>
                <span className="flex items-center gap-1.5"><Clock size={16} className="text-slate-400"/> {c.duration_weeks ?? '—'} weeks</span>
                <span className="flex items-center gap-1.5"><Calendar size={16} className="text-slate-400"/> {c.enrollment_deadline ?? '—'}</span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0 self-start">
              <button
                onClick={() => handleEdit(c)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

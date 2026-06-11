import { useEffect, useState } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Link,
  Image,
  Clock,
  Eye,
  Tag,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

/* ================= TYPES ================= */

interface MarketReel {
  id: string
  title: string
  description: string | null
  reel_url: string
  thumbnail_url: string | null
  platform: 'instagram' | 'youtube' | 'x'
  duration_seconds: number | null
  view_count: number
  published_at: string
  is_active: boolean
  tag: string
}

/* ================= COMPONENT ================= */

export default function MarketPulse() {
  const [reels, setReels] = useState<MarketReel[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    reel_url: '',
    thumbnail_url: '',
    platform: 'instagram' as 'instagram' | 'youtube' | 'x',
    duration_seconds: '',
    view_count: '',
    published_at: '',
    tag: '',
    is_active: true,
  })

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    fetchReels()
  }, [])

  /* ================= FETCH ================= */

  const fetchReels = async () => {
    const { data, error } = await supabase
      .from('market_reels')
      .select('*')
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch reels:', error)
      return
    }

    setReels(data ?? [])
  }

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      title: formData.title,
      reel_url: formData.reel_url,
      thumbnail_url: formData.thumbnail_url || null,
      platform: formData.platform,
      duration_seconds: formData.duration_seconds
        ? Number(formData.duration_seconds)
        : null,
      view_count: formData.view_count
        ? Number(formData.view_count)
        : 0,
      published_at: formData.published_at || new Date().toISOString(),
      tag: formData.tag || 'General',
      is_active: formData.is_active,
    }

    const { error } = editingId
      ? await supabase
          .from('market_reels')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('market_reels').insert(payload)

    if (error) {
      console.error('Insert/Update failed:', error)
      alert(error.message)
      return
    }

    closeForm()
    fetchReels()
  }

  /* ================= EDIT ================= */

  const handleEdit = (reel: MarketReel) => {
    setFormData({
      title: reel.title,
      reel_url: reel.reel_url,
      thumbnail_url: reel.thumbnail_url ?? '',
      platform: reel.platform,
      duration_seconds: reel.duration_seconds?.toString() ?? '',
      view_count: reel.view_count.toString(),
      published_at: reel.published_at.slice(0, 16),
      tag: reel.tag,
      is_active: reel.is_active,
    })

    setEditingId(reel.id)
    setShowForm(true)
  }

  /* ================= DELETE ================= */

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reel?')) return

    const { error } = await supabase
      .from('market_reels')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete failed:', error)
      alert(error.message)
      return
    }

    fetchReels()
  }

  /* ================= HELPERS ================= */

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      title: '',
      reel_url: '',
      thumbnail_url: '',
      platform: 'instagram',
      duration_seconds: '',
      view_count: '',
      published_at: '',
      tag: 'General',
      is_active: true,
    })
  }

  /* ================= UI ================= */

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 h-full overflow-y-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Market Pulse</h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage reels & short market insights
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-5 py-2.5 rounded-lg shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Reel
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? 'Edit Reel' : 'New Reel'}
              </h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                <X />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-5"
            >
              <input
                placeholder="Title"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />

              <input
                placeholder="Reel URL"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                value={formData.reel_url}
                onChange={(e) =>
                  setFormData({ ...formData, reel_url: e.target.value })
                }
                required
              />

              <input
                placeholder="Thumbnail URL"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                value={formData.thumbnail_url}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thumbnail_url: e.target.value,
                  })
                }
              />

              <div className="grid grid-cols-2 gap-4">
                <select
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-900"
                  value={formData.platform}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      platform: e.target.value as any,
                    })
                  }
                >
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="x">X</option>
                </select>

                <input
                  placeholder="Tag (e.g. BOJ, FED)"
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                  value={formData.tag}
                  onChange={(e) =>
                    setFormData({ ...formData, tag: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Duration (seconds)"
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                  value={formData.duration_seconds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_seconds: e.target.value,
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="View Count (Optional)"
                  className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
                  value={formData.view_count}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      view_count: e.target.value,
                    })
                  }
                />
              </div>

              <input
                type="datetime-local"
                className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-slate-700"
                value={formData.published_at}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    published_at: e.target.value,
                  })
                }
              />

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors text-white py-3 rounded-xl font-semibold shadow-sm"
                >
                  {editingId ? 'Update Reel' : 'Create Reel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-5">
        {reels.map((r) => (
          <div
            key={r.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-4 hover:shadow-md transition-shadow"
          >
            <div>
              <h3 className="font-bold text-xl text-slate-900 mb-1">{r.title}</h3>
              <p className="text-sm text-slate-500 max-w-2xl">{r.description}</p>

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <Tag size={16} className="text-slate-400" /> {r.tag}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={16} className="text-slate-400" /> {r.duration_seconds ?? '—'}s
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye size={16} className="text-slate-400" /> {r.view_count}
                </span>
              </div>

              <a
                href={r.reel_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium underline mt-4 transition-colors"
              >
                <Link size={16} /> View Reel
              </a>
            </div>

            <div className="flex gap-2 shrink-0 self-start">
              <button
                onClick={() => handleEdit(r)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(r.id)}
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

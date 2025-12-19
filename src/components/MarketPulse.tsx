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
    <div className="p-4 sm:p-6 lg:p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Market Pulse</h1>
          <p className="text-gray-600">
            Manage reels & short market insights
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-lg shadow"
        >
          <Plus className="w-5 h-5" />
          Add Reel
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-xl font-bold">
                {editingId ? 'Edit Reel' : 'New Reel'}
              </h2>
              <button onClick={closeForm}>
                <X />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4"
            >
              <input
                placeholder="Title"
                className="w-full border p-3 rounded-lg"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />

              <input
                placeholder="Reel URL"
                className="w-full border p-3 rounded-lg"
                value={formData.reel_url}
                onChange={(e) =>
                  setFormData({ ...formData, reel_url: e.target.value })
                }
                required
              />

              <input
                placeholder="Thumbnail URL"
                className="w-full border p-3 rounded-lg"
                value={formData.thumbnail_url}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thumbnail_url: e.target.value,
                  })
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  className="border p-3 rounded-lg"
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
                  className="border p-3 rounded-lg"
                  value={formData.tag}
                  onChange={(e) =>
                    setFormData({ ...formData, tag: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Duration (seconds)"
                  className="border p-3 rounded-lg"
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
                  className="border p-3 rounded-lg"
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
                className="w-full border p-3 rounded-lg"
                value={formData.published_at}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    published_at: e.target.value,
                  })
                }
              />

              <button
                type="submit"
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium"
              >
                {editingId ? 'Update Reel' : 'Create Reel'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="grid gap-4">
        {reels.map((r) => (
          <div
            key={r.id}
            className="bg-white p-5 rounded-xl shadow flex justify-between gap-4"
          >
            <div>
              <h3 className="font-bold text-lg">{r.title}</h3>
              <p className="text-sm text-gray-600">{r.description}</p>

              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Tag size={14} /> {r.tag}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} /> {r.duration_seconds ?? '—'}s
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={14} /> {r.view_count}
                </span>
              </div>

              <a
                href={r.reel_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-green-600 underline mt-2"
              >
                <Link size={14} /> View Reel
              </a>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(r)}
                className="p-2 text-green-600"
              >
                <Edit2 />
              </button>
              <button
                onClick={() => handleDelete(r.id)}
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

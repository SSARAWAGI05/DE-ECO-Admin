import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X, Download, FileText, UploadCloud } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useGoogleLogin } from '@react-oauth/google'

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
  is_active: boolean
}


/* ================= COMPONENT ================= */

export default function ClassNotes() {
  const [notes, setNotes] = useState<ClassNote[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

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
      .select('id, first_name, last_name, email, is_active')
      .order('first_name')

    if (error) {
      console.error('Failed to fetch users:', error)
      return
    }

    setUsers(data ?? [])
  }

  /* ================= SUBMIT / GOOGLE DRIVE ================= */

  const saveToSupabase = async (fileUrl: string) => {
    const payload = {
      class_id: formData.class_id || null, // ✅ OPTIONAL
      user_id: formData.user_id,            // ✅ REQUIRED
      title: formData.title,
      file_url: fileUrl,
    }

    const { error } = editingId
      ? await supabase
          .from('class_notes')
          .update(payload)
          .eq('id', editingId)
      : await supabase.from('class_notes').insert(payload)

    setIsUploading(false)

    if (error) {
      console.error('Save failed:', error)
      alert(error.message)
      return
    }

    closeForm()
    fetchNotes()
  }

  const loginAndUploadToDrive = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        if (!selectedFile) return

        // 1. Create the file metadata in Google Drive
        const metadataRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: selectedFile.name,
            mimeType: selectedFile.type,
          })
        });
        
        if (!metadataRes.ok) {
           const errTxt = await metadataRes.text();
           throw new Error('Failed to create file metadata: ' + errTxt);
        }
        
        const metadata = await metadataRes.json();
        const fileId = metadata.id;

        // 2. Upload the actual file content to the created file ID
        const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,webViewLink`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            'Content-Type': selectedFile.type,
          },
          body: selectedFile,
        });

        if (!uploadRes.ok) {
           throw new Error('Failed to upload file content');
        }

        const data = await uploadRes.json()

        if (!data.id) {
          throw new Error('Failed to get Drive file ID')
        }

        // 3. Make the file public (Anyone with the link can view)
        const permRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${data.id}/permissions`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'reader', type: 'anyone' }),
          }
        )

        // 4. Save link to Supabase
        await saveToSupabase(data.webViewLink)

      } catch (err: any) {
        console.error('Drive upload failed', err)
        alert('Failed to upload to Google Drive: ' + (err.message || 'Unknown error'))
        setIsUploading(false)
      }
    },
    onError: () => {
      alert('Google Login Failed')
      setIsUploading(false)
    },
    scope: 'https://www.googleapis.com/auth/drive.file',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.user_id || !formData.title) {
      alert('User and Title are required')
      return
    }

    if (selectedFile) {
      setIsUploading(true)
      loginAndUploadToDrive()
    } else {
      if (!formData.file_url) {
        alert('Please select a file or provide a URL')
        return
      }
      setIsUploading(true)
      saveToSupabase(formData.file_url)
    }
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
    if (!confirm('Are you sure you want to delete this note?')) return
    const { error } = await supabase.from('class_notes').delete().eq('id', id)

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
    setSelectedFile(null)
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
    <div className="p-6 lg:p-10 bg-[#fbfbfd] min-h-full font-sans">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-4 border-b border-slate-200 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-1">Class Notes</h1>
          <p className="text-slate-500 font-medium">Upload and manage class study materials</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 transition-colors text-white px-5 py-2.5 rounded-lg font-semibold w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Upload Note
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {editingId ? 'Edit Notes' : 'Upload Notes'}
              </h2>
              <button onClick={closeForm} disabled={isUploading} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* USER (REQUIRED) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Student</label>
                <select
                  className="w-full border border-slate-300 p-3.5 rounded-lg text-base focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 transition-shadow bg-white"
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

              {/* TITLE */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  placeholder="e.g. Chapter 1 Notes"
                  className="w-full border border-slate-300 p-3.5 rounded-lg text-base focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 transition-shadow placeholder:text-slate-400"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              {/* UPLOAD FILE TO DRIVE */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg transition-colors hover:bg-slate-100">
                <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <UploadCloud size={20} className="text-slate-600" />
                  Upload PDF to Google Drive
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  className="w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-white file:border file:border-slate-200 file:text-slate-700 hover:file:bg-slate-50 transition-colors cursor-pointer"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-slate-500 font-medium mt-3">
                  If you select a file, it will automatically upload to your Google Drive and attach the link.
                </p>
              </div>

              <div className="flex items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  OR PROVIDE EXISTING LINK
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* MANUAL URL */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Drive URL</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  className="w-full border border-slate-300 p-3.5 rounded-lg text-base focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 transition-shadow placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                  value={formData.file_url}
                  onChange={(e) =>
                    setFormData({ ...formData, file_url: e.target.value })
                  }
                  disabled={!!selectedFile}
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className={`w-full py-4 rounded-lg font-bold text-base transition-colors ${
                  isUploading 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isUploading 
                  ? 'Processing...' 
                  : selectedFile 
                    ? 'Upload to Drive & Save' 
                    : editingId 
                      ? 'Update Note' 
                      : 'Save Note'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-shadow p-6 flex flex-col"
          >
            <div className="flex gap-4 flex-1">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 flex-shrink-0 h-fit">
                <FileText className="w-6 h-6 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-slate-900 mb-1.5 truncate" title={note.title}>{note.title}</h3>
                
                <div className="space-y-1 mb-4">
                  <p className="text-sm font-medium text-slate-500 truncate">
                    <span className="text-slate-400 mr-1">Class:</span> {getClassTitle(note.class_id)}
                  </p>
                  <p className="text-sm font-medium text-slate-500 truncate">
                    <span className="text-slate-400 mr-1">Student:</span> {getUserName(note.user_id)}
                  </p>
                </div>

                <a
                  href={note.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5 font-bold transition-colors"
                >
                  <Download size={16} /> Open Note
                </a>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={() => handleEdit(note)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(note.id)}
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

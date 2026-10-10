import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Plus, Edit2, Trash2, X, FileText, UploadCloud,
  Mail, Search, ExternalLink, Loader2
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { sendNotesEmail } from '../lib/emailService'

/* ================= TYPES ================= */

interface ClassNote {
  id: string
  class_id: string | null
  user_id: string
  uploaded_by?: string | null
  title: string
  file_url: string
  created_at?: string
  upload_date?: string
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
  is_active?: boolean | null
}


/* ================= COMPONENT ================= */

export default function ClassNotes() {
  const [notes, setNotes] = useState<ClassNote[]>([])
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('all')

  const [formData, setFormData] = useState({
    class_id: '',     // optional
    user_id: '',      // required
    title: '',        // required
    file_url: '',     // required
    send_email: true, // toggle to send email
  })

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setSelectedFile(null)
    setFormData({
      class_id: '',
      user_id: '',
      title: '',
      file_url: '',
      send_email: true,
    })
  }

  const handleOpenNew = () => {
    closeForm()
    setShowForm(true)
  }

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      await Promise.all([fetchNotes(), fetchClasses(), fetchUsers()])
      setIsLoading(false)
    }
    loadData()
  }, [])

  /* ================= FETCH NOTES (WITH RESILIENT FALLBACKS) ================= */

  const fetchNotes = async () => {
    try {
      // 1. Try ordering by created_at
      let { data, error } = await supabase
        .from('class_notes')
        .select('*')
        .order('created_at', { ascending: false })

      // 2. Fallback to upload_date if created_at does not exist
      if (error) {
        const res2 = await supabase
          .from('class_notes')
          .select('*')
          .order('upload_date', { ascending: false })

        if (!res2.error) {
          data = res2.data
          error = null
        } else {
          // 3. Fallback to unordered query
          const res3 = await supabase.from('class_notes').select('*')
          data = res3.data
          error = res3.error
        }
      }

      if (error) {
        console.warn('Note: fetchNotes error or table empty:', error.message)
      }

      setNotes(data ?? [])
    } catch (err) {
      console.error('Failed to fetch class notes:', err)
      setNotes([])
    }
  }

  /* ================= FETCH CLASSES ================= */

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('live_classes')
        .select('id, title')
        .order('scheduled_datetime', { ascending: false })

      if (error) {
        const fallback = await supabase
          .from('live_classes')
          .select('id, title')
        setClasses(fallback.data ?? [])
      } else {
        setClasses(data ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err)
      setClasses([])
    }
  }

  /* ================= FETCH USERS ================= */

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, is_active')
        .order('first_name', { ascending: true })

      if (!error && data) {
        setUsers(data)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setUsers([])
    }
  }

  /* ================= SAVE TO SUPABASE ================= */

  const saveToSupabase = async (fileUrl: string) => {
    const payload = {
      class_id: formData.class_id || null,
      user_id: formData.user_id,
      title: formData.title.trim(),
      file_url: fileUrl.trim(),
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
      alert('Save failed: ' + error.message)
      return
    }

    // Trigger email notification if enabled
    if (formData.send_email) {
      const student = users.find(u => u.id === formData.user_id)
      if (student && student.email) {
        const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student'
        try {
          sendNotesEmail(student.email, studentName, formData.title, fileUrl)
        } catch (emailErr) {
          console.warn('Email notification skipped or failed:', emailErr)
        }
      }
    }

    closeForm()
    fetchNotes()
  }

  /* ================= FORM SUBMISSION ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.user_id || !formData.title.trim()) {
      alert('Please select a student and enter a title.')
      return
    }

    setIsUploading(true)

    // Option A: If file is selected, upload directly to Supabase Storage
    if (selectedFile) {
      try {
        const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `notes/${Date.now()}_${cleanName}`

        let bucketName = 'class-notes'
        let uploadRes = await supabase.storage
          .from(bucketName)
          .upload(filePath, selectedFile, { upsert: true })

        if (uploadRes.error) {
          bucketName = 'documents'
          uploadRes = await supabase.storage
            .from(bucketName)
            .upload(filePath, selectedFile, { upsert: true })
        }

        if (uploadRes.error) {
          bucketName = 'exam-submissions'
          uploadRes = await supabase.storage
            .from(bucketName)
            .upload(filePath, selectedFile, { upsert: true })
        }

        if (uploadRes.error) {
          console.warn('Storage bucket upload failed:', uploadRes.error.message)
          alert(
            `Direct storage upload failed (${uploadRes.error.message}).\n\nPlease paste a Google Drive, Dropbox, or document link in the "Document URL" field instead.`
          )
          setIsUploading(false)
          return
        }

        const { data: publicData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath)

        await saveToSupabase(publicData.publicUrl)
        return
      } catch (err: any) {
        console.error('File upload failed:', err)
        alert('File upload failed: ' + (err.message || 'Unknown error'))
        setIsUploading(false)
        return
      }
    }

    // Option B: Direct URL provided (Google Drive, PDF, etc.)
    if (!formData.file_url.trim()) {
      alert('Please select a file to upload or enter a document URL.')
      setIsUploading(false)
      return
    }

    await saveToSupabase(formData.file_url)
  }

  /* ================= EDIT ================= */

  const handleEdit = (note: ClassNote) => {
    setFormData({
      class_id: note.class_id ?? '',
      user_id: note.user_id,
      title: note.title,
      file_url: note.file_url,
      send_email: false,
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

  const getClassTitle = useCallback((classId: string | null) => {
    if (!classId) return 'General Class Note'
    return classes.find((c) => c.id === classId)?.title ?? 'General Class Note'
  }, [classes])

  const getUserName = useCallback((userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return 'Assigned Student'
    const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
    return name || user.email || 'Assigned Student'
  }, [users])

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Student filter
      if (selectedStudentFilter !== 'all' && n.user_id !== selectedStudentFilter) {
        return false
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = n.title.toLowerCase().includes(q)
        const studentName = getUserName(n.user_id).toLowerCase()
        const classTitle = getClassTitle(n.class_id).toLowerCase()
        return titleMatch || studentName.includes(q) || classTitle.includes(q)
      }
      return true
    })
  }, [notes, searchQuery, selectedStudentFilter, getUserName, getClassTitle])

  /* ================= UI RENDER ================= */

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 px-1 sm:px-0">
      {/* 1. TOP HEADER & DIRECT ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
              Study Materials & Resources
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Class Notes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
            Upload study summaries, PDF materials, or Google Drive notes for enrolled students
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm shadow-sm hover:opacity-95 active:scale-[0.98] transition cursor-pointer shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Upload Note</span>
        </button>
      </div>

      {/* 2. SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title, student, or class..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Student Filter */}
        <select
          value={selectedStudentFilter}
          onChange={(e) => setSelectedStudentFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
        >
          <option value="all">All Students ({notes.length})</option>
          {users.map((u) => {
            const studentNotesCount = notes.filter((n) => n.user_id === u.id).length
            if (studentNotesCount === 0) return null
            const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Student'
            return (
              <option key={u.id} value={u.id}>
                {name} ({studentNotesCount})
              </option>
            )
          })}
        </select>
      </div>

      {/* 3. CONTENT AREA */}
      {isLoading ? (
        /* Loading Skeleton */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-neutral-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-slate-100 dark:bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-neutral-800 rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-slate-100 dark:bg-neutral-800 rounded-lg w-full mt-2" />
            </div>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        /* Empty State */
        <div className="p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
            <FileText size={26} strokeWidth={2} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {notes.length === 0 ? 'No Class Notes Uploaded Yet' : 'No Matching Notes Found'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 leading-relaxed">
              {notes.length === 0
                ? 'Upload your first study note, revision guide, or Google Drive link to share study materials directly with your students.'
                : 'Try adjusting your search query or filter to find the study notes you are looking for.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleOpenNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 active:scale-[0.98] transition cursor-pointer shadow-sm"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>{notes.length === 0 ? 'Upload First Note' : 'Upload New Note'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Notes Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const studentName = getUserName(note.user_id)
            const classTitle = getClassTitle(note.class_id)
            const isDriveLink = note.file_url.includes('drive.google.com')

            return (
              <div
                key={note.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/90 dark:border-neutral-800 p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-neutral-700 transition shadow-2xs group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/40 shadow-2xs">
                      <FileText size={18} strokeWidth={2.2} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 truncate max-w-[150px]">
                      {classTitle}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-2" title={note.title}>
                    {note.title}
                  </h3>

                  {/* Student Tag */}
                  <div className="mt-2 text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1.5 truncate">
                    <span className="font-medium text-slate-400 dark:text-neutral-500 text-[11px]">For:</span>
                    <span className="font-bold text-slate-800 dark:text-neutral-200 truncate">{studentName}</span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                  <a
                    href={note.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer"
                  >
                    <span>{isDriveLink ? 'Open Drive' : 'View File'}</span>
                    <ExternalLink size={12} />
                  </a>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(note)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                      title="Edit note"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ================= 4. UPLOAD / EDIT NOTE MODAL ================= */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-neutral-800 flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 dark:border-neutral-800 sticky top-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur z-10">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  {editingId ? 'Edit Study Note' : 'Upload Study Note'}
                </h2>
                <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">
                  Attach PDF or share Google Drive notes with your student
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={isUploading}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
              {/* STUDENT SELECTION (REQUIRED) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
                  Select Student <span className="text-rose-500">*</span>
                </label>
                <select
                  className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {users
                    .filter((u) => u.is_active !== false)
                    .map((u) => {
                      const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Student'
                      return (
                        <option key={u.id} value={u.id}>
                          {name} {u.email ? `(${u.email})` : ''}
                        </option>
                      )
                    })}
                </select>
              </div>

              {/* ASSOCIATED CLASS (OPTIONAL) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
                  Associated Class Session <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                >
                  <option value="">General Class Note (No specific class)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* TITLE (REQUIRED) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
                  Note Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 3: Microeconomics Revision Summary"
                  className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* DOCUMENT / DRIVE LINK INPUT */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-neutral-300 mb-1.5">
                  Google Drive / Document Link <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/... or PDF URL"
                  className="w-full bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 p-2.5 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 disabled:opacity-50"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  disabled={!!selectedFile}
                />
                <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                  Paste any public/shared Google Drive link, OneDrive link, or direct file URL.
                </p>
              </div>

              {/* OPTIONAL DIRECT FILE ATTACHMENT */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <UploadCloud size={14} className="text-indigo-600 dark:text-indigo-400" />
                    Or Upload File from Device
                  </span>
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear File
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf,image/*,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setSelectedFile(file)
                    if (file && !formData.title) {
                      setFormData((prev) => ({
                        ...prev,
                        title: file.name.replace(/\.[^/.]+$/, '')
                      }))
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white dark:file:bg-white dark:file:text-slate-900 hover:file:opacity-90 cursor-pointer"
                />
              </div>

              {/* EMAIL NOTIFICATION TOGGLE */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-800/40 border border-slate-200/80 dark:border-neutral-700/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg ${formData.send_email ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Mail size={14} />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                      Send Email Notification
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      Email student note access link via EmailJS
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.send_email}
                    onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-sm hover:opacity-90 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving Note...</span>
                    </>
                  ) : (
                    <span>{editingId ? 'Update Note' : 'Save & Publish Note'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Send, Edit2, Trash2, X } from "lucide-react";

/* ================= TYPES ================= */

interface ClassOption {
  id: string;
  title: string;
}

interface Announcement {
  id: string;
  class_id: string | null;
  title: string;
  message: string;
  priority: "high" | "medium" | "low";
  target_audience: "all" | "class";
  created_at: string;
}

/* ================= COMPONENT ================= */

const AdminAnnouncements: React.FC = () => {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    classId: "all",
    title: "",
    message: "",
    priority: "medium",
  });

  /* ================= FETCH CLASSES ================= */
  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase
        .from("courses") // or live_classes if that's your class table
        .select("id, title")
        .order("title");

      setClasses(data ?? []);
    };

    fetchClasses();
  }, []);

  /* ================= FETCH ANNOUNCEMENTS ================= */
  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("class_announcements")
      .select("*")
      .order("created_at", { ascending: false });

    setAnnouncements(data ?? []);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isGlobal = form.classId === "all";

    const payload = {
      title: form.title,
      message: form.message,
      priority: form.priority,
      type: "general",
      is_active: true,
      target_audience: isGlobal ? "all" : "class",
      class_id: isGlobal ? null : form.classId,
    };

    const { error } = editingId
      ? await supabase
          .from("class_announcements")
          .update(payload)
          .eq("id", editingId)
      : await supabase
          .from("class_announcements")
          .insert(payload);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    resetForm();
    fetchAnnouncements();
  };

  /* ================= EDIT ================= */
  const handleEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({
      classId: a.class_id ?? "all",
      title: a.title,
      message: a.message,
      priority: a.priority,
    });
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;

    const { error } = await supabase
      .from("class_announcements")
      .delete()
      .eq("id", id);

    if (!error) fetchAnnouncements();
  };

  /* ================= HELPERS ================= */
  const resetForm = () => {
    setEditingId(null);
    setForm({
      classId: "all",
      title: "",
      message: "",
      priority: "medium",
    });
  };

  /* ================= UI ================= */
  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8 bg-[#fbfbfd] min-h-full font-sans">

      {/* FORM */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {editingId ? "Edit Announcement" : "Create Announcement"}
          </h2>
          {editingId && (
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors"><X /></button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* CLASS */}
          <select
            className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900"
            value={form.classId}
            onChange={(e) =>
              setForm({ ...form, classId: e.target.value })
            }
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <input
            className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
            placeholder="Title"
            required
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />

          <textarea
            className="w-full border border-slate-300 rounded-lg px-4 py-3 min-h-[120px] focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
            placeholder="Message"
            required
            value={form.message}
            onChange={(e) =>
              setForm({ ...form, message: e.target.value })
            }
          />

          <select
            className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900"
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value })
            }
          >
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              <Send size={18} />
              {loading
                ? "Saving..."
                : editingId
                ? "Update Announcement"
                : "Post Announcement"}
            </button>
          </div>
        </form>
      </div>

      {/* LIST */}
      <div className="space-y-5">
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">All Announcements</h3>

        {announcements.length === 0 && (
          <p className="text-slate-500 font-medium bg-white p-6 rounded-2xl border border-slate-200 text-center">No announcements yet.</p>
        )}

        {announcements.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row justify-between gap-4 hover:shadow-sm transition-shadow"
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-bold text-lg text-slate-900">{a.title}</h4>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  a.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                  a.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {a.priority.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap leading-relaxed">{a.message}</p>
              <p className="text-xs font-medium text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                {a.class_id ? "Class-specific" : "All classes"}
              </p>
            </div>

            <div className="flex gap-2 shrink-0 self-start">
              <button
                onClick={() => handleEdit(a)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAnnouncements;

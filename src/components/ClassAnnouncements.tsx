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
    <div className="max-w-5xl mx-auto p-6 space-y-10">

      {/* FORM */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {editingId ? "Edit Announcement" : "Create Announcement"}
          </h2>
          {editingId && (
            <button onClick={resetForm}><X /></button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* CLASS */}
          <select
            className="w-full border rounded-lg px-3 py-2"
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
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Title"
            required
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />

          <textarea
            className="w-full border rounded-lg px-3 py-2 min-h-[120px]"
            placeholder="Message"
            required
            value={form.message}
            onChange={(e) =>
              setForm({ ...form, message: e.target.value })
            }
          />

          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value })
            }
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl"
          >
            <Send size={18} />
            {loading
              ? "Saving..."
              : editingId
              ? "Update Announcement"
              : "Post Announcement"}
          </button>
        </form>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">All Announcements</h3>

        {announcements.length === 0 && (
          <p className="text-gray-500">No announcements yet.</p>
        )}

        {announcements.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-xl shadow p-5 flex justify-between"
          >
            <div>
              <h4 className="font-bold">{a.title}</h4>
              <p className="text-sm text-gray-600">{a.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                Priority: {a.priority.toUpperCase()} •{" "}
                {a.class_id ? "Class-specific" : "All classes"}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(a)}
                className="text-blue-600"
              >
                <Edit2 />
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-red-600"
              >
                <Trash2 />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAnnouncements;

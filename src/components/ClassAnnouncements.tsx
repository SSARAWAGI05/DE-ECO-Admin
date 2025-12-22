import React, { useEffect, useState } from "react";
import { supabase } from '../lib/supabaseClient'
import { Send } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

const AdminAnnouncements: React.FC = () => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    userId: "all",
    title: "",
    message: "",
    priority: "medium",
  });

  /* ================= FETCH USERS ================= */
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .order("first_name");

      if (!error && data) {
        setUsers(
          data.map((u) => ({
            id: u.id,
            name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
            email: u.email,
          }))
        );
      }
    };

    fetchUsers();
  }, []);

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isEveryone = form.userId === "all";

    const payload: any = {
      title: form.title,
      message: form.message,
      priority: form.priority,
      type: "general",
      is_active: true,
      target_audience: isEveryone ? "all" : "specific",
    };

    if (!isEveryone) {
      payload.user_id = form.userId;
    }

    const { error } = await supabase
      .from("class_announcements")
      .insert(payload);

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("Announcement sent successfully!");
      setForm({
        userId: "all",
        title: "",
        message: "",
        priority: "medium",
      });
    }
  };

  /* ================= UI ================= */
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Create Announcement</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* USER DROPDOWN */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Send To
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.userId}
            onChange={(e) =>
              setForm({ ...form, userId: e.target.value })
            }
          >
            <option value="all">Everyone</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || "Unnamed User"} ({u.email})
              </option>
            ))}
          </select>
        </div>

        {/* TITLE */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2"
            required
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />
        </div>

        {/* MESSAGE */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Message
          </label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 min-h-[120px]"
            required
            value={form.message}
            onChange={(e) =>
              setForm({ ...form, message: e.target.value })
            }
          />
        </div>

        {/* PRIORITY */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Priority
          </label>
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
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl hover:opacity-90"
        >
          <Send size={18} />
          {loading ? "Sending..." : "Send Announcement"}
        </button>
      </form>
    </div>
  );
};

export default AdminAnnouncements;

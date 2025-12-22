import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Mail,
  Phone,
  User,
  Calendar,
  MessageSquare,
  Trash2,
} from "lucide-react";

/* ================= TYPES ================= */
interface ContactMessage {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: "new" | "in_progress" | "replied" | "closed";
  admin_notes: string | null;
  created_at: string;
}

/* ================= COMPONENT ================= */
const AdminContactMessages: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMessages(data);
    }

    setLoading(false);
  };

  const updateStatus = async (
    id: string,
    status: ContactMessage["status"]
  ) => {
    setUpdatingId(id);

    await supabase
      .from("contact_messages")
      .update({ status })
      .eq("id", id);

    setUpdatingId(null);
    fetchMessages();
  };

  const updateAdminNotes = async (id: string, notes: string) => {
    await supabase
      .from("contact_messages")
      .update({ admin_notes: notes })
      .eq("id", id);
  };

  const deleteMessage = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this message? This action cannot be undone."
    );

    if (!confirmDelete) return;

    setDeletingId(id);

    await supabase
      .from("contact_messages")
      .delete()
      .eq("id", id);

    setDeletingId(null);
    fetchMessages();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading contact messages…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📩 Contact Us Messages</h1>

      {messages.length === 0 && (
        <p className="text-gray-500">No messages yet.</p>
      )}

      <div className="space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="bg-white rounded-xl shadow-md border p-6 space-y-4"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{msg.subject}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                  {msg.user_id && (
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      Logged-in User
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <select
                  value={msg.status}
                  disabled={updatingId === msg.id}
                  onChange={(e) =>
                    updateStatus(
                      msg.id,
                      e.target.value as ContactMessage["status"]
                    )
                  }
                  className="border rounded-md px-3 py-2 text-sm"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>

                <button
                  onClick={() => deleteMessage(msg.id)}
                  disabled={deletingId === msg.id}
                  className="p-2 rounded-md border text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title="Delete message"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User size={16} /> {msg.name}
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} /> {msg.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} /> {msg.phone}
              </div>
            </div>

            {/* Message */}
            <div className="bg-gray-50 p-4 rounded-lg border text-gray-700">
              <div className="flex items-center gap-2 mb-2 font-medium">
                <MessageSquare size={16} /> Message
              </div>
              <p className="whitespace-pre-line">{msg.message}</p>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="text-sm font-medium block mb-1">
                Admin Notes
              </label>
              <textarea
                defaultValue={msg.admin_notes ?? ""}
                onBlur={(e) =>
                  updateAdminNotes(msg.id, e.target.value)
                }
                className="w-full border rounded-lg p-3 text-sm min-h-[80px]"
                placeholder="Add internal notes here..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminContactMessages;

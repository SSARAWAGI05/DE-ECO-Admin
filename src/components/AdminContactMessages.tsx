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
    <div className="p-4 sm:p-6 lg:p-10 overflow-x-hidden w-full ">
      <div className="mb-8 pb-4 border-b border-slate-200">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-1">Contact Us Messages</h1>
        <p className="text-slate-500 font-medium">Manage and respond to user inquiries</p>
      </div>

      {messages.length === 0 && (
        <p className="text-slate-500 font-medium bg-white p-6 rounded-2xl border border-slate-200 text-center">No messages yet.</p>
      )}

      <div className="space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{msg.subject}</h2>
                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium mt-1.5">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={16} className="text-slate-400" />
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                  {msg.user_id && (
                    <span className="flex items-center gap-1.5">
                      <User size={16} className="text-slate-400" />
                      Logged-in User
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <select
                  value={msg.status}
                  disabled={updatingId === msg.id}
                  onChange={(e) =>
                    updateStatus(
                      msg.id,
                      e.target.value as ContactMessage["status"]
                    )
                  }
                  className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 font-medium disabled:opacity-70"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>

                <button
                  onClick={() => deleteMessage(msg.id)}
                  disabled={deletingId === msg.id}
                  className="p-2.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                  title="Delete message"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-medium text-slate-700">
              <div className="flex items-center gap-2.5">
                <User size={18} className="text-slate-400" /> {msg.name}
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={18} className="text-slate-400" /> {msg.email}
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={18} className="text-slate-400" /> {msg.phone}
              </div>
            </div>

            {/* Message */}
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 text-slate-700 leading-relaxed shadow-inner">
              <div className="flex items-center gap-2 mb-3 font-semibold text-slate-900">
                <MessageSquare size={18} className="text-slate-600" /> Message
              </div>
              <p className="whitespace-pre-line">{msg.message}</p>
            </div>

            {/* Admin Notes */}
            <div className="pt-2">
              <label className="text-sm font-semibold text-slate-700 block mb-2">
                Admin Notes
              </label>
              <textarea
                defaultValue={msg.admin_notes ?? ""}
                onBlur={(e) =>
                  updateAdminNotes(msg.id, e.target.value)
                }
                className="w-full border border-slate-300 rounded-lg p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-slate-900 outline-none transition-shadow text-slate-900 placeholder:text-slate-400"
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

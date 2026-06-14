import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Receipt, Printer, ArrowLeft, Calendar } from 'lucide-react'

/* ================= TYPES & CONSTANTS ================= */

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  hourly_rate: number
  billing_currency: string
  is_active: boolean
}

interface LiveClass {
  id: string
  user_id: string
  title: string
  duration_minutes: number
  scheduled_datetime: string
  status: string
}

const CURRENCIES: Record<string, string> = {
  INR: '₹', USD: '$', CHF: '₣', EUR: '€', GBP: '£'
}

/* ================= HELPERS ================= */

const getTodayStart = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const getWeekStart = (offsetWeeks: number = 0) => {
  const d = getTodayStart()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
  d.setDate(diff + (offsetWeeks * 7))
  return d
}

/* ================= COMPONENT ================= */

export default function Invoices() {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [classes, setClasses] = useState<LiveClass[]>([])
  const [loading, setLoading] = useState(true)

  // Date Range
  const [startDate, setStartDate] = useState(() => {
    const d = getWeekStart(0)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  
  const [endDate, setEndDate] = useState(() => {
    const d = getWeekStart(1)
    d.setDate(d.getDate() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  const [viewInvoiceFor, setViewInvoiceFor] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, hourly_rate, billing_currency, is_active')

    const profileMap: Record<string, Profile> = {}
    if (profilesData) {
      profilesData.forEach(p => {
        profileMap[p.id] = p
      })
    }
    setProfiles(profileMap)

    const { data: classesData } = await supabase
      .from('live_classes')
      .select('id, user_id, title, duration_minutes, scheduled_datetime, status')
      .neq('status', 'cancelled')
      .order('scheduled_datetime', { ascending: true })

    if (classesData) {
      setClasses(classesData)
    }

    setLoading(false)
  }

  // Group classes by student for the selected date range
  const studentSummaries = useMemo(() => {
    if (!startDate || !endDate) return []

    const [sy, sm, sd] = startDate.split('-').map(Number)
    const [ey, em, ed] = endDate.split('-').map(Number)
    
    const startObj = new Date(sy, sm - 1, sd)
    const endObj = new Date(ey, em - 1, ed, 23, 59, 59, 999)

    const grouped: Record<string, { profile: Profile, classes: LiveClass[], totalMins: number, totalAmount: number }> = {}

    classes.forEach(c => {
      const d = new Date(c.scheduled_datetime)
      // Only include classes that have actually happened (past)
      if (d >= startObj && d <= endObj && d < new Date()) {
        const p = profiles[c.user_id]
        if (!p) return

        if (!grouped[c.user_id]) {
          grouped[c.user_id] = { profile: p, classes: [], totalMins: 0, totalAmount: 0 }
        }

        grouped[c.user_id].classes.push(c)
        grouped[c.user_id].totalMins += (c.duration_minutes || 0)
      }
    })

    Object.values(grouped).forEach(g => {
      g.totalAmount = (g.totalMins / 60) * (g.profile.hourly_rate || 0)
      g.classes.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime())
    })

    return Object.values(grouped).sort((a, b) => {
      const nameA = `${a.profile.first_name || ''} ${a.profile.last_name || ''}`
      const nameB = `${b.profile.first_name || ''} ${b.profile.last_name || ''}`
      return nameA.localeCompare(nameB)
    })
  }, [classes, profiles, startDate, endDate])

  const handlePrint = () => {
    const summary = studentSummaries.find(s => s.profile.id === viewInvoiceFor)
    if (summary) {
      const originalTitle = document.title
      const firstName = summary.profile.first_name?.toUpperCase().trim() || ''
      const lastName = summary.profile.last_name?.toUpperCase().trim() || ''
      const fullName = `${firstName}_${lastName}`.replace(/_+/g, '_').replace(/^_|_$/g, '')
      
      document.title = fullName ? `DEECO_${fullName}` : 'DEECO_INVOICE'
      window.print()
      document.title = originalTitle
    } else {
      window.print()
    }
  }

  // --- PRINTABLE INVOICE VIEW ---
  if (viewInvoiceFor) {
    const summary = studentSummaries.find(s => s.profile.id === viewInvoiceFor)
    if (!summary) {
      setViewInvoiceFor(null)
      return null
    }

    const { profile, classes: studentClasses, totalMins, totalAmount } = summary
    const currencySym = CURRENCIES[profile.billing_currency] || profile.billing_currency || ''

    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-8 flex flex-col items-center">
        {/* Screen-only controls */}
        <div className="w-full max-w-[210mm] flex flex-col sm:flex-row justify-between gap-4 print:hidden z-50 mb-6">
          <button 
            onClick={() => setViewInvoiceFor(null)}
            className="flex items-center justify-center sm:justify-start gap-2 bg-white px-4 py-3 sm:py-2 rounded-lg shadow-md hover:bg-slate-50 font-bold text-slate-700 transition-colors w-full sm:w-auto"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
          
          <button 
            onClick={handlePrint}
            className="flex items-center justify-center sm:justify-start gap-2 bg-indigo-600 text-white px-6 py-3 sm:py-2 rounded-lg shadow-md hover:bg-indigo-700 font-bold transition-colors w-full sm:w-auto"
          >
            <Printer size={20} /> Print / Save PDF
          </button>
        </div>

        {/* The Printable A4 Invoice Document */}
        <div className="w-full max-w-[100vw] overflow-x-auto print:overflow-visible pb-12">
          <div className="bg-white w-[210mm] min-w-[210mm] min-h-[297mm] shadow-2xl p-12 sm:p-16 text-slate-800 mx-auto print:shadow-none print:m-0 flex flex-col font-sans relative overflow-hidden">
          
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] z-0 print:opacity-[0.1]">
            <img src="/logo.png" alt="" className="w-[80%] max-w-lg object-contain grayscale" />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex flex-col gap-4">
                <img src="/logo.png" alt="DEECO Logo" className="w-16 h-16 object-contain" />
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">DE-ECO Education</h1>
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                    6/1A Moira Street<br/>
                    Mangaldeep Building<br/>
                    Kolkata - 700017<br/>
                    +91 9903996663<br/>
                    www.deecobyrishika.com
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <h2 className="text-4xl font-light text-slate-400 uppercase tracking-widest mb-6">Invoice</h2>
                <table className="ml-auto text-sm">
                  <tbody>
                    <tr>
                      <td className="pr-4 py-1 text-slate-500 font-medium text-right">Invoice No:</td>
                      <td className="font-semibold text-slate-900 text-right">#INV-{new Date().getTime().toString().slice(-6)}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-1 text-slate-500 font-medium text-right">Date:</td>
                      <td className="font-semibold text-slate-900 text-right">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-1 text-slate-500 font-medium text-right">Period:</td>
                      <td className="font-semibold text-slate-900 text-right">{new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bill To:</h3>
              <p className="font-bold text-lg text-slate-900">{profile.first_name} {profile.last_name}</p>
              <p className="text-slate-600 text-sm mt-1">{profile.email}</p>
            </div>

            {/* Table */}
            <table className="w-full text-left mb-6 border-collapse">
              <thead>
                <tr className="border-y-2 border-slate-200 text-slate-900">
                  <th className="py-3 font-bold uppercase tracking-wider text-xs text-slate-500">Date</th>
                  <th className="py-3 font-bold uppercase tracking-wider text-xs text-slate-500">Description</th>
                  <th className="py-3 font-bold uppercase tracking-wider text-xs text-slate-500 text-right">Duration</th>
                  <th className="py-3 font-bold uppercase tracking-wider text-xs text-slate-500 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {studentClasses.map((c) => {
                  const date = new Date(c.scheduled_datetime)
                  const hours = (c.duration_minutes || 0) / 60
                  const amt = hours * (profile.hourly_rate || 0)
                  return (
                    <tr key={c.id} className="border-b border-slate-100 text-sm">
                      <td className="py-4 text-slate-600">
                        {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-4 font-medium text-slate-800">{c.title || 'Live Class'}</td>
                      <td className="py-4 text-slate-600 text-right">{c.duration_minutes} mins</td>
                      <td className="py-4 font-medium text-slate-900 text-right">{currencySym}{amt.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="flex justify-end mb-16">
              <div className="w-72">
                <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                  <span className="text-slate-600">Total Hours</span>
                  <span className="font-medium text-slate-900">{(totalMins / 60).toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                  <span className="text-slate-600">Hourly Rate</span>
                  <span className="font-medium text-slate-900">{currencySym}{(profile.hourly_rate || 0).toFixed(2)}/hr</span>
                </div>
                <div className="flex justify-between py-4 mt-2">
                  <span className="font-bold text-lg text-slate-900">Total Due</span>
                  <span className="font-bold text-xl text-slate-900">{currencySym}{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-slate-200 pt-8 pb-8 text-slate-500 text-xs">
              <p className="font-bold text-slate-800 uppercase tracking-wider mb-2">Payment Terms</p>
              <p>Due on receipt. Please make all payments payable to DE-ECO Education. Thank you for your business!</p>
            </div>
          </div>
        </div>
      </div>
        
        {/* Print Styles injection */}
        <style dangerouslySetInnerHTML={{__html: `
          @page {
            size: auto;
            margin: 0mm;
          }
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:hidden {
              display: none !important;
            }
            .min-h-screen {
              background: white !important;
            }
            .bg-white.w-full.max-w-\\[210mm\\] {
              visibility: visible;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 48px !important;
              box-shadow: none;
            }
            .bg-white.w-full.max-w-\\[210mm\\] * {
              visibility: visible;
            }
          }
        `}} />
      </div>
    )
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="p-4 sm:p-6 lg:p-10 w-full flex flex-col min-h-screen overflow-x-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-2">Invoices</h1>
          <p className="text-slate-500 font-medium text-lg">Generate itemized invoices for any date range instantly.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Start Date</label>
              <input 
                type="date"
                className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium bg-slate-50"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">End Date</label>
              <input 
                type="date"
                className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-indigo-600 focus:ring-0 outline-none transition-colors font-medium bg-slate-50"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <button 
              onClick={() => {
                const d = getWeekStart(0)
                setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
                const e = getWeekStart(1)
                e.setDate(e.getDate() - 1)
                setEndDate(`${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`)
              }}
              className="flex-1 md:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              This Week
            </button>
            <button 
              onClick={() => {
                const d = getWeekStart(-1)
                setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
                const e = getWeekStart(0)
                e.setDate(e.getDate() - 1)
                setEndDate(`${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`)
              }}
              className="flex-1 md:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              Last Week
            </button>
            <button 
              onClick={() => {
                const d = new Date()
                setEndDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
                d.setDate(1)
                setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
              }}
              className="flex-1 md:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              This Month
            </button>
            <button 
              onClick={() => {
                const d = new Date()
                d.setDate(0) // Last day of previous month
                setEndDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
                d.setDate(1) // First day of previous month
                setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
              }}
              className="flex-1 md:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              Last Month
            </button>
          </div>
        </div>

        {/* Formatted Date Range Display */}
        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 text-sm font-bold flex items-center gap-2">
          <Calendar size={16} />
          <span>
            Viewing classes scheduled from{' '}
            <span className="text-indigo-900">{startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '...'}</span>
            {' '}to{' '}
            <span className="text-indigo-900">{endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '...'}</span>
          </span>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full" />
        </div>
      ) : studentSummaries.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
          <Receipt className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">No Classes Found</h3>
          <p className="text-slate-500">There are no completed classes in the selected date range.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studentSummaries.map(summary => {
            const currencySym = CURRENCIES[summary.profile.billing_currency] || summary.profile.billing_currency || ''
            return (
              <div key={summary.profile.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 truncate">
                    {summary.profile.first_name} {summary.profile.last_name}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 truncate">{summary.profile.email}</p>
                </div>
                <div className="p-6 bg-slate-50 flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Classes</span>
                    <span className="font-bold text-slate-900">{summary.classes.length} completed</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Time</span>
                    <span className="font-bold text-slate-900">{(summary.totalMins / 60).toFixed(2)} hrs</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-auto">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Amount Due</span>
                    <span className="text-xl font-black text-indigo-600">{currencySym}{summary.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-100">
                  <button
                    onClick={() => setViewInvoiceFor(summary.profile.id)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <Printer size={18} />
                    View & Print Invoice
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

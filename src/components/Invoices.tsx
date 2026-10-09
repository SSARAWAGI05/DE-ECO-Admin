import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Calendar, Search, Filter, ArrowUpDown, Download, ArrowLeft, Printer, AlertCircle, Share2, Receipt } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

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

interface CourseEnrollment {
  user_id: string
  custom_hourly_rate: number | null
  courses: {
    title: string
  }
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
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([])
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

    const { data: courseEnrollData } = await supabase
      .from('course_enrollments')
      .select('user_id, custom_hourly_rate, courses(title)')

    if (courseEnrollData) {
      setCourseEnrollments(courseEnrollData)
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
      // Include all classes in the date range
      if (d >= startObj && d <= endObj) {
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
      let amount = 0
      const userEnrollments = courseEnrollments.filter(e => e.user_id === g.profile.id)
      
      g.classes.forEach(c => {
        const match = userEnrollments.find(e => e.courses?.title === c.title)
        const rate = match && match.custom_hourly_rate != null ? match.custom_hourly_rate : (g.profile.hourly_rate || 0)
        amount += (c.duration_minutes / 60) * rate
      })
      
      g.totalAmount = amount
      g.classes.sort((a, b) => new Date(a.scheduled_datetime).getTime() - new Date(b.scheduled_datetime).getTime())
    })

    return Object.values(grouped).sort((a, b) => {
      const nameA = `${a.profile.first_name || ''} ${a.profile.last_name || ''}`
      const nameB = `${b.profile.first_name || ''} ${b.profile.last_name || ''}`
      return nameA.localeCompare(nameB)
    })
  }, [classes, profiles, startDate, endDate])

  const generatePdfBlob = async () => {
    const element = document.getElementById('invoice-pdf-content')
    if (!element) return null
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const margin = 12 // 12mm margin
      const printWidth = pdfWidth - margin * 2
      const printHeight = pdfHeight - margin * 2
      const totalImgHeightInMM = (canvas.height * printWidth) / canvas.width
      
      let position = 0
      
      pdf.addImage(imgData, 'PNG', margin, margin, printWidth, totalImgHeightInMM)
      
      // Mask bottom margin of first page
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F')

      let heightLeft = totalImgHeightInMM - printHeight

      while (heightLeft > 0) {
        position -= printHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, margin + position, printWidth, totalImgHeightInMM)
        
        // Mask top and bottom margins of subsequent pages
        pdf.setFillColor(255, 255, 255)
        pdf.rect(0, 0, pdfWidth, margin, 'F')
        pdf.rect(0, pdfHeight - margin, pdfWidth, margin, 'F')
        
        heightLeft -= printHeight
      }
      return pdf.output('blob')
    } catch (err) {
      console.error('Failed to generate PDF', err)
      return null
    }
  }

  const getPdfFilename = () => {
    const summary = studentSummaries.find(s => s.profile.id === viewInvoiceFor)
    if (summary) {
      const firstName = summary.profile.first_name?.toUpperCase().trim() || ''
      const lastName = summary.profile.last_name?.toUpperCase().trim() || ''
      return `${firstName}_${lastName}`.replace(/_+/g, '_').replace(/^_|_$/g, '') || 'INVOICE'
    }
    return 'INVOICE'
  }

  const handlePrint = async () => {
    const blob = await generatePdfBlob()
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DEECO_${getPdfFilename()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const handleShare = async () => {
    const blob = await generatePdfBlob()
    if (blob) {
      const file = new File([blob], `DEECO_${getPdfFilename()}.pdf`, { type: 'application/pdf' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `DEECO Invoice`,
            text: 'Here is the invoice from DE-ECO Education.'
          })
        } catch (err) {
          console.error('Share failed or was cancelled', err)
        }
      } else {
        alert('File sharing is not supported on this browser. Please use the Save PDF button.')
      }
    } else {
      alert('Failed to generate PDF. Please try again.')
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
      <div className="min-h-screen bg-slate-100 dark:bg-neutral-800 p-4 sm:p-8 flex flex-col items-center">
        {/* Screen-only controls */}
        <div className="w-full max-w-[210mm] flex flex-col sm:flex-row justify-between gap-4 print:hidden z-50 mb-6">
          <button 
            onClick={() => setViewInvoiceFor(null)}
            className="flex items-center justify-center sm:justify-start gap-2 bg-white dark:bg-neutral-900 px-4 py-3 sm:py-2 rounded-lg shadow-md hover:bg-slate-50 dark:hover:bg-neutral-800 dark:hover:bg-slate-200/50 dark:bg-neutral-800/50 font-bold text-slate-700 dark:text-slate-300 transition-colors w-full sm:w-auto"
          >
            <ArrowLeft size={20} /> Back to Dashboard
          </button>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button 
              onClick={handleShare}
              className="flex items-center justify-center sm:justify-start gap-2 bg-blue-600 text-white dark:text-slate-900 px-6 py-3 sm:py-2 rounded-lg shadow-md hover:bg-blue-700 font-bold transition-colors w-full sm:w-auto"
            >
              <Share2 size={20} /> Share
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center justify-center sm:justify-start gap-2 bg-indigo-600 text-white dark:text-slate-900 px-6 py-3 sm:py-2 rounded-lg shadow-md hover:bg-indigo-700 font-bold transition-colors w-full sm:w-auto"
            >
              <Download size={20} /> Save PDF
            </button>
          </div>
        </div>

        {/* The Printable A4 Invoice Document */}
        <div className="w-full max-w-[100vw] overflow-x-auto print:overflow-visible pb-12">
          <div id="invoice-pdf-content" className="bg-white dark:bg-neutral-900 w-[210mm] min-w-[210mm] min-h-[297mm] shadow-2xl p-12 sm:p-16 text-slate-800 dark:text-slate-200 mx-auto print:shadow-none print:m-0 flex flex-col font-sans relative overflow-hidden">
          
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
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">DE-ECO Education</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
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
                      <td className="pr-4 py-1 text-slate-500 dark:text-slate-400 font-medium text-right">Invoice No:</td>
                      <td className="font-semibold text-slate-900 dark:text-slate-50 text-right">#INV-{new Date().getTime().toString().slice(-6)}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-1 text-slate-500 dark:text-slate-400 font-medium text-right">Date:</td>
                      <td className="font-semibold text-slate-900 dark:text-slate-50 text-right">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-1 text-slate-500 dark:text-slate-400 font-medium text-right">Period:</td>
                      <td className="font-semibold text-slate-900 dark:text-slate-50 text-right">{new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bill To:</h3>
              <p className="font-bold text-lg text-slate-900 dark:text-slate-50">{profile.first_name} {profile.last_name}</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{profile.email}</p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full mb-6">
              <table className="w-full text-left border-collapse min-w-[400px]">
                <thead>
                  <tr className="border-y-2 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 text-slate-900 dark:text-slate-50">
                    <th className="py-3 font-bold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">Date</th>
                    <th className="py-3 font-bold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400">Description</th>
                    <th className="py-3 font-bold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400 text-right">Duration</th>
                    <th className="py-3 font-bold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-400 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {studentClasses.map((c) => {
                    const date = new Date(c.scheduled_datetime)
                    const hours = (c.duration_minutes || 0) / 60
                    const userEnrollments = courseEnrollments.filter(e => e.user_id === profile.id)
                    const match = userEnrollments.find(e => e.courses?.title === c.title)
                    const rate = match && match.custom_hourly_rate != null ? match.custom_hourly_rate : (profile.hourly_rate || 0)
                    const amt = hours * rate
                    return (
                      <tr key={c.id} className="border-b border-slate-100 dark:border-neutral-800 dark:border-neutral-700/50 text-sm">
                        <td className="py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-4 font-medium text-slate-800 dark:text-slate-200 min-w-[150px]">
                          {c.title || 'Live Class'}
                        </td>
                        <td className="py-4 text-slate-600 dark:text-slate-400 text-right whitespace-nowrap">{c.duration_minutes} mins</td>
                        <td className="py-4 font-medium text-slate-900 dark:text-slate-50 text-right whitespace-nowrap">{currencySym}{amt.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-16">
              <div className="w-72">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-neutral-800 dark:border-neutral-700/50 text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Total Hours</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{(totalMins / 60).toFixed(2)} hrs</span>
                </div>
                
                {courseEnrollments.filter(e => e.user_id === profile.id).length > 0 ? (
                  courseEnrollments.filter(e => e.user_id === profile.id).map((e, idx) => {
                    const rate = e.custom_hourly_rate != null ? e.custom_hourly_rate : (profile.hourly_rate || 0)
                    return (
                      <div key={idx} className="flex justify-between py-2 border-b border-slate-100 dark:border-neutral-800 dark:border-neutral-700/50 text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Hourly Rate ({e.courses?.title || 'Course'})</span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">{currencySym}{rate.toFixed(2)}/hr</span>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-neutral-800 dark:border-neutral-700/50 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Hourly Rate</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">{currencySym}{(profile.hourly_rate || 0).toFixed(2)}/hr</span>
                  </div>
                )}
                <div className="flex justify-between py-4 mt-2">
                  <span className="font-bold text-lg text-slate-900 dark:text-slate-50">Total Due</span>
                  <span className="font-bold text-xl text-slate-900 dark:text-slate-50">{currencySym}{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-slate-200 dark:border-neutral-800 dark:border-neutral-700 pt-8 pb-8 text-slate-500 dark:text-slate-400 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Payment Terms</p>
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
            .bg-white dark:bg-neutral-900.w-full.max-w-\\[210mm\\] {
              visibility: visible;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 48px !important;
              box-shadow: none;
            }
            .bg-white dark:bg-neutral-900.w-full.max-w-\\[210mm\\] * {
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Invoices</h1>
          <p className="text-slate-500 dark:text-slate-400 font-normal text-sm mt-1">Generate itemized invoices for any date range instantly.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-8 shadow-xs">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Start Date</label>
              <input 
                type="date"
                className="w-full border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg focus:border-slate-900 focus:ring-0 outline-none transition-colors font-medium bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">End Date</label>
              <input 
                type="date"
                className="w-full border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg focus:border-slate-900 focus:ring-0 outline-none transition-colors font-medium bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
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
              className="flex-1 md:flex-none px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors whitespace-nowrap text-xs cursor-pointer"
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
              className="flex-1 md:flex-none px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors whitespace-nowrap text-xs cursor-pointer"
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
              className="flex-1 md:flex-none px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors whitespace-nowrap text-xs cursor-pointer"
            >
              This Month
            </button>
            <button 
              onClick={() => {
                const d = new Date()
                d.setDate(0)
                setEndDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
                d.setDate(1)
                setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
              }}
              className="flex-1 md:flex-none px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors whitespace-nowrap text-xs cursor-pointer"
            >
              Last Month
            </button>
          </div>
        </div>

        {/* Formatted Date Range Display */}
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 text-xs font-medium flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span>
            Viewing classes scheduled from{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '...'}</span>
            {' '}to{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '...'}</span>
          </span>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 dark:border-neutral-800 dark:border-neutral-700 border-t-slate-900 rounded-full" />
        </div>
      ) : studentSummaries.length === 0 ? (
        <div className="bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">No Classes Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">There are no completed classes in the selected date range.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {studentSummaries.map(summary => {
            const currencySym = CURRENCIES[summary.profile.billing_currency] || summary.profile.billing_currency || ''
            return (
              <div key={summary.profile.id} className="bg-white dark:bg-[#0f172a] rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                    {summary.profile.first_name} {summary.profile.last_name}
                  </h3>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate mt-0.5">{summary.profile.email}</p>
                </div>
                <div className="p-5 bg-slate-50/50 dark:bg-slate-900/40 flex-1 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Classes</span>
                    <span className="font-bold text-slate-900 dark:text-slate-50">{summary.classes.length} completed</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Total Time</span>
                    <span className="font-bold text-slate-900 dark:text-slate-50">{(summary.totalMins / 60).toFixed(2)} hrs</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800 mt-auto">
                    <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Amount Due</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{currencySym}{summary.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="p-4 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setViewInvoiceFor(summary.profile.id)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold py-2.5 rounded-lg transition-colors text-xs shadow-xs cursor-pointer"
                  >
                    <Printer size={15} />
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

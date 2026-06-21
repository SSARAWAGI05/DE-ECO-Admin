import { Zap, Sparkles, ChevronRight, LayoutDashboard, Users, Video } from 'lucide-react'

interface DashboardProps {
  setActiveSection?: (section: any) => void
}

export default function Dashboard({ setActiveSection }: DashboardProps) {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden perspective-1000">
      
      {/* Custom Animations & Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-blob { animation: blob 10s infinite alternate; }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 15s ease infinite; }
        
        .stars {
          background-image: 
            radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 130px 80px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 160px 120px, #ddd, rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 200px 200px;
          opacity: 0.3;
        }
      `}</style>

      {/* Deep Cosmic Background for Dark Mode */}
      <div className="absolute inset-0 z-0 hidden dark:block stars animate-float-slow opacity-20"></div>

      {/* Massive Glowing Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/30 dark:bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-blob"></div>
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-sky-400/30 dark:bg-sky-500/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen animate-blob" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-rose-500/20 dark:bg-rose-600/10 rounded-full blur-[150px] pointer-events-none animate-blob" style={{ animationDelay: '4s' }}></div>

      {/* Main Glassmorphic Card Container */}
      <div className="relative z-10 w-full max-w-4xl group">
        
        {/* Hover Border Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-rose-500 rounded-[3rem] blur-xl opacity-30 group-hover:opacity-70 transition duration-1000 group-hover:duration-200"></div>

        <div className="relative flex flex-col items-center text-center bg-white/60 dark:bg-[#020617]/60 backdrop-blur-3xl px-8 py-16 sm:p-16 lg:p-24 rounded-[3rem] border border-white/80 dark:border-white/10 shadow-2xl">
          
          {/* Logo Section */}
          <div className="relative mb-12">
            {/* Pulsing Aura */}
            <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-400/30 blur-3xl rounded-full scale-150 animate-pulse duration-1000"></div>
            
            <div className="relative bg-white dark:bg-white p-6 rounded-full border border-slate-200 dark:border-white/10 shadow-2xl shadow-indigo-500/20 dark:shadow-[#0ea5e9]/20 animate-float">
              <img 
                src="/logo.png" 
                alt="DEECO Logo" 
                className="w-40 h-40 lg:w-56 lg:h-56 object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.5)] dark:drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]"
              />
            </div>
            
            {/* Sparkles Decoration */}
            <Sparkles className="absolute -top-4 -right-4 w-10 h-10 text-amber-400 animate-pulse drop-shadow-lg" />
            <Sparkles className="absolute -bottom-2 -left-6 w-8 h-8 text-sky-400 animate-pulse delay-300 drop-shadow-lg" />
          </div>

          {/* Typography */}
          <div className="space-y-6 max-w-3xl">
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-sky-500 to-rose-500 dark:from-indigo-400 dark:via-sky-400 dark:to-rose-400 animate-gradient-x drop-shadow-sm pb-2">
              Welcome to DEECO
            </h1>
          </div>

          {/* Quick Action Navigation */}
          <div className="mt-14 w-full flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            
            {setActiveSection && (
              <>
                <button
                  onClick={() => setActiveSection('enrollments')}
                  className="group relative flex items-center justify-center gap-3 px-8 py-4 sm:px-10 sm:py-5 w-full sm:w-auto font-bold text-lg text-white transition-all duration-300 ease-in-out bg-indigo-600 dark:bg-indigo-500 rounded-full hover:bg-indigo-700 dark:hover:bg-indigo-400 hover:scale-105 hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] overflow-hidden"
                >
                  <div className="absolute inset-0 w-full h-full -ml-10 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                  <Users className="w-6 h-6 text-indigo-200 dark:text-indigo-100 fill-current" />
                  <span>Manage Enrollments</span>
                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => setActiveSection('classes')}
                  className="group flex items-center justify-center gap-3 px-8 py-4 sm:px-10 sm:py-5 w-full sm:w-auto font-bold text-lg text-slate-700 dark:text-white transition-all duration-300 ease-in-out bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full hover:bg-slate-50 dark:hover:bg-white/10 hover:scale-105 hover:shadow-xl overflow-hidden backdrop-blur-md"
                >
                  <Video className="w-6 h-6 text-slate-400 dark:text-slate-300" />
                  <span>Live Classes</span>
                  <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </button>
              </>
            )}

          </div>

        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react';
import { useCollege } from '../context/CollegeContext.tsx';
import { api } from '../services/api.ts';
import { Announcement, AnalyticsSummary } from '../types/index.ts';
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  Shield,
  ArrowRight,
  Send,
  UserCheck,
  CheckCheck,
  Bell,
  BarChart,
  Lock,
  Building,
  Sparkles,
  Star,
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenNewComplaint: () => void;
  onOpenTrackModal: () => void;
  onSelectTab: (tab: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onOpenNewComplaint,
  onOpenTrackModal,
  onSelectTab,
}) => {
  const { collegeName, tagline, logoUrl } = useCollege();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<AnalyticsSummary['summary'] | null>(null);

  useEffect(() => {
    api.getAnnouncements().then(res => setAnnouncements(res.announcements.slice(0, 3))).catch(() => {});
    api.getPublicStats().then(res => setStats(res.summary)).catch(() => {});
  }, []);

  return (
    <div className="space-y-10 sm:space-y-16 py-4 sm:py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-radial from-blue-900 via-slate-900 to-slate-950 text-white p-5 sm:p-8 md:p-12 lg:p-16 shadow-2xl border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-4 sm:mb-6 shadow-xs backdrop-blur-xs max-w-full truncate">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-5 h-5 rounded-full object-contain bg-white/10 p-0.5 border border-white/20 shrink-0"
              />
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">Official Portal • {collegeName}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15] mb-4 sm:mb-6">
            Your Voice.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Our Responsibility.
            </span>
          </h1>

          <p className="text-xs sm:text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-6 sm:mb-8">
            Empowering the students, staff, and administration of <strong className="text-white font-semibold">{collegeName}</strong> with transparent, SLA-monitored grievance resolution and real-time milestone tracking.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              onClick={onOpenNewComplaint}
              className="w-full sm:w-auto px-5 sm:px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 hover:translate-y-[-1px] min-h-[44px]"
            >
              <Send size={16} className="shrink-0" />
              <span>Report a Complaint</span>
            </button>

            <button
              onClick={onOpenTrackModal}
              className="w-full sm:w-auto px-5 sm:px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm rounded-xl backdrop-blur-xs transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Search size={16} className="shrink-0" />
              <span>Track Complaint Status</span>
            </button>
          </div>
        </div>

        {/* Live metric ticker */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-800/80">
            <div className="p-2 sm:p-0">
              <div className="text-xl sm:text-3xl font-black text-white">{stats.total}</div>
              <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Logged</div>
            </div>
            <div className="p-2 sm:p-0">
              <div className="text-xl sm:text-3xl font-black text-emerald-400">{stats.resolved}</div>
              <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">Resolved Cases</div>
            </div>
            <div className="p-2 sm:p-0">
              <div className="text-xl sm:text-3xl font-black text-blue-400">{stats.slaCompliancePercent}%</div>
              <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">SLA Compliance</div>
            </div>
            <div className="p-2 sm:p-0">
              <div className="text-xl sm:text-3xl font-black text-amber-400 flex items-center gap-1.5">
                <span>{stats.averageRating}</span>
                <Star size={18} className="fill-amber-400 text-amber-400 shrink-0" />
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">Satisfaction</div>
            </div>
          </div>
        )}
      </section>

      {/* Mandatory Workflow Section: REPORT -> REVIEW -> ASSIGN -> RESOLVE -> VERIFY */}
      <section className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-200 shadow-xs">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Transparent Procedure</h2>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">How It Works: Step-by-Step Resolution</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 relative">
          {[
            { step: '01', title: 'REPORT', desc: 'Student submits issue with location & evidence, with anonymous option.' },
            { step: '02', title: 'REVIEW', desc: 'Department Head or Nodal Officer inspects details and sets priority.' },
            { step: '03', title: 'ASSIGN', desc: 'Manual delegation to authorized department technicians or officers.' },
            { step: '04', title: 'RESOLVE', desc: 'Repairs performed, resolution notes logged, and evidence uploaded.' },
            { step: '05', title: 'VERIFY', desc: 'Student inspects work, confirms resolution, or reopens if incomplete.' },
          ].map((item, idx) => (
            <div
              key={item.step}
              className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-blue-300 transition-all shadow-2xs"
            >
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 block mb-1">{item.step}</span>
                <h4 className="text-base font-extrabold text-slate-900 tracking-tight mb-2">{item.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center text-[11px] font-semibold text-blue-600">
                <span>Phase {item.step}</span>
                {idx < 4 && <ArrowRight size={12} className="ml-auto text-slate-400 hidden lg:block" />}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Campus Announcements */}
      {announcements.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Active Campus Notices</h3>
              <p className="text-xs text-slate-500">Official updates on campus facilities and ongoing maintenance</p>
            </div>
            <button
              onClick={() => onSelectTab('announcements')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 min-h-[36px]"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      ann.priority === 'High' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {ann.priority} Notice
                    </span>
                    <span className="text-slate-400 text-[11px]">{ann.publication_date}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2">{ann.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{ann.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feature Pillars */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Lock size={20} />
          </div>
          <h4 className="text-base font-bold text-slate-900 mb-2">Privacy & Anonymity</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Report sensitive hostel or facility problems anonymously without fear. Personal details are securely masked in departmental views.
          </p>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Clock size={20} />
          </div>
          <h4 className="text-base font-bold text-slate-900 mb-2">SLA & Escalation</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Configurable service level agreements (24h/48h/72h). Delayed complaints automatically surface for supervisory escalation.
          </p>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs sm:col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <CheckCheck size={20} />
          </div>
          <h4 className="text-base font-bold text-slate-900 mb-2">Student Verification</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            A complaint isn't closed until the student confirms the fix. Unsatisfied students can reopen the complaint with one click.
          </p>
        </div>
      </section>
    </div>
  );
};

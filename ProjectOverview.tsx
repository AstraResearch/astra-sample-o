"use client";

import React, { useState } from 'react';
import Constellation from './Constellation';
import CountUp from './CountUp';

export default function ProjectOverview({ 
  project, 
  onNavigate,
  onBack,
  onRefresh
}: { 
  project: any, 
  onNavigate: (view: 'editor' | 'web' | 'report', docId?: string) => void,
  onBack: () => void,
  onRefresh: () => void
}) {
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [newInterviewName, setNewInterviewName] = useState("");
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // New state variables for creating a Draft Report
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [newReportTitle, setNewReportTitle] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!project) return null;

  // Calculate project stats
  const totalDocs = project.documents?.length || 0;
  const totalReports = project.reports?.length || 0; // <-- Added tracking for reports
  const totalRefs = project.references?.length || 0;
  const totalHighlights = project.documents?.reduce((acc: number, d: any) => acc + (d.highlights?.length || 0), 0) || 0;
  const totalCodes = project.documents?.reduce((acc: number, d: any) => acc + (d.highlights?.reduce((hAcc: number, h: any) => hAcc + h.codes?.length, 0) || 0), 0) || 0;

  // --- API ACTIONS ---
  const handleCreateInterview = async () => {
    if (!newInterviewName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const res = await fetch(`/api/projects/${project.id}/documents`, { 
      method: 'POST', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ title: newInterviewName.trim(), content: "Q: Enter interviewer question here...\n\nA: Enter subject response here..." }) 
    });
    if (res.ok) { 
      const newDoc = await res.json();
      onRefresh(); 
      setIsInterviewModalOpen(false); 
      setNewInterviewName(""); 
      onNavigate('editor', newDoc.id); 
    }
    setIsSubmitting(false);
  };

  const handleCreateReport = async () => {
    if (!newReportTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);
    // Adjust endpoint match to your backend system architecture
    const res = await fetch(`/api/projects/${project.id}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newReportTitle.trim(), content: "<p>Start writing your report draft here...</p>" })
    });
    if (res.ok) {
      const newReport = await res.json();
      onRefresh();
      setIsReportModalOpen(false);
      setNewReportTitle("");
      onNavigate('report', newReport.id);
    }
    setIsSubmitting(false);
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || isSubmitting) return;
    setIsSubmitting(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`/api/projects/${project.id}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newDoc = await res.json();
        onRefresh(); 
        setIsUploadModalOpen(false); 
        setSelectedFile(null);
        onNavigate('editor', newDoc.id); 
      } else {
        const errData = await res.json();
        setUploadError(errData.error || "Failed to upload document.");
      }
    } catch (e) {
      setUploadError("A network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full astra-canvas flex flex-col overflow-y-auto font-sans text-ink relative">
      <style dangerouslySetInnerHTML={{__html: `
        .font-editorial { font-family: var(--font-montserrat), var(--font-montserrat), sans-serif; }
        .astra-shadow { box-shadow: 0 10px 30px rgba(91, 33, 182, 0.06); }
      `}} />

      {/* OBSERVATORY SKY HERO — full-bleed deep band */}
      <div className="astra-sky shrink-0">
        <div className="absolute inset-0 z-0"><Constellation variant="ambient" density={64} /></div>
        <div className="relative z-[2] max-w-[1200px] mx-auto px-8 pt-8 pb-9">
          <div className="flex items-center gap-3 mb-7">
            <button onClick={onBack} title="Back to home" className="w-9 h-9 grid place-items-center rounded-lg text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: '#b8a9ff' }}>
              <button onClick={onBack} className="hover:text-white transition-colors">Home</button>
              <span className="opacity-50">/</span>
              <span className="text-white/90">Project Workspace</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-3.5 h-3.5 rounded-full glow-dot" style={{ backgroundColor: project.color }} />
                <span className="text-[.7rem] font-extrabold uppercase tracking-[.16em]" style={{ color: '#b8a9ff' }}>Active Project</span>
              </div>
              <h1 className="font-editorial text-[2.6rem] lg:text-[3.4rem]" style={{ color: '#fff' }}>{project.name}</h1>
              <p className="sky-muted text-[15px] mt-3 font-medium">Created {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>

            <div className="flex gap-3 shrink-0">
              <button onClick={() => onNavigate('web')} className="inline-flex items-center gap-2 font-bold text-[14px] rounded-[13px] px-5 py-3 press" style={{ background: 'rgba(255,255,255,.07)', color: '#efeaff', border: '1px solid rgba(255,255,255,.16)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Idea Web
              </button>
              <button
                onClick={() => { if (project.reports && project.reports.length > 0) { onNavigate('report', project.reports[0].id); } else { setIsReportModalOpen(true); } }}
                className="inline-flex items-center gap-2 font-bold text-[14px] rounded-[13px] px-5 py-3 text-white press" style={{ background: 'linear-gradient(135deg,#7c4ddb,#a78bfa)', boxShadow: '0 12px 30px -12px rgba(139,110,240,.7)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                {project.reports?.length > 0 ? 'Open Draft Report' : 'Draft New Report'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5 mt-9 pt-7 border-t border-white/10">
            {[{ l: 'Sources', v: totalDocs }, { l: 'Draft Reports', v: totalReports }, { l: 'Codes Applied', v: totalCodes }, { l: 'References', v: totalRefs }].map(s => (
              <div key={s.l}>
                <div className="text-[.66rem] font-bold uppercase tracking-[.14em] sky-muted">{s.l}</div>
                <div className="text-[2rem] font-extrabold text-white tabular-nums mt-1" style={{ letterSpacing: '-.04em' }}><CountUp value={s.v} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTIONS */}
      <div className="px-8 pt-10 pb-16 max-w-[1200px] mx-auto w-full flex flex-col z-10 relative">

        {/* --- SECTION 1: DRAFT REPORTS --- */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="font-editorial text-[28px] text-ink font-semibold">Report Drafts</h2>
            <button onClick={() => setIsReportModalOpen(true)} className="bg-surface border border-line text-ink rounded-xl px-4 py-2 text-sm font-semibold astra-shadow hover:-translate-y-0.5 transition-all flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
              New Draft
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {!project.reports || project.reports.length === 0 ? (
              <div className="col-span-full py-10 text-center text-faint bg-surface rounded-[20px] border border-line border-dashed">
                No report drafts compiled yet. Kickstart an initial draft template to build your structure.
              </div>
            ) : (
              project.reports.map((report: any) => (
                <div key={report.id} onClick={() => onNavigate('report', report.id)} className="bg-surface rounded-[20px] p-5 border border-line astra-shadow hover:-translate-y-1 hover:border-[#c9b8f5] transition-all cursor-pointer group flex flex-col justify-between min-h-[130px]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-[14px] shrink-0 flex items-center justify-center bg-red-50 dark:bg-red-500/15 text-[#EF4444] dark:text-red-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-ink group-hover:text-accent transition-colors line-clamp-1">{report.title}</h3>
                      <p className="text-[13px] text-muted mt-0.5">Updated {new Date(report.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-end">
                    <span className="text-[11px] font-bold text-[#EF4444] dark:text-red-300 bg-red-50 dark:bg-red-500/15 px-2.5 py-1 rounded-full border border-[#FFE3E3] dark:border-red-500/25">Interactive Draft</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- SECTION 2: RESEARCH DOCUMENTS --- */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="font-editorial text-[28px] text-ink font-semibold">Research Documents</h2>
            <div className="flex gap-2">
              <button onClick={() => setIsUploadModalOpen(true)} className="bg-surface border border-line text-ink rounded-xl px-4 py-2 text-sm font-semibold astra-shadow hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Upload File
              </button>
              <button onClick={() => setIsInterviewModalOpen(true)} className="bg-accent text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm hover:bg-[#4c1d95] hover:-translate-y-0.5 transition-all flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                New Interview
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {project.documents?.length === 0 ? (
              <div className="col-span-full py-12 text-center text-faint bg-surface rounded-[20px] border border-line border-dashed">
                No documents uploaded yet. Upload an interview to begin.
              </div>
            ) : (
              project.documents?.map((doc: any) => {
                const isInterview = doc.title.toLowerCase().includes('interview');
                const codesInDoc = doc.highlights?.reduce((acc: number, h: any) => acc + (h.codes?.length || 0), 0) || 0;
                
                return (
                  <div key={doc.id} onClick={() => onNavigate('editor', doc.id)} className="bg-surface rounded-[20px] p-5 border border-line astra-shadow hover:-translate-y-1 hover:border-[#c9b8f5] transition-all cursor-pointer group flex flex-col">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-[14px] shrink-0 flex items-center justify-center ${isInterview ? 'bg-accent-soft text-accent' : 'bg-blue-50 dark:bg-blue-500/15 text-[#3B82F6] dark:text-blue-300'}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isInterview 
                            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          }
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold text-ink group-hover:text-accent transition-colors line-clamp-1">{doc.title}</h3>
                        <p className="text-[13px] text-muted mt-0.5">Updated {new Date(doc.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</p>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-line flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-faint">{doc.highlights?.length || 0} Highlights</span>
                      {codesInDoc > 0 && (
                        <span className="text-[11px] font-bold text-accent bg-accent-soft px-2.5 py-1 rounded-full">{codesInDoc} Codes</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* 1. Create Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-[#1c1840]/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-[24px] shadow-2xl w-full max-w-sm p-8 border border-line">
            <h3 className="font-editorial text-[24px] font-semibold text-ink mb-5">New Report</h3>
            <label className="text-[11px] font-bold text-faint uppercase tracking-widest mb-1.5 block">Report Title</label>
            <input autoFocus type="text" placeholder="e.g. Capstone Dry Cleaning Analysis" className="w-full bg-canvas border border-line rounded-[14px] px-5 py-3.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-[#5b21b6]/12 mb-6 text-ink placeholder-[#A29ABB]" value={newReportTitle} onChange={(e) => setNewReportTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateReport()} />
            <div className="flex gap-3">
              <button onClick={() => setIsReportModalOpen(false)} className="flex-1 px-4 py-3 rounded-[14px] text-muted font-semibold hover:bg-canvas transition-colors">Cancel</button>
              <button onClick={handleCreateReport} disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-[14px] bg-accent text-white font-semibold hover:bg-[#4c1d95] transition-colors disabled:opacity-50 shadow-sm">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Create Interview Modal */}
      {isInterviewModalOpen && (
        <div className="fixed inset-0 bg-[#1c1840]/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-[24px] shadow-2xl w-full max-w-sm p-8 border border-line">
            <h3 className="font-editorial text-[24px] font-semibold text-ink mb-5">Create Interview</h3>
            <label className="text-[11px] font-bold text-faint uppercase tracking-widest mb-1.5 block">Interview Name</label>
            <input autoFocus type="text" placeholder="e.g. Interview 04" className="w-full bg-canvas border border-line rounded-[14px] px-5 py-3.5 text-[15px] outline-none focus:border-accent focus:ring-2 focus:ring-[#5b21b6]/12 mb-6 text-ink placeholder-[#A29ABB]" value={newInterviewName} onChange={(e) => setNewInterviewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateInterview()} />
            <div className="flex gap-3">
              <button onClick={() => setIsInterviewModalOpen(false)} className="flex-1 px-4 py-3 rounded-[14px] text-muted font-semibold hover:bg-canvas transition-colors">Cancel</button>
              <button onClick={handleCreateInterview} disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-[14px] bg-accent text-white font-semibold hover:bg-[#4c1d95] transition-colors disabled:opacity-50 shadow-sm">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Upload File Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-[#1c1840]/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-[24px] shadow-2xl w-full max-w-sm p-8 border border-line">
            <h3 className="font-editorial text-[24px] font-semibold text-ink mb-5">Upload Document</h3>
            
            <label className="text-[11px] font-bold text-faint uppercase tracking-widest mb-1.5 block">Select PDF or TXT</label>
            <div className="w-full bg-canvas border border-line border-dashed rounded-[14px] px-5 py-6 text-center mb-2 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#F2EEFF] dark:hover:bg-white/[0.07] transition-colors relative">
              <input type="file" accept=".pdf,.txt" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <span className="text-[13px] font-medium text-ink">{selectedFile ? selectedFile.name : "Click or drag file here"}</span>
            </div>

            {uploadError && <p className="text-red-500 text-[12px] font-medium mt-2 mb-4">{uploadError}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setIsUploadModalOpen(false); setUploadError(null); setSelectedFile(null); }} className="flex-1 px-4 py-3 rounded-[14px] text-muted font-semibold hover:bg-canvas transition-colors">Cancel</button>
              <button onClick={handleUploadDocument} disabled={isSubmitting || !selectedFile} className="flex-1 px-4 py-3 rounded-[14px] bg-accent text-white font-semibold hover:bg-[#4c1d95] transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center">
                {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

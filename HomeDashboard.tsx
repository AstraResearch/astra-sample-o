"use client";

import React, { useState, useEffect, useRef } from 'react';
import Constellation from './Constellation';
import CountUp from './CountUp';

// --- HELPER FUNCTIONS ---
function timeAgo(dateInput: string | Date) {
  const date = new Date(dateInput);
  const now = new Date();
  const secondsPast = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (secondsPast < 60) return 'Just now';
  if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)} min ago`;
  if (secondsPast <= 86400) return `Edited ${Math.floor(secondsPast / 3600)}h ago`;
  if (secondsPast <= 604800) return `Edited ${Math.floor(secondsPast / 86400)} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Category tag palette — each research type reads as a distinct, calm color chip.
const BADGE_TINT: Record<string, { bg: string; text: string }> = {
  QUALITATIVE:     { bg: 'rgba(91,33,182,0.12)', text: '#5B21B6' },
  QUANTITATIVE:    { bg: 'rgba(13,148,136,0.14)',  text: '#0D9488' },
  'MIXED METHODS': { bg: 'rgba(234,88,12,0.14)',   text: '#EA580C' },
  READING:         { bg: 'rgba(219,39,119,0.12)',  text: '#DB2777' },
  WRITING:         { bg: 'rgba(37,99,235,0.12)',   text: '#2563EB' },
  WORKSPACE:       { bg: 'rgba(99,102,241,0.14)',  text: '#6366F1' },
};
function badgeTint(badge: string) {
  return BADGE_TINT[badge?.toUpperCase()] || { bg: 'rgba(99,102,241,0.12)', text: '#6366F1' };
}

// A single decorative sparkle used to give the hero a subtle "research constellation" feel.
function Sparkle({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c.4 4.4 2.6 6.6 7 7-4.4.4-6.6 2.6-7 7-.4-4.4-2.6-6.6-7-7 4.4-.4 6.6-2.6 7-7z" />
    </svg>
  );
}

export default function HomeDashboard({
  projects,
  session,
  onNavigate,
  onRefresh
}: {
  projects: any[],
  session: any,
  onNavigate: (projectId: string, view: 'home' | 'editor' | 'web' | 'report', docId?: string) => void,
  onRefresh: () => void
}) {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Projects' | 'Documents' | 'Interviews' | 'Drafts' | 'Idea Webs'>('All');
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [newInterviewName, setNewInterviewName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userName = session?.user?.name?.split(' ')[0] || 'Nodira';

  // New Upload States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // --- DYNAMIC DATA AGGREGATION ---
  const allItems: any[] = [];

  projects.forEach(p => {
    allItems.push({
      id: `proj-${p.id}`, type: 'Project', title: p.name,
      badge: 'WORKSPACE',
      desc: 'Project overview',
      meta: `${p.documents?.length || 0} docs · ${p.references?.length || 0} refs`,
      updatedAt: p.updatedAt || p.createdAt, color: p.color, projectId: p.id, view: 'home'
    });

    const totalCodes = p.documents?.reduce((acc: number, d: any) => acc + (d.highlights?.reduce((hAcc: number, h: any) => hAcc + h.codes.length, 0) || 0), 0) || 0;
    if (totalCodes > 0) {
      allItems.push({
        id: `web-${p.id}`, type: 'Idea Web', title: `${p.name} Concept Map`,
        badge: 'QUALITATIVE',
        desc: 'Analysis phase',
        meta: `${totalCodes} linked codes`,
        updatedAt: p.updatedAt || p.createdAt, color: p.color, projectId: p.id, view: 'web'
      });
    }

    p.documents?.forEach((d: any) => {
      const isInterview = d.title.toLowerCase().includes('interview');
      const type = isInterview ? 'Interview' : 'Document';
      const codeCount = d.highlights?.reduce((acc: number, h: any) => acc + (h.codes?.length || 0), 0) || 0;

      allItems.push({
        id: `doc-${d.id}`, type, title: d.title,
        badge: isInterview ? 'MIXED METHODS' : 'READING',
        desc: isInterview ? 'Fieldwork' : 'Source document',
        meta: `${codeCount} codes`,
        updatedAt: d.updatedAt || d.createdAt, codeCount, projectId: p.id, docId: d.id, view: 'editor'
      });
    });

    p.reports?.forEach((r: any) => {
      allItems.push({
        id: `rep-${r.id}`, type: 'Draft', title: r.title || 'Untitled Draft',
        badge: 'WRITING',
        desc: `In ${p.name}`,
        meta: `Draft phase`,
        updatedAt: r.updatedAt || r.createdAt, projectId: p.id, view: 'report'
      });
    });
  });

  allItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const searchResults = searchQuery.trim() === "" ? [] : allItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 6);

  // --- FILTER APPLY ---
  const filteredGridItems = allItems.filter(item =>
    activeFilter === 'All' ||
    (activeFilter === 'Projects' && item.type === 'Project') ||
    (activeFilter === 'Documents' && item.type === 'Document') ||
    (activeFilter === 'Interviews' && item.type === 'Interview') ||
    (activeFilter === 'Drafts' && item.type === 'Draft') ||
    (activeFilter === 'Idea Webs' && item.type === 'Idea Web')
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsSearchFocused(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set default project ID context if available
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // --- API ACTIONS ---
  const handleCreateProject = async () => {
    if (!newProjectName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newProjectName.trim() }) });
    if (res.ok) { onRefresh(); setIsProjectModalOpen(false); setNewProjectName(""); }
    setIsSubmitting(false);
  };

  const handleCreateInterview = async () => {
    if (!newInterviewName.trim() || !selectedProjectId || isSubmitting) return;
    setIsSubmitting(true);
    const res = await fetch(`/api/projects/${selectedProjectId}/documents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newInterviewName.trim(), content: "Q: Enter interviewer question here...\n\nA: Enter subject response here..." })
    });
    if (res.ok) {
      const newDoc = await res.json();
      onRefresh(); setIsInterviewModalOpen(false); setNewInterviewName("");
      onNavigate(selectedProjectId, 'editor', newDoc.id);
    }
    setIsSubmitting(false);
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !selectedProjectId || isSubmitting) return;
    setIsSubmitting(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newDoc = await res.json();
        onRefresh();
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        onNavigate(selectedProjectId, 'editor', newDoc.id);
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

  // --- HIGH FIDELITY ILLUSTRATION DESIGN RENDERER ---
  const renderIllustration = (badge: string, title: string) => {
    const typeUpper = badge.toUpperCase();
    if (typeUpper === 'QUALITATIVE') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-[#ede9ff] to-[#f6f2ff] dark:from-[#241d45] dark:to-[#1b1638] relative overflow-hidden flex items-center justify-center">
          <svg className="w-full h-full opacity-70" viewBox="0 0 200 100" fill="none">
            <path d="M40 50 L90 30 M90 30 L150 45 M90 30 L110 75 M40 50 L110 75" stroke="#c4b5fd" strokeWidth="1.5" />
            <circle cx="40" cy="50" r="10" fill="#5b21b6" />
            <circle cx="90" cy="30" r="12" fill="#8b5cf6" />
            <circle cx="150" cy="45" r="7" fill="#38bdf8" />
            <circle cx="110" cy="75" r="9" fill="#f59e0b" />
          </svg>
        </div>
      );
    }
    if (typeUpper === 'MIXED METHODS') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-[#fff3e6] to-[#ffe9d1] dark:from-[#3a2a1a] dark:to-[#2a1f14] relative overflow-hidden flex flex-col justify-end p-3">
          <div className="absolute top-3 left-4 flex gap-1">
            <div className="w-5 h-5 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center text-[9px] font-bold">N</div>
            <div className="w-5 h-5 rounded-full bg-[#fb923c] text-white flex items-center justify-center text-[9px] font-bold">P</div>
          </div>
          <div className="flex items-end gap-1 w-full h-[50px] px-2 opacity-80">
            {[40, 20, 60, 80, 45, 90, 70, 55, 30, 85, 40, 65, 50, 25, 75].map((h, i) => (
              <div key={i} className="flex-1 bg-[#f97316] rounded-t-[2px]" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>
      );
    }
    if (typeUpper === 'READING') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-[#fdeef6] to-[#fce7f3] dark:from-[#341f2e] dark:to-[#2a1824] relative overflow-hidden flex flex-col justify-center px-6 gap-2">
          <div className="w-1/3 h-2 bg-[#ec4899] rounded-full"></div>
          <div className="w-full h-1 bg-[#f9c6df] rounded-full"></div>
          <div className="w-full h-1 bg-[#f9c6df] rounded-full"></div>
          <div className="w-5/6 h-1 bg-[#f9c6df] rounded-full"></div>
        </div>
      );
    }
    if (typeUpper === 'QUANTITATIVE') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-[#e6f7f4] to-[#d5f2ec] dark:from-[#153230] dark:to-[#0f2926] relative overflow-hidden flex items-end justify-between px-6 py-4 gap-3">
          <div className="w-7 bg-[#5eead4] rounded-[2px]" style={{ height: '40%' }}></div>
          <div className="w-7 bg-[#2dd4bf] rounded-[2px]" style={{ height: '65%' }}></div>
          <div className="w-7 bg-[#0d9488] rounded-[2px]" style={{ height: '90%' }}></div>
          <div className="w-7 bg-[#99f6e4] rounded-[2px]" style={{ height: '30%' }}></div>
          <div className="w-7 bg-[#5eead4] rounded-[2px]" style={{ height: '50%' }}></div>
        </div>
      );
    }
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#f6f2ff] to-white dark:from-[#1e1a38] dark:to-[#16132e] relative overflow-hidden flex flex-col justify-center px-6 gap-2">
        <div className="w-1/4 h-1.5 bg-[#c4b5fd] rounded-full"></div>
        <div className="w-full h-1 bg-[#ece7f5] rounded-full"></div>
        <div className="w-5/6 h-1 bg-[#ece7f5] rounded-full"></div>
        <div className="w-4/5 h-1 bg-[#ece7f5] rounded-full"></div>
        <div className="absolute bottom-4 right-6 w-1 h-4 bg-[#5b21b6] animate-pulse"></div>
      </div>
    );
  };

  // --- Observatory dashboard derivations ---
  const CODE_HEX: Record<string, string> = { purple:'#8b6ef0', pink:'#e05aa0', green:'#3fbf87', blue:'#4f83f0', gold:'#e0b13c', orange:'#ea883c', teal:'#2bb3a3', indigo:'#6d6ff0', rose:'#f0699b', cyan:'#37c7d8', lime:'#9bd142', red:'#ef6a6a' };
  const heroProject: any = projects.find((p: any) => (p.documents?.length || 0) > 0) || projects[0];
  const heroCodes = (() => {
    if (!heroProject) return [] as { label: string; color: string }[];
    const seen = new Map<string, string>();
    heroProject.documents?.forEach((d: any) => d.highlights?.forEach((h: any) => h.codes?.forEach((c: any) => {
      if (c?.label && !seen.has(c.label)) seen.set(c.label, CODE_HEX[c.colorId] || '#8b6ef0');
    })));
    return Array.from(seen.entries()).slice(0, 6).map(([label, color]) => ({ label, color }));
  })();
  // A calm, de-conflicted spread so labels never collide.
  const POS = [ {x:.24,y:.34,r:19},{x:.76,y:.62,r:17},{x:.56,y:.26,r:15},{x:.26,y:.72,r:14},{x:.50,y:.56,r:18},{x:.83,y:.30,r:11} ];
  const heroNodes = heroCodes.map((c, i) => ({ ...c, ...POS[i % POS.length] }));
  // Only meaningful links, weighted by strength ([a, b, weight]).
  const heroLinks: [number, number, number][] = heroNodes.length >= 5
    ? [[0,4,3],[0,2,2],[4,2,3],[4,1,3],[3,4,2],[2,1,1],[1,5,1]].filter(l => l[0] < heroNodes.length && l[1] < heroNodes.length) as [number, number, number][]
    : heroNodes.map((_, i) => [i, (i + 1) % Math.max(heroNodes.length, 1), 1] as [number, number, number]);
  const totalDocsAll = projects.reduce((a: number, p: any) => a + (p.documents?.length || 0), 0);
  const totalCodesAll = projects.reduce((a: number, p: any) => a + (p.documents?.reduce((x: number, d: any) => x + (d.highlights?.reduce((y: number, h: any) => y + (h.codes?.length || 0), 0) || 0), 0) || 0), 0);
  const totalHls = projects.reduce((a: number, p: any) => a + (p.documents?.reduce((x: number, d: any) => x + (d.highlights?.length || 0), 0) || 0), 0);
  const topRecent = allItems[0];
  const stateLine = topRecent
    ? `You last worked on ${topRecent.title}. So far: ${totalCodesAll} codes across ${projects.length} project${projects.length === 1 ? '' : 's'}, ${totalHls} highlights.`
    : 'Start a project to begin mapping your research.';
  const now = new Date();
  const dayName = now.toLocaleDateString(undefined, { weekday: 'long' });

  return (
    <div className="w-full min-h-screen astra-canvas flex text-ink font-sans relative antialiased">

      {/* Top gradient band — title area on a slightly deeper wash (Canva-like). */}
      <div className="astra-header-band absolute top-0 left-0 w-full h-80 pointer-events-none z-0" />

      {/* FAINT CONSTELLATION — depth now comes from the canvas gradient, so
          the old bright blooms are gone (they read as "cheap"); only a few
          restrained sparkles remain for character. */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Sparkle className="absolute text-[#5b21b6]/12" style={{ top: '12%', left: '8%', width: 12, height: 12 }} />
        <Sparkle className="absolute text-[#8b5cf6]/14" style={{ top: '22%', right: '14%', width: 16, height: 16 }} />
        <Sparkle className="absolute text-[#5b21b6]/10" style={{ bottom: '18%', right: '30%', width: 11, height: 11 }} />
      </div>

      {/* --- MAIN WORKSPACE VIEW PANEL --- */}
      <main className="flex-1 overflow-y-auto px-6 lg:px-10 py-7 max-w-[1320px] mx-auto w-full z-10 flex flex-col gap-7 relative">

        {/* TOP ROW — breadcrumb · command search · notifications */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-[12px] font-semibold text-faint uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <span>Home</span><span className="opacity-50">/</span><span className="text-accent font-bold">All works</span>
          </div>

          <div className="relative flex-1 max-w-md" ref={searchRef}>
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.604 10.604z"></path></svg>
            <input
              type="text"
              placeholder="Search or jump to…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full bg-surface border border-line rounded-xl pl-11 pr-14 h-11 text-[14px] font-medium outline-none focus:border-accent focus:ring-4 focus:ring-[#5b21b6]/12 transition-all text-ink placeholder-faint"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-surface-2 rounded-md text-[10px] font-bold text-faint border border-line">⌘K</div>
            {isSearchFocused && searchQuery.trim() !== "" && (
              <div className="absolute top-[52px] left-0 w-full bg-surface rounded-2xl shadow-lg border border-line overflow-hidden z-50">
                {searchResults.length === 0 ? (
                  <div className="p-5 text-center text-muted text-sm">No results for "{searchQuery}"</div>
                ) : (
                  searchResults.map(item => {
                    const t = badgeTint(item.badge);
                    return (
                    <button key={`search-${item.id}`} onClick={() => { onNavigate(item.projectId, item.view, item.docId); setIsSearchFocused(false); }} className="w-full flex items-center justify-between p-4 hover:bg-surface-2 transition-colors border-b border-line last:border-0 text-left">
                      <div className="flex flex-col"><span className="text-[14px] font-semibold text-ink">{item.title}</span><span className="text-[12px] text-faint mt-0.5">{item.desc}</span></div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md" style={{ background: t.bg, color: t.text }}>{item.type}</span>
                    </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="w-9 h-9 grid place-items-center rounded-lg border border-line text-muted hover:text-ink hover:bg-surface-2 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" strokeLinejoin="round" d="M9.9 9a2.1 2.1 0 114 .7c0 1.4-2.1 1.8-2.1 3M12 17h.01"/></svg></button>
            <button className="w-9 h-9 grid place-items-center rounded-lg border border-line text-muted hover:text-ink hover:bg-surface-2 transition-colors relative"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full"></span></button>
          </div>
        </div>

        {/* SKY HERO — the observatory band */}
        <div className="astra-sky rounded-[26px] shadow-[0_36px_80px_-42px_rgba(30,18,80,.55)] animate-rise shrink-0">
          <div className="absolute inset-0 z-0"><Constellation variant="ambient" density={72} /></div>
          <div className="relative z-[2] p-8 lg:p-11">
            <span className="text-[.7rem] font-extrabold uppercase tracking-[.16em]" style={{ color: '#b8a9ff' }}>{dayName} · {heroProject ? `${heroProject.name} is active` : 'New workspace'}</span>
            <h1 className="font-editorial text-[2.3rem] md:text-[3.1rem] leading-[1.02] mt-3.5" style={{ color: '#fff' }}>Welcome back, {userName}.<br /><span className="sky-lum">What will we research today?</span></h1>
            <p className="sky-muted mt-4 max-w-[58ch] text-[15px] leading-relaxed">{stateLine}</p>
            <div className="flex flex-wrap items-center gap-3 mt-7">
              {topRecent && (
                <button onClick={() => onNavigate(topRecent.projectId, topRecent.view, topRecent.docId)} className="inline-flex items-center gap-2 font-bold text-[14px] rounded-[13px] px-5 py-3 text-white press" style={{ background: 'linear-gradient(135deg,#7c4ddb,#a78bfa)', boxShadow: '0 12px 30px -12px rgba(139,110,240,.7)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg>
                  Resume {topRecent.title.length > 20 ? topRecent.title.slice(0, 20) + '…' : topRecent.title}
                </button>
              )}
              <button onClick={() => setIsProjectModalOpen(true)} className="inline-flex items-center gap-2 font-bold text-[14px] rounded-[13px] px-5 py-3 press" style={{ background: 'rgba(255,255,255,.07)', color: '#efeaff', border: '1px solid rgba(255,255,255,.16)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14"/></svg>
                New project
              </button>
              <div className="flex items-center gap-2 md:ml-auto">
                {[{ l: 'Upload', fn: () => { if (projects.length) setIsUploadModalOpen(true); } }, { l: 'Interview', fn: () => { if (projects.length) setIsInterviewModalOpen(true); } }, { l: 'Analyze', fn: () => { if (projects.length) onNavigate(projects[0].id, 'web'); } }, { l: 'Write', fn: () => { if (projects.length) onNavigate(projects[0].id, 'report'); } }].map(a => (
                  <button key={a.l} onClick={a.fn} className="text-[12.5px] font-semibold px-3.5 py-2 rounded-[10px] transition-colors" style={{ color: '#efeaff', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.16)' }}>{a.l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SIGNATURE + RECENTS */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 animate-rise stagger-1 shrink-0">
          <div className="bg-surface border border-line rounded-[22px] shadow-card overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5">
              <div>
                <span className="text-[10px] font-bold text-faint uppercase tracking-widest">{heroProject?.name || 'No active project'}</span>
                <h3 className="font-editorial text-[1.2rem] text-ink mt-1">Your idea constellation</h3>
              </div>
              {heroProject && <button onClick={() => onNavigate(heroProject.id, 'web')} className="text-[13px] font-bold text-accent hover:text-accent-press transition-colors">Open Idea Web →</button>}
            </div>
            {heroNodes.length > 0 ? (
              <>
                <div className="relative h-[300px] mt-2"><Constellation variant="map" nodes={heroNodes} links={heroLinks} density={16} /></div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 px-6 pb-5">
                  {heroNodes.map(n => (<span key={n.label} className="inline-flex items-center gap-1.5 text-[12px] text-muted font-medium"><i className="w-2 h-2 rounded-full" style={{ background: n.color }} />{n.label}</span>))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6 min-h-[280px]">
                <p className="text-muted text-[14px] max-w-xs">Code some highlights and your themes will appear here as a living constellation.</p>
              </div>
            )}
          </div>

          <div className="bg-surface border border-line rounded-[22px] shadow-card overflow-hidden">
            <div className="px-6 pt-5 pb-1">
              <span className="text-[10px] font-bold text-faint uppercase tracking-widest">Pick up where you left off</span>
              <h3 className="font-editorial text-[1.2rem] text-ink mt-1">Recents</h3>
            </div>
            <div className="p-3">
              {allItems.length === 0 ? (
                <div className="py-12 text-center text-faint text-[13px]">Nothing yet — create a project to begin.</div>
              ) : allItems.slice(0, 6).map(item => {
                const t = badgeTint(item.badge);
                return (
                  <button key={item.id} onClick={() => onNavigate(item.projectId, item.view, item.docId)} className="w-full flex items-center gap-3.5 px-3 py-3 rounded-[14px] hover:bg-surface-2 transition-colors text-left">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.text, boxShadow: `0 0 0 4px ${t.bg}` }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold text-ink truncate">{item.title}</div>
                      <div className="text-[12px] text-faint mt-0.5 truncate">{item.desc} · {item.meta}</div>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shrink-0" style={{ background: t.bg, color: t.text }}>{item.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* STAT STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-rise stagger-2 pb-8 shrink-0">
          {[{ l: 'Sources', v: totalDocsAll, d: `across ${projects.length} project${projects.length === 1 ? '' : 's'}` }, { l: 'Codes applied', v: totalCodesAll, d: 'this workspace' }, { l: 'Highlights', v: totalHls, d: 'captured' }, { l: 'Projects', v: projects.length, d: 'active' }].map(s => (
            <div key={s.l} className="bg-surface border border-line rounded-[18px] p-5 shadow-card">
              <span className="text-[10px] font-bold text-faint uppercase tracking-widest">{s.l}</span>
              <div className="text-[1.9rem] font-extrabold text-ink mt-2 tabular-nums" style={{ letterSpacing: '-.04em' }}><CountUp value={s.v} /></div>
              <div className="text-[12px] text-muted mt-0.5">{s.d}</div>
            </div>
          ))}
        </div>

      </main>

      {/* --- STANDARDIZED MODAL INTERFACES --- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-[#1c1840]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-[24px] shadow-lg w-full max-w-md p-6 border border-line animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-[18px] font-extrabold tracking-tight text-ink mb-4">Upload Document</h3>

            <label className="text-[10px] font-extrabold text-faint uppercase tracking-wider mb-1.5 block">Project</label>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-accent mb-4 text-ink">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <label className="text-[10px] font-extrabold text-faint uppercase tracking-wider mb-1.5 block">Select a file (PDF or TXT)</label>
            <div className="w-full bg-canvas border-2 border-line border-dashed rounded-xl px-4 py-8 text-center mb-2 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#5b21b60d] hover:border-[#c9b8f5] transition-colors relative group">
              <input type="file" accept=".pdf,.txt" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="w-10 h-10 rounded-lg bg-surface shadow-sm border border-line text-muted flex items-center justify-center group-hover:text-accent transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"></path></svg>
              </div>
              <span className="text-[13px] font-bold text-ink">{selectedFile ? selectedFile.name : "Click or drag file here"}</span>
              <span className="text-[11px] text-faint font-medium">PDF or TXT, one file at a time</span>
            </div>

            {uploadError && <p className="text-rose-600 text-[12px] font-bold mt-2 mb-2">{uploadError}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setIsUploadModalOpen(false); setUploadError(null); setSelectedFile(null); }} className="flex-1 px-4 py-2.5 rounded-xl text-[14px] text-muted font-bold hover:bg-surface-2 transition-colors">Cancel</button>
              <button onClick={handleUploadDocument} disabled={isSubmitting || !selectedFile} className="flex-1 px-4 py-2.5 rounded-xl text-[14px] bg-accent hover:bg-[#4c1d95] text-white font-bold transition-colors disabled:opacity-40 shadow-sm flex items-center justify-center">
                {isSubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-[#1c1840]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-[24px] shadow-lg w-full max-w-sm p-6 border border-line animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-[18px] font-extrabold tracking-tight text-ink mb-4">Create New Project</h3>
            <input autoFocus type="text" placeholder="e.g. Employee Retention Study" className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-[14px] font-medium outline-none focus:border-accent focus:ring-4 focus:ring-[#5b21b6]/12 mb-5 text-ink placeholder-faint" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()} />
            <div className="flex gap-3">
              <button onClick={() => setIsProjectModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl text-[14px] text-muted font-bold hover:bg-surface-2 transition-colors">Cancel</button>
              <button onClick={handleCreateProject} disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-xl text-[14px] bg-accent hover:bg-[#4c1d95] text-white font-bold transition-colors disabled:opacity-40 shadow-sm">Create</button>
            </div>
          </div>
        </div>
      )}

      {isInterviewModalOpen && (
        <div className="fixed inset-0 bg-[#1c1840]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-[24px] shadow-lg w-full max-w-sm p-6 border border-line animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-[18px] font-extrabold tracking-tight text-ink mb-4">New Interview</h3>
            <label className="text-[10px] font-extrabold text-faint uppercase tracking-wider mb-1.5 block">Project</label>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-accent mb-4 text-ink">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label className="text-[10px] font-extrabold text-faint uppercase tracking-wider mb-1.5 block">Interview name</label>
            <input autoFocus type="text" placeholder="e.g. Interview 04" className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-[14px] font-medium outline-none focus:border-accent focus:ring-4 focus:ring-[#5b21b6]/12 mb-5 text-ink placeholder-faint" value={newInterviewName} onChange={(e) => setNewInterviewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateInterview()} />
            <div className="flex gap-3">
              <button onClick={() => setIsInterviewModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl text-[14px] text-muted font-bold hover:bg-surface-2 transition-colors">Cancel</button>
              <button onClick={handleCreateInterview} disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-xl text-[14px] bg-accent hover:bg-[#4c1d95] text-white font-bold transition-colors disabled:opacity-40 shadow-sm">Create</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

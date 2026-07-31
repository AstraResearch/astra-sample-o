"use client";
import { useState, useEffect, useRef } from "react";
import DocumentEditor from "./components/DocumentEditor";
import ProjectWeb from "./components/ProjectWeb"; 
import CodebookManager from "./components/CodebookManager";
import { useSession } from "next-auth/react";
import WelcomeScreen from "./components/WelcomeScreen";
import HomeDashboard from "./components/HomeDashboard";
import ReferenceManager from "./components/ReferenceManager";
import ReportEditor from "./components/ReportEditor";
import ProjectOverview from "./components/ProjectOverview";
import SurveyDashboard from "./components/SurveyDashboard";
import SurveyBuilder from "./components/SurveyBuilder";
import SurveyAnalytics from "./components/SurveyAnalytics";
import ReactMarkdown from 'react-markdown';
import Sidebar from "./components/Sidebar";
import AstraLoader from "./components/AstraLoader";
import { ProjectCard, PROJECT_ARCHETYPES } from "./components/ProjectCard";
import Constellation from "./components/Constellation";
import ProfilePage from "./components/ProfilePage";
import SettingsPage from "./components/SettingsPage";


// --- GENERATIVE UI: SUGGESTION CHECKLIST ---
const ChecklistUI = ({ suggestions, documentTitle, onApply }: { suggestions: any[], documentTitle: string, onApply: (selected: any[]) => void }) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set(suggestions.map((_, i) => i)));
  const [isApplying, setIsApplying] = useState(false);

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIndices(newSet);
  };

  const handleApply = async () => {
    setIsApplying(true);
    const selectedSuggestions = suggestions.filter((_, i) => selectedIndices.has(i));
    await onApply(selectedSuggestions);
    setIsApplying(false);
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 bg-surface border border-line rounded-[16px] overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-canvas px-4 py-2.5 border-b border-line flex items-center justify-between">
        <span className="text-[12px] font-bold text-accent uppercase tracking-widest">Suggested Codes</span>
        <span className="text-[11px] font-medium text-faint">{selectedIndices.size} selected</span>
      </div>
      <div className="flex flex-col max-h-[250px] overflow-y-auto custom-scrollbar">
        {suggestions.map((sug, i) => (
          <label key={i} className="flex items-start gap-3 p-3 border-b border-line last:border-0 hover:bg-[#FAFAFA] dark:hover:bg-white/[0.04] cursor-pointer transition-colors">
            <input type="checkbox" checked={selectedIndices.has(i)} onChange={() => toggleSelection(i)} className="mt-1 w-4 h-4 text-accent rounded border-line focus:ring-[#5B21B6]" />
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-ink leading-snug">"{sug.quote}"</span>
              <span className="text-[10px] font-bold text-accent bg-[#F2EEFF] px-2 py-0.5 rounded-md w-max">{sug.code}</span>
            </div>
          </label>
        ))}
      </div>
      <div className="p-3 bg-canvas border-t border-line">
        <button onClick={handleApply} disabled={selectedIndices.size === 0 || isApplying} className="w-full bg-accent text-white rounded-xl py-2 text-[13px] font-bold hover:bg-[#4c1d95] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {isApplying ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Applying...</>
          ) : (
            <>Apply {selectedIndices.size} Codes →</>
          )}
        </button>
      </div>
    </div>
  );
};

export default function Home() {
  const { data: session, status } = useSession();
  
  // GLOBAL STATE
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null); // <-- NEW STATE
  const [viewMode, setViewMode] = useState<'home' | 'home-projects' | 'home-library' | 'home-settings' | 'home-profile' | 'editor' | 'web' | 'codebook' | 'project' | 'references' | 'report' | 'surveys' | 'survey-builder' | 'survey-analytics'>('home');
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{type: 'project' | 'document' | 'survey' | 'report', id: string, name: string} | null>(null);

  // CHAT & AGENT STATES
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string, isActing?: boolean}[]>([]);
  const [aiLoadingText, setAiLoadingText] = useState<string | null>(null);
  const [agentAction, setAgentAction] = useState<any>(null);
  const [editorAction, setEditorAction] = useState<any>(null); 
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [surveyAction, setSurveyAction] = useState<any>(null);

  // Minimum splash duration so the branded boot loader is enjoyed, not flashed.
  const [bootReady, setBootReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBootReady(true), 2400);
    return () => clearTimeout(t);
  }, []);
  
  
  // PROJECT CREATION STATE
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [renamingProject, setRenamingProject] = useState<{ id: string; name: string } | null>(null);

  const handleRenameProject = async () => {
    if (!renamingProject || !renamingProject.name.trim()) { setRenamingProject(null); return; }
    try {
      await fetch(`/api/projects/${renamingProject.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renamingProject.name.trim() }),
      });
      setRenamingProject(null);
      fetchProjects();
    } catch {
      setErrorMessage("Failed to rename project.");
    }
  };

  const handleCreateProject = async () => {
    const trimmedName = newProjectName.trim();
    if (!trimmedName || isProjectLoading) return;

    if (projects.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrorMessage(`Project "${trimmedName}" already exists.`);
      return;
    }

    setIsProjectLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName })
      });
      if (res.ok) {
        const newProj = await res.json();
        setNewProjectName("");
        setIsCreatingProject(false);
        fetchProjects(); // Triggers your existing fetchProjects!
        setActiveProjectId(newProj.id);
        setViewMode('project');
      } else {
        setErrorMessage("Failed to create project.");
      }
    } catch {
      setErrorMessage("Network error.");
    } finally {
      setIsProjectLoading(false);
    }
  };
  
  // NEW: Dynamic Dashboard Summary State
  const [dashboardSummary, setDashboardSummary] = useState<string | null>(null);

  // --- DYNAMIC AI DASHBOARD SUMMARY (WITH 3-HOUR CACHE) ---
  useEffect(() => {
    if (viewMode === 'home' && session?.user?.email) {
      const fetchSummary = async () => {
        const userEmail = session.user?.email;
        const CACHE_KEY_TEXT = `astra_summary_text_${userEmail}`;
        const CACHE_KEY_TIME = `astra_summary_time_${userEmail}`;
        const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
        
        const now = Date.now();
        const cachedText = localStorage.getItem(CACHE_KEY_TEXT);
        const cachedTime = localStorage.getItem(CACHE_KEY_TIME);

        // Check if we have a valid, unexpired cache
        if (cachedText && cachedTime && (now - parseInt(cachedTime)) < CACHE_DURATION) {
          setDashboardSummary(cachedText);
          return; // Exit early, do not hit the API!
        }

        setDashboardSummary(null); // Reset to show loading skeleton
        
        try {
          const res = await fetch('/api/ai/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: null }) 
          });
          
          if (!res.ok) throw new Error("Failed to fetch summary");

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let text = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; 
            for (const line of lines) {
              if (line.trim().startsWith('data: ')) {
                const dataStr = line.replace(/^data:\s*/, '').trim();
                if (dataStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(dataStr);
                  const textChunk = parsed.choices[0]?.delta?.content || '';
                  if (textChunk) {
                    text += textChunk;
                    setDashboardSummary(text);
                  }
                } catch (e) {}
              }
            }
          }
          
          // Save the final completed text to the cache
          localStorage.setItem(CACHE_KEY_TEXT, text);
          localStorage.setItem(CACHE_KEY_TIME, now.toString());

        } catch (e) {
          console.error(e);
          setDashboardSummary("Welcome back to Astra Research. Select a project to continue.");
        }
      };
      
      fetchSummary();
    }
  }, [viewMode, session]);

  // --- AUTO-REFRESH ON NAVIGATION ---
  useEffect(() => {
    if (viewMode === 'home' || viewMode === 'project') {
      fetchProjects();
    }
  }, [viewMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, aiLoadingText]);

  // --- ADD THIS REF WITH YOUR OTHER STATES ---
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- REPLACE YOUR EXISTING CHAT EFFECTS WITH THESE ---
  useEffect(() => {
    // If no project is active, use the global chat storage
    const storageKey = activeProjectId ? `astra_chat_${activeProjectId}` : 'astra_chat_global';
    const savedChat = localStorage.getItem(storageKey);
    if (savedChat) setChatMessages(JSON.parse(savedChat));
    else setChatMessages([]);
  }, [activeProjectId]);

  useEffect(() => {
    const storageKey = activeProjectId ? `astra_chat_${activeProjectId}` : 'astra_chat_global';
    if (chatMessages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(chatMessages));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [chatMessages, activeProjectId]);

  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear the AI conversation history?")) {
      setChatMessages([]);
      const storageKey = activeProjectId ? `astra_chat_${activeProjectId}` : 'astra_chat_global';
      localStorage.removeItem(storageKey);
    }
  };

  // --- NEW: SMOOTH TEXTAREA AUTO-RESIZE ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset first
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`; // Max height 200px
    }
  }, [chatInput]);

  const handleDeleteMessage = (index: number) => {
    setChatMessages(prev => {
      const newChat = [...prev];
      newChat.splice(index, 2); 
      return newChat;
    });
  };

  useEffect(() => {
    if (session) fetchProjects();
  }, [session]);

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      let url = '';
      if (itemToDelete.type === 'project') url = `/api/projects/${itemToDelete.id}`;
      else if (itemToDelete.type === 'document') url = `/api/documents/${itemToDelete.id}`;
      else if (itemToDelete.type === 'survey') url = `/api/surveys/${itemToDelete.id}`;
      else if (itemToDelete.type === 'report') url = `/api/reports/${itemToDelete.id}`; // <-- ADD THIS LINE

      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        if (itemToDelete.type === 'project' && activeProjectId === itemToDelete.id) {
          setActiveProjectId(null);
          setActiveDocumentId(null);
          setActiveSurveyId(null);
          setViewMode('home');
        } else if (itemToDelete.type === 'document' && activeDocumentId === itemToDelete.id) {
          setActiveDocumentId(null);
        } else if (itemToDelete.type === 'survey' && activeSurveyId === itemToDelete.id) {
          setActiveSurveyId(null);
          setViewMode('surveys');
        }
        setItemToDelete(null);
        fetchProjects();
      }
    } catch (e) {
      setErrorMessage("Network error during deletion.");
    }
  };

const handleSendAiMessage = async (overrideText?: string) => {
    const userMsg = overrideText ? overrideText.trim() : chatInput.trim();
    
    // REMOVED !activeProjectId from the block!
    if (!userMsg || aiLoadingText) return;

    if (!overrideText) setChatInput(""); 
    
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }, { role: 'ai', content: '' }]);
    setAiLoadingText("Analyzing request...");
    
    const newBubbleIndex = chatMessages.length + 1; 

    const messagesToSend = [...chatMessages, { role: 'user' as const, content: userMsg }]
      .map(msg => ({ role: msg.role === 'ai' ? 'assistant' : msg.role, content: String(msg.content).trim() }))
      .filter(msg => msg.content !== "");

    const streamRequest = async (apiMessages: any[], updateIndex: number) => {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, projectId: activeProjectId || null, currentView: viewMode })
      });

      if (!res.ok) throw new Error("API rejected the request");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let aiText = ''; 
      let isActionPhase = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; 

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.replace(/^data:\s*/, '').trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const textChunk = parsed.choices[0]?.delta?.content || '';
              if (textChunk) {
                aiText += textChunk; 
                let isActionPhase = aiText.includes('~~~ACTION:'); 

                setChatMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[updateIndex] = { role: 'ai', content: aiText, isActing: isActionPhase };
                  return newMessages;
                });
              }
            } catch (e) {}
          }
        }
      }
      return aiText;
    };
    
    try {
      const firstAiText = await streamRequest(messagesToSend, newBubbleIndex);

      if (firstAiText.includes('~~~ACTION:')) {
        const actionJson = JSON.parse(firstAiText.split('~~~ACTION:')[1].split('~~~')[0]);
        
        if (actionJson.type === "ADD_REF") {
          setAgentAction(actionJson.data);
          setViewMode('references'); 
        } 
        else if (actionJson.type === "GENERATE_SURVEY") {
          if (viewMode === 'survey-builder' && activeSurveyId) {
            setSurveyAction(actionJson);
          } else {
            setErrorMessage("Please open a survey draft first to use the AI Builder.");
          }
        }
        else if (actionJson.type === "CODE_DOCUMENT" || actionJson.type === "UNCODE_DOCUMENT") {
          const targetDoc = projects.flatMap(p => p.documents).find(d => 
            d.title.toLowerCase().includes(actionJson.data.documentTitle.toLowerCase())
          );

          if (targetDoc) {
            setAiLoadingText(`Applying changes...`); 
            setActiveDocumentId(targetDoc.id);
            setViewMode('editor');
            setEditorAction({ type: actionJson.type, ...actionJson.data }); 
          } else {
            setErrorMessage(`Could not find a document named "${actionJson.data.documentTitle}"`);
          }
        }
      } else {
        const lowerText = firstAiText.toLowerCase();
        if (lowerText.includes("fetch") || lowerText.includes("locate") || lowerText.includes("hold on")) {
           setErrorMessage("Astra got confused and forgot to trigger the fetch action. Please click send again.");
        }
      }
    } catch (e: any) {
      setErrorMessage("AI connection lost.");
      setChatMessages(prev => prev.slice(0, -1)); 
    } finally {
      setAiLoadingText(null); 
    }
  };

  if (status === "loading" || !bootReady) {
    return <AstraLoader />;
  }

  if (!session) return <WelcomeScreen />;

  const activeDocument = projects.flatMap(p => p.documents).find(d => d.id === activeDocumentId);
  const activeProject = projects.find(p => p.id === activeProjectId);

  const getLastActiveItem = () => {
    let lastItem: any = null;
    let maxTime = 0;

    projects.forEach(p => {
      const pTime = new Date(p.updatedAt || p.createdAt).getTime();
      if (pTime > maxTime) { maxTime = pTime; lastItem = { type: 'Project', title: p.name, projectId: p.id, view: 'project' }; }

      p.documents?.forEach((d: any) => {
        const dTime = new Date(d.updatedAt || d.createdAt).getTime();
        if (dTime > maxTime) { maxTime = dTime; lastItem = { type: 'Document', title: d.title, projectId: p.id, view: 'editor', docId: d.id }; }
      });

      p.reports?.forEach((r: any) => {
        const rTime = new Date(r.updatedAt || r.createdAt).getTime();
        if (rTime > maxTime) { maxTime = rTime; lastItem = { type: 'Draft', title: r.title || 'Untitled Draft', projectId: p.id, view: 'report' }; }
      });
      
      // FIXED: Now we check Surveys too!
      p.surveys?.forEach((s: any) => {
        const sTime = new Date(s.updatedAt || s.createdAt).getTime();
        if (sTime > maxTime) { maxTime = sTime; lastItem = { type: 'Survey', title: s.title || 'Untitled Survey', projectId: p.id, view: 'surveys', surveyId: s.id }; }
      });
    });

    return lastItem;
  };
  const lastActive = getLastActiveItem();

  // The card illustration reflects the project's actual research type (the client
  // asked what drives it): surveys + documents → Mixed Methods; surveys only →
  // Quantitative; documents/interviews only → Qualitative.
  const archetypeFor = (p: any) => {
    const hasSurveys = (p.surveys?.length || 0) > 0;
    const hasDocs = (p.documents?.length || 0) > 0;
    if (hasSurveys && hasDocs) return PROJECT_ARCHETYPES[1]; // MIXED METHODS
    if (hasSurveys) return PROJECT_ARCHETYPES[2];            // QUANTITATIVE
    return PROJECT_ARCHETYPES[0];                            // QUALITATIVE
  };

  // Resume the most-recently-touched item (used by the sidebar "Astra Remembers" card)
  const handleResume = () => {
    if (!lastActive) return;
    setActiveProjectId(lastActive.projectId);
    setViewMode(lastActive.view);
    if (lastActive.docId) setActiveDocumentId(lastActive.docId);
    if (lastActive.surveyId) setActiveSurveyId(lastActive.surveyId);
  };

  return (
    <div className="flex h-screen overflow-hidden astra-canvas font-sans text-ink">
      
      {errorMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl z-[300] flex items-center gap-4 animate-in slide-in-from-top-4 fade-in">
          <span className="text-sm font-medium">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-white/80 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-astra-dark/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-[24px] shadow-2xl w-full max-w-sm p-8 border border-astra-border text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5 text-red-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </div>
            <h3 className="text-[20px] font-bold text-ink mb-2">Delete {itemToDelete.type === 'project' ? 'Project' : itemToDelete.type === 'survey' ? 'Survey' : 'Source'}?</h3>
            <p className="text-[14px] text-muted mb-6">
              Are you sure you want to delete <span className="font-bold text-ink">"{itemToDelete.name}"</span>? 
            </p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setItemToDelete(null)} className="flex-1 px-4 py-3 rounded-[14px] font-semibold bg-canvas text-muted hover:bg-[#E5DBFF] dark:hover:bg-white/[0.07] transition-colors">Cancel</button>
              <button onClick={executeDelete} className="flex-1 px-4 py-3 rounded-[14px] font-semibold bg-[#EF4444] text-white hover:bg-red-600 transition-colors shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      {isCreatingProject && (
        <div className="fixed inset-0 bg-[#1c1840]/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-[24px] shadow-2xl w-full max-w-sm p-8 border border-line">
            <h3 className="text-[20px] font-bold text-ink mb-4">Create New Project</h3>
            <input 
              autoFocus 
              disabled={isProjectLoading} 
              type="text" 
              placeholder="Project name..." 
              className="w-full bg-canvas border border-line rounded-[14px] px-5 py-3.5 text-[14px] outline-none focus:border-accent mb-6 text-ink" 
              value={newProjectName} 
              onChange={e => setNewProjectName(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleCreateProject()} 
            />
            <div className="flex gap-3">
              <button onClick={() => { setIsCreatingProject(false); setNewProjectName(""); }} className="flex-1 px-4 py-3 rounded-[14px] text-muted font-semibold hover:bg-canvas transition-colors">Cancel</button>
              <button onClick={handleCreateProject} disabled={isProjectLoading} className="flex-1 px-4 py-3 rounded-[14px] bg-accent text-white font-semibold hover:bg-[#4c1d95] transition-colors disabled:opacity-50 shadow-sm flex justify-center">
                {isProjectLoading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME PROJECT MODAL */}
      {renamingProject && (
        <div className="fixed inset-0 bg-[#1c1840]/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-[24px] shadow-2xl w-full max-w-sm p-8 border border-line">
            <h3 className="text-[20px] font-bold text-ink mb-4">Edit project name</h3>
            <input
              autoFocus
              type="text"
              placeholder="Project name…"
              className="w-full bg-canvas border border-line rounded-[14px] px-5 py-3.5 text-[14px] outline-none focus:border-accent mb-6 text-ink"
              value={renamingProject.name}
              onChange={e => setRenamingProject({ ...renamingProject, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleRenameProject()}
            />
            <div className="flex gap-3">
              <button onClick={() => setRenamingProject(null)} className="flex-1 px-4 py-3 rounded-[14px] text-muted font-semibold hover:bg-canvas transition-colors">Cancel</button>
              <button onClick={handleRenameProject} className="flex-1 px-4 py-3 rounded-[14px] bg-accent text-white font-semibold hover:bg-accent-press transition-colors shadow-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#1c1840] text-white fixed w-full z-20 shadow-md">
        <span className="font-extrabold text-xl tracking-tight">Astra</span>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl">☰</button>
      </div>

      <Sidebar 
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        activeDocumentId={activeDocumentId}
        setActiveDocumentId={setActiveDocumentId}
        activeReportId={activeReportId}       // <-- NEW PROP
        setActiveReportId={setActiveReportId} // <-- NEW PROP
        viewMode={viewMode}
        setViewMode={setViewMode}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setItemToDelete={setItemToDelete}
        setErrorMessage={setErrorMessage}
        onRefresh={fetchProjects}
        lastActive={lastActive}
        setIsAiSidebarOpen={setIsAiSidebarOpen}
        dashboardSummary={dashboardSummary}
        onResume={handleResume}
      />

      {/* MAIN CONTENT CANVAS */}
      {/* thin branded progress bar — replays on every view navigation */}
      <div key={`nav-${viewMode}-${activeProjectId ?? ''}-${activeDocumentId ?? ''}`} className="astra-topbar" />

      <main key={viewMode} className={`flex-1 flex flex-col h-full pt-16 lg:pt-0 astra-canvas transition-all duration-300 ease-in-out animate-rise ${isAiSidebarOpen ? 'lg:mr-[400px]' : ''}`}>
        
        {/* --- DYNAMIC VIEW RENDERING --- */}
        {viewMode === 'home' ? (
          <div className="flex-1 overflow-y-auto flex flex-col">

            {/* "Astra Remembers" now lives in the sidebar (compact card) per the redesign spec. */}

            <HomeDashboard
              projects={projects} 
              session={session} 
              onNavigate={(projectId, view, docId) => {
                setActiveProjectId(projectId);
                setViewMode(view);
                if (docId) setActiveDocumentId(docId);
                else setActiveDocumentId(null);
              }} 
              onRefresh={fetchProjects} 
            />
          </div>       

        ) : viewMode === 'home-projects' ? (
  <div className="flex-1 overflow-y-auto p-8 astra-canvas font-sans text-ink">
    <style dangerouslySetInnerHTML={{__html: `
    `}} />

    <div className="max-w-[1240px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* OBSERVATORY SKY HERO */}
      <div className="astra-sky rounded-[24px] mb-9 shrink-0 shadow-[0_30px_70px_-42px_rgba(30,18,80,.5)]">
        <div className="absolute inset-0 z-0"><Constellation variant="ambient" density={54} /></div>
        <div className="relative z-[2] p-8 lg:p-10">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: '#b8a9ff' }}>
            <span>Projects</span><span className="opacity-50">/</span><span className="text-white/90">All projects</span>
          </div>
          <h1 className="font-editorial text-[2.4rem] lg:text-[3rem] mt-3" style={{ color: '#fff' }}>All projects</h1>
          <p className="sky-muted text-[15px] mt-2 font-medium">Everything in your workspace — yours and shared.</p>
        </div>
      </div>

      {/* SEARCH + NEW PROJECT (one row, no unnatural gap) + FILTERS */}
      <div className="flex flex-col gap-4 mb-10">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <svg className="w-4 h-4 text-faint" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search projects, documents, codes..."
              className="w-full bg-surface border border-line rounded-xl pl-11 pr-4 py-3 text-[14px] outline-none focus:border-accent focus:ring-4 focus:ring-[#5b21b6]/12 text-ink placeholder-faint transition-all"
            />
          </div>

          <button
            onClick={() => setIsCreatingProject(true)}
            className="bg-accent hover:bg-accent-press text-white px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-[0_8px_20px_-6px_rgba(91,33,182,0.5)] shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New project
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <div className="flex items-center gap-1.5 bg-surface border border-line px-3 py-1.5 rounded-lg font-medium text-muted cursor-pointer hover:border-[#c9b8f5] transition-colors">
            <span>Type:</span> <span className="text-ink font-semibold">All</span>
            <svg className="w-3 h-3 text-faint" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div className="flex items-center gap-1.5 bg-surface border border-line px-3 py-1.5 rounded-lg font-medium text-muted cursor-pointer hover:border-[#c9b8f5] transition-colors">
            <span>Status:</span> <span className="text-accent font-semibold">Active</span>
            <svg className="w-3 h-3 text-faint" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div className="flex items-center gap-1.5 bg-surface border border-line px-3 py-1.5 rounded-lg font-medium text-muted cursor-pointer hover:border-[#c9b8f5] transition-colors">
            <span className="text-ink font-semibold">Date modified</span>
            <svg className="w-3 h-3 text-faint" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {/* --- RECENT SECTION --- */}
      {projects.length > 0 && (
        <div className="mb-12">
          <h2 className="text-[15px] font-bold text-ink uppercase tracking-wider mb-5 flex items-center gap-2">
            Recents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {projects.slice(0, 4).map((p, idx) => {
              const style = archetypeFor(p);
              const docCount = p.documents?.length || 0;
              const totalCodes = p.documents?.reduce((acc: number, d: any) => acc + (d.highlights?.reduce((hAcc: number, h: any) => hAcc + (h.codes?.length || 0), 0) || 0), 0) || 0;
              return (
                <ProjectCard
                  key={`recent-${p.id}`}
                  name={p.name}
                  when={`Edited ${new Date(p.updatedAt || p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                  docCount={docCount}
                  totalCodes={totalCodes}
                  style={style}
                  onClick={() => { setActiveProjectId(p.id); setViewMode('project'); setActiveDocumentId(null); }}
                  onDelete={() => setItemToDelete({ type: 'project', id: p.id, name: p.name })}
                  onRename={() => setRenamingProject({ id: p.id, name: p.name })}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* --- ALL OWNED WORKSPACES GRID (same card format as Recents) --- */}
      <div>
        <h2 className="text-[15px] font-bold text-ink uppercase tracking-wider mb-5 flex items-center gap-2">
          Your projects <span className="bg-[#ede4ff] dark:bg-white/[0.08] text-accent px-2 py-0.5 rounded-full text-[11px] font-extrabold">{projects.length}</span>
        </h2>

        {projects.length === 0 ? (
          <div className="py-16 text-center text-faint bg-surface rounded-[24px] border border-line border-dashed">
            No active research workspaces initialized yet. Create a project to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {projects.map((p, idx) => {
              const style = archetypeFor(p);
              const docCount = p.documents?.length || 0;
              const totalCodes = p.documents?.reduce((acc: number, d: any) => acc + (d.highlights?.reduce((hAcc: number, h: any) => hAcc + (h.codes?.length || 0), 0) || 0), 0) || 0;
              return (
                <ProjectCard
                  key={p.id}
                  name={p.name}
                  when={`Updated ${new Date(p.updatedAt || p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                  docCount={docCount}
                  totalCodes={totalCodes}
                  style={style}
                  onClick={() => { setActiveProjectId(p.id); setViewMode('project'); setActiveDocumentId(null); }}
                  onDelete={() => setItemToDelete({ type: 'project', id: p.id, name: p.name })}
                  onRename={() => setRenamingProject({ id: p.id, name: p.name })}
                />
              );
            })}
          </div>
        )}
      </div>

    </div>
  </div>
) : viewMode === 'home-library' ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-8 astra-canvas animate-in fade-in">
             <div className="w-16 h-16 bg-[#f0eaff] dark:bg-white/[0.06] rounded-2xl flex items-center justify-center mb-4 border border-line shadow-sm text-accent"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div>
             <h2 className="text-[20px] font-bold text-ink mb-2">Global Library</h2>
             <p className="text-muted text-[14px] max-w-sm">All your references and documents across all projects will appear here.</p>
           </div>
           
        ) : viewMode === 'home-settings' ? (
           <SettingsPage />
        ) : viewMode === 'home-profile' ? (
           <ProfilePage />
        ) : viewMode === 'surveys' ? (
          <div className="flex-1 overflow-y-auto astra-canvas">
             <SurveyDashboard
               projects={activeProjectId ? [activeProject] : projects}
               onNavigate={(surveyId, view) => {
                 setActiveSurveyId(surveyId);
                 setViewMode(view);
               }}
               onRefresh={fetchProjects}
               onBack={activeProjectId ? () => setViewMode('project') : undefined}
             />
          </div>
        ) : viewMode === 'survey-builder' && activeSurveyId ? (
          <div className="flex-1 overflow-y-auto astra-canvas">
             <SurveyBuilder 
               surveyId={activeSurveyId} 
               onBack={() => setViewMode('surveys')} 
               aiActionData={surveyAction}
               clearAiAction={() => setSurveyAction(null)}
             />
          </div>
        ) : viewMode === 'survey-analytics' && activeSurveyId ? (
          <div className="flex-1 overflow-y-auto astra-canvas">
             <SurveyAnalytics surveyId={activeSurveyId} onBack={() => setViewMode('surveys')} />
          </div>
        ) : viewMode === 'project' && activeProject ? (
          <div className="flex-1 overflow-y-auto">
            <ProjectOverview 
  project={activeProject} 
  onNavigate={(view, targetId) => {
    setViewMode(view); // Switches viewMode to 'editor', 'web', or 'report'
    
    if (targetId) {
      if (view === 'report') {
        setActiveReportId(targetId); // Routes to your ReportEditor instance
      } else {
        setActiveDocumentId(targetId); // Routes to your standard document editor
      }
    }
  }} 
  onBack={() => setViewMode('home')}
  onRefresh={fetchProjects} 
/>
          </div>
        ) : viewMode === 'references' && activeProjectId ? (
          <ReferenceManager
            projectId={activeProjectId}
            agentAction={agentAction}
            clearAgentAction={() => setAgentAction(null)}
            onAiToggle={setIsAiSidebarOpen}
            onBack={() => setViewMode('project')}
          />
        ) : viewMode === 'codebook' && activeProjectId ? (
          <>
            <header className="astra-sky px-8 h-[100px] flex justify-between items-center z-10 shrink-0"><div className="flex items-center gap-3.5"><button onClick={() => setViewMode('project')} title="Back to project" className="w-9 h-9 grid place-items-center rounded-lg text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg></button><div className="flex flex-col"><span className="text-xs font-bold uppercase tracking-widest text-[#b8a9ff]">{activeProject?.name}</span><h1 className="text-[22px] font-bold text-white mt-0.5">Codebook Manager</h1></div></div></header>
            <div className="flex-1 overflow-y-auto astra-canvas"><CodebookManager projectId={activeProjectId} /></div>
          </>
        ) : viewMode === 'web' && activeProjectId ? (
          <>
            <header className="astra-sky px-8 h-[100px] flex justify-between items-center z-10 shrink-0"><div className="flex items-center gap-3.5"><button onClick={() => setViewMode('project')} title="Back to project" className="w-9 h-9 grid place-items-center rounded-lg text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg></button><div className="flex flex-col"><span className="text-xs font-bold uppercase tracking-widest text-[#b8a9ff]">{activeProject?.name}</span><h1 className="text-[22px] font-bold text-white mt-0.5">Cross-Source Idea Web</h1></div></div></header>
            <div className="flex-1 min-h-0 p-3 lg:p-5"><ProjectWeb projectId={activeProjectId} /></div>
          </>
        ) : viewMode === 'report' && activeProjectId && activeReportId ? (
          <>
            <header className="astra-sky px-8 h-[100px] flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-3.5">
                <button onClick={() => setViewMode('project')} title="Back to project" className="w-9 h-9 grid place-items-center rounded-lg text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg></button>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#b8a9ff]">{activeProject?.name}</span>
                  <h1 className="text-[22px] font-bold text-white mt-0.5">
                    {activeProject?.reports?.find((r: any) => r.id === activeReportId)?.title || "Research Report Writer"}
                  </h1>
                </div>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto astra-canvas relative custom-scrollbar">
              <ReportEditor projectId={activeProjectId} reportId={activeReportId} />
            </div>
          </>

        ) : activeDocument ? (
          <>
            <header className="astra-sky px-8 h-[100px] flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-3.5"><button onClick={() => setViewMode('project')} title="Back to project" className="w-9 h-9 grid place-items-center rounded-lg text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg></button><div className="flex flex-col"><span className="text-xs font-bold uppercase tracking-widest text-[#b8a9ff]">{activeProject?.name}</span><h1 className="text-[22px] font-bold text-white mt-0.5">{activeDocument.title}</h1></div></div>
              <span className="text-[12px] bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-300 px-3 py-1.5 rounded-full font-bold uppercase tracking-widest">Auto-Saved</span>
            </header>
            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
              <DocumentEditor key={activeDocument.id} documentId={activeDocument.id} initialText={activeDocument.content} editorAction={editorAction} clearEditorAction={() => setEditorAction(null)} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 astra-canvas">
            <div className="w-16 h-16 bg-[#f0eaff] dark:bg-white/[0.06] rounded-2xl flex items-center justify-center mb-4 border border-line shadow-sm text-accent"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>
            <h2 className="text-[20px] font-bold text-ink mb-2">No Tool Selected</h2>
            <p className="text-muted text-[14px] max-w-sm">Create a new project in the sidebar, or select an existing tool to begin.</p>
          </div>
        )}
      </main>

      {/* FLOATING AI TOGGLE — docked to the right edge */}
      <button
        onClick={() => setIsAiSidebarOpen(true)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 bg-accent text-white p-3 rounded-l-2xl shadow-[-6px_0_22px_rgba(30,18,80,0.28)] z-40 flex flex-col items-center gap-3 hover:bg-accent-press transition-all duration-300 ${isAiSidebarOpen ? 'translate-x-full' : 'translate-x-0'}`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.4 4.4 2.6 6.6 7 7-4.4.4-6.6 2.6-7 7-.4-4.4-2.6-6.6-7-7 4.4-.4 6.6-2.6 7-7z" /></svg>
        <span className="[writing-mode:vertical-lr] text-[11px] font-bold tracking-widest uppercase rotate-180">Astra AI</span>
      </button>

      {/* RIGHT SIDEBAR: RESEARCH AI */}
      <aside className={`fixed right-0 top-0 h-full w-full sm:w-[400px] bg-canvas border-l border-line shadow-[-10px_0_40px_rgba(35,25,66,0.1)] z-50 flex flex-col transition-transform duration-300 ease-in-out ${isAiSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="p-5 border-b border-line flex items-center justify-between bg-canvas sticky top-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsAiSidebarOpen(false)} className="p-1.5 bg-surface rounded-lg border border-line text-muted hover:text-ink hover:border-[#8B5CF6] transition-colors" title="Close AI">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
            </button>
            <span className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-75 ${aiLoadingText ? 'animate-ping' : ''}`}></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#5B21B6]"></span>
            </span>
            <span className="font-bold text-[13px] tracking-widest text-ink uppercase font-editorial">Astra Intelligence</span>
          </div>
          {chatMessages.length > 0 && (
            <button onClick={handleClearChat} className="text-faint hover:text-[#EC4899] transition-colors p-1" title="Clear Chat History">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>

        <div className="flex-1 p-5 overflow-y-auto bg-surface flex flex-col gap-5 custom-scrollbar">
          {chatMessages.length === 0 && (
            <div className="text-[13px] p-5 rounded-[18px] border border-line bg-canvas text-muted leading-relaxed shadow-sm">
              <span className="font-semibold text-accent block mb-2">Welcome to Astra AI.</span>
              I can analyze your highlights, find contradictions, or format citations. Try asking me to summarize a theme!
            </div>
          )}
          
          {chatMessages.map((msg, idx) => {
            let displayText = msg.content;
            let uiType = "";
            let uiOptions: string[] = [];
            let uiSuggestions: any[] = [];
            let uiDocTitle = "";
            
            // 1. Parse JSON blocks if they exist
            if (msg.content.includes('~~~UI:')) {
              const uiPart = msg.content.split('~~~UI:')[1];
              if (uiPart.includes('~~~')) {
                try {
                  const uiJson = JSON.parse(uiPart.split('~~~')[0]);
                  uiType = uiJson.type || "buttons"; 
                  
                  if (uiType === "buttons" && uiJson.options) {
                    uiOptions = uiJson.options;
                  } else if (uiType === "suggest_codes" && uiJson.suggestions) {
                    uiSuggestions = uiJson.suggestions;
                    uiDocTitle = uiJson.documentTitle;
                  }
                } catch(e) { }
              }
            }

            // --- THE NEW VISUAL FILTER LOGIC ---
            // If the message contains a full block, perfectly slice it off
            const blockIndex = displayText.indexOf('~~~');
            if (blockIndex !== -1) {
              displayText = displayText.substring(0, blockIndex);
            } else {
              // Smoothly hide partial tildes while the AI is typing them out
              if (displayText.endsWith('~~')) displayText = displayText.slice(0, -2);
              else if (displayText.endsWith('~')) displayText = displayText.slice(0, -1);
            }

            // Cleanup Action Text
            if (msg.isActing && !displayText.trim()) displayText = "Action completed successfully.";
            
            // ... return ( <div key={idx} ...

            return (
              <div key={idx} className={`group relative flex flex-col gap-2 ${msg.role === 'user' ? 'ml-auto max-w-[85%]' : 'mr-auto max-w-[95%]'}`}>
                
                {msg.role === 'user' && !aiLoadingText && (
                  <button onClick={() => handleDeleteMessage(idx)} className="absolute -left-8 top-2 text-[#E5DBFF] hover:text-[#EC4899] opacity-0 group-hover:opacity-100 transition-all p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}

                {(displayText.trim() || msg.role === 'user') && (
                  <div className={`p-4 rounded-[20px] text-[14px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-accent text-white rounded-tr-sm' : 'bg-canvas text-ink rounded-tl-sm border border-line'}`}>
                    {msg.role === 'user' ? (
                      <span className="whitespace-pre-wrap">{displayText}</span>
                    ) : (
                      <div className="prose prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0 max-w-none text-ink">
                        <ReactMarkdown>{displayText}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}

                {uiType === "buttons" && uiOptions.length > 0 && idx === chatMessages.length - 1 && !aiLoadingText && (
                  <div className="flex flex-wrap gap-2 mt-1 animate-in fade-in slide-in-from-top-2">
                    {uiOptions.map((opt, i) => (
                      <button key={i} onClick={(e) => { e.preventDefault(); handleSendAiMessage(opt); }} className="bg-surface border border-[#D9CCFF] text-accent hover:bg-[#F2EEFF] dark:hover:bg-white/[0.07] hover:border-[#8B5CF6] text-[12px] font-bold px-3 py-1.5 rounded-full transition-all shadow-sm">
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {uiType === "suggest_codes" && uiSuggestions.length > 0 && idx === chatMessages.length - 1 && !aiLoadingText && (
                  <ChecklistUI 
                    suggestions={uiSuggestions} 
                    documentTitle={uiDocTitle} 
                    onApply={async (selected) => {
                      const targetDoc = projects.flatMap(p => p.documents).find(d => d.title.toLowerCase().includes(uiDocTitle.toLowerCase()));
                      if (targetDoc) {
                        setActiveDocumentId(targetDoc.id);
                        setViewMode('editor');
                      }
                      setEditorAction({ type: 'BATCH_CODE', documentTitle: uiDocTitle, highlights: selected });
                      setChatMessages(prev => [...prev, 
                        { role: 'user', content: `Apply these ${selected.length} codes.` },
                        { role: 'ai', content: `Successfully applied ${selected.length} codes to the document!`, isActing: true }
                      ]);
                    }} 
                  />
                )}
                
                {msg.isActing && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-accent bg-[#F2EEFF] px-3 py-1.5 rounded-full shadow-sm w-max border border-line mt-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                    Action Applied
                  </div>
                )}
              </div>
            );
          })}

          {aiLoadingText && (
            <div className="bg-canvas text-muted text-[12px] font-semibold px-4 py-3 rounded-[16px] mr-auto border border-line shadow-sm flex items-center gap-3 rounded-tl-sm animate-in fade-in">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
              {aiLoadingText}
            </div>
          )}
          <div ref={chatEndRef} /> 
        </div>

        <div className="p-4 border-t border-line bg-canvas">
          <div className="relative flex items-end shadow-sm rounded-[16px] bg-surface border border-line focus-within:border-[#8B5CF6] focus-within:ring-2 focus-within:ring-[#8B5CF6]/20 transition-all">
            <textarea 
              rows={1}
              // 1. DYNAMIC PLACEHOLDER: Changes based on whether you are in a project or the global dashboard
              placeholder={activeProjectId ? "Ask AI about this project..." : "Ask AI about your workspace..."} 
              // 2. DYNAMIC HEIGHT: Added overflow-y-auto and increased max-height so it scrolls nicely for long prompts
              className="w-full bg-transparent pl-4 pr-12 py-3.5 text-[14px] outline-none resize-none text-ink placeholder-[#A29ABB] max-h-[200px] overflow-y-auto custom-scrollbar"
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                // 3. SMOOTH RESIZE: Resets to auto, then snaps to the scroll height (up to 200px max)
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendAiMessage();
                  e.currentTarget.style.height = 'auto'; 
                }
              }}
            />
            <button 
              onClick={(e) => {
                handleSendAiMessage();
                const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                if(textarea) textarea.style.height = 'auto';
              }}
              disabled={!!aiLoadingText || !chatInput.trim()}
              className="absolute right-2 bottom-2 p-2 bg-accent text-white rounded-xl disabled:bg-gray-200 dark:disabled:bg-white/10 disabled:text-faint transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

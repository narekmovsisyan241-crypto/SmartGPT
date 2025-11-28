import React, { useState, useEffect, useRef } from 'react';
import { FuturisticBackground } from './components/FuturisticBackground';
import { GeminiService } from './services/geminiService';
import { ChatMessage, ChatSession, Persona, User } from './types';
import { ThreeDLogo } from './components/ThreeDLogo';
import { LiveSession } from './components/LiveSession';
import { SmartLogo, BizLogo, EduLogo } from './components/PersonaLogos';
import { 
    Send, Image as ImageIcon, StopCircle, 
    Trash2, Copy, Search, ShieldCheck, 
    MessageSquare, Box, Monitor, BookOpen,
    Zap, Mic, Cpu, RefreshCw, X, Menu,
    User as UserIcon
} from 'lucide-react';

const gemini = new GeminiService();

export default function App(: JSX.Element) {
    // State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [currentPersona, setCurrentPersona] = useState<Persona>(Persona.SmartGPT);
    const [input, setInput] = useState('');
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [showLive, setShowLive] = useState(false);
    
    // Config toggles
    const [imgSize, setImgSize] = useState<'1K'|'2K'|'4K'>('1K');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [showHistory, setShowHistory] = useState(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Initial Load
    useEffect(() => {
        const savedSessions = localStorage.getItem('smartgpt_sessions');
        if (savedSessions) {
            setSessions(JSON.parse(savedSessions));
        } else {
            createNewSession();
        }
    }, []);

    // Scroll to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [sessions, currentSessionId, isThinking]);

    const getCurrentSession = () => sessions.find(s => s.id === currentSessionId);

    const createNewSession = () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: `LOG_${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}`,
            messages: [{
                id: 'init',
                role: 'model',
                text: `SYSTEM ONLINE.\nPERSONA: ${currentPersona.toUpperCase()}\nAWAITING INPUT...`,
                timestamp: Date.now()
            }],
            persona: currentPersona,
            lastUpdated: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setShowHistory(false);
    };

        localStorage.setItem('smartgpt_sessions', JSON.stringify([newSession, ...sessions]));
    
    const handleLogin = () => {
        setIsLoggedIn(true);
        setUser({
            name: "CMDR. USER",
            email: "user@smartgpt.net",
            picture: "https://api.dicebear.com/7.x/bottts/svg?seed=SmartGPT"
        });
    };

    const handleDeleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updated = sessions.filter(s => s.id !== id);
        setSessions(updated);
        localStorage.setItem('smartgpt_sessions', JSON.stringify(updated));
        if (currentSessionId === id && updated.length > 0) {
            setCurrentSessionId(updated[0].id);
        } else if (updated.length === 0) {
            createNewSession();
        }
    }

    const handlePurgeAll = () => {
        if(window.confirm("WARNING: INITIATING FULL SYSTEM PURGE. ALL DATA WILL BE LOST. CONFIRM?")) {
            setSessions([]);
            localStorage.removeItem('smartgpt_sessions');
            createNewSession();
        }
    };

    const handleStop = () => {
        setIsThinking(false);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleSendMessage = async () => {
        if ((!input.trim() && mediaFiles.length === 0) || !currentSessionId) return;

        const sessionIndex = sessions.findIndex(s => s.id === currentSessionId);
        if (sessionIndex === -1) return;

        const newUserMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: Date.now()
        };

        const updatedSessions = [...sessions];
        updatedSessions[sessionIndex].messages.push(newUserMsg);
        updatedSessions[sessionIndex].lastUpdated = Date.now();
        setSessions(updatedSessions);
        setInput('');
        setMediaFiles([]);
        setIsThinking(true);

        try {
            let responseText = '';
            let imageUrl = '';
            let groundingUrls: any[] = [];
            
            // Auto-detect intent
            const lowerInput = newUserMsg.text?.toLowerCase() || "";
            const isImageRequest = lowerInput.match(/generate.*image|draw|paint|create.*image/);

            if (isImageRequest) {
                // Image Mode
                const prompt = lowerInput.replace(/generate.*image|draw|paint|create.*image/gi, '').trim();
                imageUrl = await gemini.generateImage(prompt || "abstract art", imgSize, aspectRatio);
                responseText = "VISUAL ASSET RENDERED.";
            } else {
                // Standard Chat
                const result = await gemini.generateMessage(
                    newUserMsg.text || "",
                    updatedSessions[sessionIndex].messages,
                    { persona: currentPersona, imageSize: imgSize, aspectRatio }
                );
                responseText = result.text;
                groundingUrls = result.groundingUrls;
            }

            const newAiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText,
                image: imageUrl,
                timestamp: Date.now(),
                groundingUrls
            };

            setSessions(prev => {
                const newSess = [...prev];
                const idx = newSess.findIndex(s => s.id === currentSessionId);
                if (idx !== -1) {
                    newSess[idx].messages.push(newAiMsg);
                    if (newSess[idx].messages.length === 3) {
                        newSess[idx].title = (newUserMsg.text?.slice(0, 20) || "LOG") + "...";
                    }
                }
                localStorage.setItem('smartgpt_sessions', JSON.stringify(newSess));
                return newSess;
            });

        } catch (error: any) {
            console.error(error);
            let errorText = "CRITICAL ERROR: UPLINK FAILED.";
            
            // Check for API Key selection error
            if (error.message?.includes("Requested entity was not found") || error.toString().includes("Requested entity was not found")) {
                if ((window as any).aistudio) {
                    try {
                        await (window as any).aistudio.openSelectKey();
                        errorText = "SYSTEM ALERT: PAID API KEY REQUIRED FOR THIS ACTION. KEY SELECTION OPENED. PLEASE RETRY.";
                    } catch (e) {
                        console.error("Failed to open key selector", e);
                    }
                } else {
                    errorText = "SYSTEM ALERT: API KEY NOT AUTHORIZED FOR THIS MODEL. PLEASE CHECK SETTINGS.";
                }
            } else {
                errorText = `ERROR: ${error.message || "UNKNOWN SYSTEM FAILURE"}`;
            }

             const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: errorText,
                timestamp: Date.now()
            };
            setSessions(prev => {
                const newSess = [...prev];
                const idx = newSess.findIndex(s => s.id === currentSessionId);
                if (idx !== -1) newSess[idx].messages.push(errorMsg);
                return newSess;
            });
        } finally {
            setIsThinking(false);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="relative w-full h-screen flex items-center justify-center text-white overflow-hidden font-rajdhani">
                <FuturisticBackground />
                <div className="relative bg-black/40 backdrop-blur-2xl p-12 rounded-3xl border border-white/10 shadow-[0_0_80px_rgba(0,243,255,0.15)] max-w-lg w-full text-center z-10 animate-float">
                    <div className="mb-10 flex justify-center scale-150">
                        <ThreeDLogo />
                    </div>
                    <h1 className="text-7xl font-black mb-4 tracking-tighter font-orbitron text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                        SMART<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">GPT</span>
                    </h1>
                    <p className="text-cyan-200/70 mb-12 text-lg tracking-[0.3em] font-light">NEXT_GEN INTELLIGENCE</p>
                    
                    <button 
                        onClick={handleLogin}
                        className="group relative w-full bg-white/5 hover:bg-white/10 border border-white/20 hover:border-cyan-400 py-5 rounded-xl uppercase font-bold tracking-widest transition-all overflow-hidden duration-300"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative flex items-center justify-center gap-4 text-sm group-hover:scale-105 transition-transform">
                            <i className="fab fa-google text-lg"></i>
                            Initialize Neural Link
                        </span>
                    </button>
                    
                    <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-white/30 uppercase tracking-widest">
                        <span>Encrypted</span>
                        <div className="w-1 h-1 rounded-full bg-white/30"></div>
                        <span>Secure</span>
                        <div className="w-1 h-1 rounded-full bg-white/30"></div>
                        <span>Private</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative w-full h-screen text-white flex overflow-hidden font-rajdhani bg-black selection:bg-cyan-500/30">
            <FuturisticBackground />
            <LiveSession isOpen={showLive} onClose={() => setShowLive(false)} />

            {/* Sidebar (Glassmorphism) */}
            <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-black/60 backdrop-blur-xl border-r border-white/5 transform transition-transform duration-500 ease-out md:relative md:translate-x-0 ${showHistory ? 'translate-x-0' : '-translate-x-full'} md:flex flex-col shadow-2xl`}>
                <div className="p-8 flex items-center gap-4">
                    <div className="relative">
                         <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                            <Cpu size={20} className="text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse"></div>
                    </div>
                   
                    <div>
                        <h2 className="font-orbitron font-bold text-lg text-white tracking-wide">SMART<span className="text-cyan-400">GPT</span></h2>
                        <div className="text-[9px] text-white/40 tracking-[0.2em] font-medium">ONLINE</div>
                    </div>
                    <button className="md:hidden ml-auto text-white/50" onClick={() => setShowHistory(false)}><X size={20} /></button>
                </div>
                
                <div className="px-6 mb-6">
                    <button onClick={createNewSession} className="w-full py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,243,255,0.1)] text-cyan-300 hover:text-white font-bold tracking-wide transition-all flex items-center justify-center gap-2 group">
                        <MessageSquare size={16} className="group-hover:rotate-12 transition-transform" />
                        <span>NEW SESSION</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 space-y-1 no-scrollbar">
                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-4 pl-2">History</div>
                    {sessions.map(s => (
                        <div 
                            key={s.id} 
                            onClick={() => setCurrentSessionId(s.id)}
                            className={`group w-full text-left px-4 py-3 rounded-lg transition-all cursor-pointer relative overflow-hidden ${
                                currentSessionId === s.id 
                                ? 'bg-gradient-to-r from-cyan-500/20 to-transparent border-l-2 border-cyan-400 text-white' 
                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                            }`}
                        >
                            <div className="flex justify-between items-center relative z-10">
                                <span className="font-medium text-xs truncate w-36">{s.title}</span>
                                <button onClick={(e) => handleDeleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-opacity">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-white/5 bg-black/40">
                     <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <img src={user?.picture} className="w-8 h-8 rounded-full ring-2 ring-white/10" alt="User" />
                        <div className="overflow-hidden">
                            <div className="text-sm font-bold text-white truncate">{user?.name}</div>
                            <div className="text-[9px] text-white/40 truncate tracking-wider">PREMIUM ACCESS</div>
                        </div>
                     </div>
                </div>
            </div>

            {/* Main Interface */}
            <div className="flex-1 flex flex-col relative z-0 h-full">
                
                {/* Header / Persona Selector */}
                <div className="h-20 flex items-center justify-between px-6 z-10">
                    <button className="md:hidden text-white/70 hover:text-white p-2" onClick={() => setShowHistory(true)}>
                        <Menu />
                    </button>

                    <div className="flex items-center p-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 mx-auto md:mx-0 shadow-xl gap-2">
                        <button
                            onClick={() => setCurrentPersona(Persona.SmartGPT)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${currentPersona === Persona.SmartGPT 
                                ? 'bg-gradient-to-r from-cyan-600 to-cyan-400 text-black shadow-lg shadow-cyan-500/25 scale-105' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <SmartLogo /> <span>SMART</span>
                        </button>
                        <button
                            onClick={() => setCurrentPersona(Persona.BusinessGPT)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${currentPersona === Persona.BusinessGPT 
                                ? 'bg-gradient-to-r from-yellow-600 to-yellow-400 text-black shadow-lg shadow-yellow-500/25 scale-105' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <BizLogo /> <span>BIZ</span>
                        </button>
                        <button
                            onClick={() => setCurrentPersona(Persona.EducationGPT)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${currentPersona === Persona.EducationGPT 
                                ? 'bg-gradient-to-r from-purple-600 to-purple-400 text-black shadow-lg shadow-purple-500/25 scale-105' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <EduLogo /> <span>EDU</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowLive(true)}
                        className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold tracking-wider transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    >
                         <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                         LIVE
                    </button>
                </div>

                {/* Chat Area */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 md:px-20 py-8 space-y-8 no-scrollbar relative scroll-smooth">
                    {getCurrentSession()?.messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`max-w-[85%] md:max-w-3xl p-6 shadow-2xl transition-all relative overflow-hidden backdrop-blur-md ${
                                msg.role === 'user' 
                                    ? 'bg-white/10 rounded-2xl rounded-tr-sm text-white border border-white/10' 
                                    : 'bg-black/60 rounded-2xl rounded-tl-sm text-gray-200 border border-cyan-500/20 shadow-[0_0_30px_rgba(0,0,0,0.3)]'
                            }`}>
                                <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] font-orbitron flex items-center gap-2 ${msg.role === 'user' ? 'text-white/60' : 'text-cyan-400'}`}>
                                        {msg.role === 'user' ? <UserIcon size={10}/> : <Cpu size={10}/>}
                                        {msg.role === 'user' ? 'USER' : currentPersona}
                                    </span>
                                    {msg.role === 'model' && (
                                        <button onClick={() => handleCopy(msg.text || "")} className="text-white/20 hover:text-white transition-colors">
                                            <Copy size={12} />
                                        </button>
                                    )}
                                </div>
                                
                                {msg.image && (
                                    <div className="mb-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
                                         <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[9px] px-2 py-1 rounded font-bold border border-white/10 z-10 flex items-center gap-1">
                                            <ImageIcon size={10} className="text-purple-400" /> GENERATED_IMAGE
                                        </div>
                                        <img src={msg.image} alt="Generated" className="w-full bg-black/50" />
                                    </div>
                                )}

                                <p className="whitespace-pre-wrap leading-relaxed text-sm tracking-wide font-light">{msg.text}</p>
                                
                                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                                        {msg.groundingUrls.map((url, i) => (
                                            <a key={i} href={url.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[9px] bg-white/5 hover:bg-cyan-500/20 border border-white/5 hover:border-cyan-500/50 px-3 py-1.5 rounded-full transition-all text-cyan-200/80 hover:text-cyan-200 font-medium uppercase tracking-wider">
                                                <Search size={10} /> {url.title || "Source"}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isThinking && (
                        <div className="flex justify-start animate-pulse">
                             <div className="bg-black/40 border border-cyan-500/20 rounded-full px-6 py-3 flex items-center gap-3 backdrop-blur-md">
                                <ThreeDLogo />
                                <div className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest font-orbitron">Processing Request...</div>
                             </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 md:p-8 flex justify-center z-20">
                    <div className="w-full max-w-4xl relative">
                        {/* Floating Glass Bar */}
                        <div className="relative bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all hover:border-cyan-500/30 group">
                            
                            {/* Toolbar */}
                            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                                <div className="flex items-center gap-4 text-[10px] text-white/50 font-bold tracking-wider">
                                     <div className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer transition-colors">
                                        <ImageIcon size={12} />
                                        <select 
                                            value={imgSize} 
                                            onChange={(e) => setImgSize(e.target.value as any)}
                                            className="bg-transparent outline-none cursor-pointer appearance-none pl-1"
                                        >
                                            <option className="bg-black text-white">1K RES</option>
                                            <option className="bg-black text-white">2K RES</option>
                                            <option className="bg-black text-white">4K RES</option>
                                        </select>
                                     </div>
                                     <div className="flex items-center gap-1 hover:text-cyan-400 cursor-pointer transition-colors">
                                        <Box size={12} />
                                        <select 
                                            value={aspectRatio} 
                                            onChange={(e) => setAspectRatio(e.target.value)}
                                            className="bg-transparent outline-none cursor-pointer appearance-none pl-1"
                                        >
                                            <option className="bg-black text-white">1:1</option>
                                            <option className="bg-black text-white">16:9</option>
                                            <option className="bg-black text-white">9:16</option>
                                        </select>
                                     </div>
                                </div>
                                {mediaFiles.length > 0 && <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">{mediaFiles.length} ATTACHMENT(S)</span>}
                            </div>

                            <div className="flex items-end p-2 gap-2">
                                <label className="p-3 text-white/40 hover:text-cyan-400 hover:bg-white/5 rounded-xl cursor-pointer transition-all">
                                    <input type="file" className="hidden" onChange={(e) => { if(e.target.files) setMediaFiles(Array.from(e.target.files)) }} />
                                    <ImageIcon size={20} />
                                </label>

                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    placeholder={`Ask ${currentPersona} to write, draw...`}
                                    className="flex-1 bg-transparent text-white placeholder-white/20 p-3 outline-none resize-none min-h-[50px] max-h-[150px] font-sans text-sm"
                                    rows={1}
                                />
                                
                                {isThinking ? (
                                    <button onClick={handleStop} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all animate-pulse">
                                        <StopCircle size={20} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleSendMessage} 
                                        disabled={!input.trim() && mediaFiles.length === 0} 
                                        className="p-3 bg-white/10 text-white rounded-xl hover:bg-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all disabled:opacity-30 disabled:hover:bg-white/10 disabled:shadow-none"
                                    >
                                        <Send size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="text-center mt-2 text-[9px] text-white/20 font-mono">
                            AI GENERATED CONTENT MAY BE INACCURATE • POWERED BY GEMINI 2.5
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

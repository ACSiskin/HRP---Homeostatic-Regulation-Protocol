// src/components/mind-stream.tsx
'use client'

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import {
    Activity, Flame, Zap, BrainCircuit, Eye, Radio, Heart
} from "lucide-react"
import { getBotMentalState } from "@/app/actions"
import { MentalState, Drives, Temperament } from "@/core/types"

// --- TYPES ---
type SafeMentalState = MentalState;

// --- 1. NEURO-GLYPH (Odcisk Temperamentu) ---
const NeuroGlyph = ({ temp }: { temp?: Temperament }) => {
    const t = temp || { sensitivity: 1, reactivity: 1, sociability: 1, libidoScale: 1, analyticalLeaning: 1 };

    const size = 32;
    const center = size / 2;
    const points = [];
    const steps = 8 + Math.floor(t.sociability * 4);
    const radius = (size / 2) - 4;

    for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const variance = (i % 2 === 0) ? (t.libidoScale * 2) : 0;
        const jaggedness = t.sensitivity > 1.2 ? (Math.random() * 2) : 0;

        const r = radius - variance + jaggedness;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        points.push(`${x},${y}`);
    }

    const color = t.libidoScale > 1.2 ? "#ec4899" : t.sensitivity > 1.3 ? "#8b5cf6" : "#10b981";

    return (
        <svg width={size} height={size} className="opacity-90">
            <polygon points={points.join(" ")} fill="none" stroke={color} strokeWidth="1.5" className="animate-pulse" />
            <circle cx={center} cy={center} r="1.5" fill={color} />
        </svg>
    )
}

// --- 2. HEART RATE MONITOR (EKG Canvas) ---
const HeartRateMonitor = ({ arousal, energy, safety, libido }: { arousal: number, energy: number, safety: number, libido: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const xRef = useRef(0);

    const getStrokeColor = () => {
        if (safety < 0.4) return "#ef4444"; // CZERWONY (Panika)
        if (libido > 0.6 && safety > 0.5) return "#d946ef"; // RÓŻOWY (Lust)
        if (arousal > 0.7) return "#eab308"; // ŻÓŁTY (Stres)
        return "#06b6d4"; // BŁĘKITNY (Norma)
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const speed = 0.7 + (arousal * 1.5);
        const amplitude = (energy / 100) * 30;

        const render = () => {
            if (!ctx || !canvas) return;

            ctx.fillStyle = 'rgba(2, 2, 4, 0.15)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = getStrokeColor();
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.strokeStyle;

            ctx.beginPath();

            const prevX = xRef.current;
            xRef.current += speed;

            if (xRef.current > canvas.width) {
                xRef.current = 0;
                ctx.moveTo(0, canvas.height / 2);
            } else {
                ctx.moveTo(prevX, canvas.height / 2);
            }

            const beatFrequency = 1000 / (60 + (arousal * 100));
            const time = Date.now();
            const yBase = canvas.height / 2;
            let y = yBase;

            const cycle = (xRef.current + (time * 0.1)) % (200 - (arousal * 80));

            if (cycle < 10) y = yBase;
            else if (cycle < 15) y = yBase - (amplitude * 0.2);
            else if (cycle < 20) y = yBase + (amplitude * 0.2);
            else if (cycle < 25) y = yBase - amplitude; 
            else if (cycle < 30) y = yBase + (amplitude * 0.3);
            else if (cycle < 45) y = yBase - (amplitude * 0.15);
            else y = yBase;

            if (safety < 0.3) y += (Math.random() - 0.5) * 5;

            ctx.lineTo(xRef.current, y);
            ctx.stroke();

            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [arousal, energy, safety, libido]);

    return (
        <canvas ref={canvasRef} width={300} height={100} className="w-full h-full" />
    );
};

// --- 3. SEGMENTED BAR (Bateryjka z kreseczek) ---
const SegmentedBar = ({ value, icon: Icon, colorClass, shadowClass }: any) => {
    const totalSegments = 10;
    const activeSegments = Math.ceil((value / 100) * totalSegments);

    return (
        <div className="flex flex-col items-center justify-end h-full gap-2 w-10 group">
            <div className="flex flex-col-reverse gap-[2px] h-full w-3 bg-black/30 p-[2px] rounded border border-white/10">
                {Array.from({ length: totalSegments }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-full flex-1 rounded-[1px] transition-all duration-300 ${i < activeSegments
                            ? `${colorClass} ${shadowClass} opacity-100`
                            : 'bg-white/10 opacity-20'
                            }`}
                    />
                ))}
            </div>
            <div className="text-slate-500 group-hover:text-cyan-200 transition-colors mt-1">
                <Icon className="h-4 w-4" />
            </div>
            <span className="text-[9px] font-mono text-slate-500 absolute bottom-12 opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(7,11,18,0.95)] px-1 rounded border border-cyan-400/15 pointer-events-none">
                {Math.round(value)}%
            </span>
        </div>
    );
};

// --- MAIN COMPONENT ---
export function MindStream({ botName }: { botName: string }) {
    const [state, setState] = useState<SafeMentalState | null>(null)
    const [loading, setLoading] = useState(true)
    
    // Używamy referencji do kontenera
    const scrollViewportRef = useRef<HTMLDivElement>(null)

    // AUTO-SCROLL LOGIC (PANCERNA WERSJA)
    useEffect(() => {
        if (state?.shortTermMemory && scrollViewportRef.current) {
            const viewport = scrollViewportRef.current;
            requestAnimationFrame(() => {
                viewport.scrollTop = viewport.scrollHeight;
            });
        }
    }, [state?.shortTermMemory]);

    useEffect(() => {
        const fetchState = async () => {
            try {
                const res = await getBotMentalState(botName);
                if (res.success && res.state) {
                    setState(res.state as SafeMentalState);
                }
            } catch (e) {
                console.error("Link error", e);
            } finally {
                setLoading(false);
            }
        }

        fetchState();
        const interval = setInterval(fetchState, 1000);
        return () => clearInterval(interval);
    }, [botName]);

    if (loading) return (
        <div className="h-[600px] flex items-center justify-center glass-tile h-[600px] text-[10px] font-mono text-slate-300 animate-pulse">
            <Activity className="h-6 w-6 mr-2 animate-spin" /> Initializing Bio-Kernel...
        </div>
    )

    if (!state) return (
        <div className="h-[600px] flex items-center justify-center glass-tile h-[600px] text-[10px] font-mono text-red-300 border-red-400/20">
            Neural Link Offline.
        </div>
    )

    // --- SUB-COMPONENTS (Wykresy Góra) ---
    const PADTriangle = ({ v, a, d }: { v: number, a: number, d: number }) => {
        let cx = 50;
        let cy = 55;
        cx += (v * 35);
        cy -= (a * 40) - 15;
        const r = 3 + (d * 2);
        cx = Math.max(10, Math.min(90, cx));
        cy = Math.max(10, Math.min(80, cy));
        const dotColor = v > 0.2 ? "#4ade80" : v < -0.2 ? "#f87171" : "#60a5fa";

        return (
            <svg viewBox="-20 -10 140 130" className="w-full h-full drop-shadow-2xl" preserveAspectRatio="xMidYMid meet">
                <polygon points="50,5 95,85 5,85" fill="rgba(15, 23, 42, 0.6)" stroke="#334155" strokeWidth="0.5" />
                <text x="50" y="-2" textAnchor="middle" fill="#94a3b8" fontSize="6" className="font-bold tracking-widest">AROUSAL</text>
                <text x="105" y="95" textAnchor="middle" fill="#4ade80" fontSize="5" className="font-bold tracking-widest">POS</text>
                <text x="-5" y="95" textAnchor="middle" fill="#f87171" fontSize="5" className="font-bold tracking-widest">NEG</text>
                <circle cx={cx} cy={cy} r={r} fill={dotColor} className="animate-pulse shadow-[0_0_15px_currentColor] stroke-white stroke-[0.5]" />
            </svg>
        )
    }

    const DrivesRadar = ({ drives }: { drives: Drives }) => {
        const r = 34;
        const cx = 50;
        const cy = 50;

        const driveConfig = {
            libido: { angle: 0, color: '#ec4899', label: 'LIBIDO' },
            curiosity: { angle: 72, color: '#f59e0b', label: 'CURIO' },
            affiliation: { angle: 144, color: '#06b6d4', label: 'AFFIL' },
            safety: { angle: 216, color: '#10b981', label: 'SAFE' },
            dominance: { angle: 288, color: '#8b5cf6', label: 'DOM' },
        };

        const outerPoints = Object.values(driveConfig).map((config) => {
            const angleRad = (config.angle - 90) * (Math.PI / 180);
            return `${cx + r * Math.cos(angleRad)},${cy + r * Math.sin(angleRad)}`;
        }).join(' ');

        const getPoint = (value: number, angleDeg: number) => {
            let safeValue = value > 1 ? value / 100 : value;
            safeValue = Math.max(0.05, Math.min(1, safeValue)); 
            const angleRad = (angleDeg - 90) * (Math.PI / 180);
            return { x: cx + r * safeValue * Math.cos(angleRad), y: cy + r * safeValue * Math.sin(angleRad) };
        };

        const points = Object.values(driveConfig).map((config) => {
            const key = config.label.toLowerCase() === 'affil' ? 'affiliation' : config.label.toLowerCase() === 'dom' ? 'dominance' : config.label.toLowerCase() === 'safe' ? 'safety' : config.label.toLowerCase() === 'curio' ? 'curiosity' : config.label.toLowerCase();
            // @ts-ignore
            const rawVal = drives[key] || 0;
            return { ...getPoint(rawVal, config.angle), color: config.color, rawVal, label: config.label };
        });
        const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');

        return (
            <svg viewBox="-10 -10 120 120" className="w-full h-full drop-shadow-2xl" preserveAspectRatio="xMidYMid meet">
                <polygon
                    points={outerPoints}
                    fill="rgba(15, 23, 42, 0.3)"
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="3 2"
                />
                <polygon
                    points={polyPoints}
                    fill="rgba(30, 41, 59, 0.8)"
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                    className="transition-all duration-1000 ease-out drop-shadow-[0_0_5px_rgba(148,163,184,0.3)]"
                />
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={p.color} className="shadow-[0_0_8px_currentColor] stroke-[#020204] stroke-1" />
                ))}
                <text x="50" y="8" textAnchor="middle" fill={driveConfig.libido.color} fontSize="5" className="font-bold tracking-widest">LIBIDO</text>
                <text x="90" y="35" textAnchor="start" fill={driveConfig.curiosity.color} fontSize="5" className="font-bold tracking-widest">CURIO</text>
                <text x="75" y="95" textAnchor="middle" fill={driveConfig.affiliation.color} fontSize="5" className="font-bold tracking-widest">AFFIL</text>
                <text x="25" y="95" textAnchor="middle" fill={driveConfig.safety.color} fontSize="5" className="font-bold tracking-widest">SAFE</text>
                <text x="10" y="35" textAnchor="end" fill={driveConfig.dominance.color} fontSize="5" className="font-bold tracking-widest">DOM</text>
            </svg>
        )
    }

    return (
        <div className="grid grid-cols-2 h-[600px] w-full glass-tile text-slate-300 font-mono text-xs overflow-hidden shadow-none relative">

            {/* LEWA STRONA: CONSOLE */}
            <div className="flex flex-col border-r border-white/10 bg-black/15 relative min-h-0">
                <div className="h-12 border-b border-white/10 bg-black/10 flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <NeuroGlyph temp={state.temperament} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-100 uppercase tracking-[0.18em]">{botName}</span>
                            <span className="text-[8px] text-slate-400">NEURAL_STREAM // LINKED</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Radio className={`h-3 w-3 ${state.mood.arousal > 0.7 ? 'text-crimson-400 animate-ping' : 'text-cyan-400 animate-pulse'}`} />
                        <span className="text-[9px] text-slate-500 font-bold">LIVE</span>
                    </div>
                </div>

                {/* ZMIANA SCROLLBARA:
                   Dodano klasy [&::-webkit-scrollbar] które bezpośrednio stylują pasek bez pluginów.
                   - w-1.5: wąski pasek (6px)
                   - bg-transparent: tło paska niewidoczne
                   - thumb:bg-slate-800: suwak ciemnoszary (jak ramki)
                */}
                <div 
                    ref={scrollViewportRef}
                    className="flex-1 bg-black/20 overflow-y-auto min-h-0 
                    [&::-webkit-scrollbar]:w-1.5 
                    [&::-webkit-scrollbar-track]:bg-transparent 
                    [&::-webkit-scrollbar-thumb]:bg-white/15 
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    hover:[&::-webkit-scrollbar-thumb]:bg-white/25"
                >
                    <div className="p-4 space-y-3 font-mono">
                        {state.shortTermMemory.map((mem, i) => {
                            const match = mem.match(/\[(.*?)\]/);
                            const tag = match ? match[1] : 'LOG';
                            const text = mem.replace(/\[.*?\]/, '').trim();
                            const isBio = tag.includes('BIO') || tag.includes('SYSTEM');
                            const isNewest = i === state.shortTermMemory.length - 1;

                            return (
                                <div key={i} className={`flex gap-3 group ${isNewest ? 'opacity-100' : 'opacity-60'} hover:opacity-100 transition-opacity`}>
                                    <div className="min-w-[50px] text-right">
                                        <span className={`text-[9px] font-bold px-1 rounded ${isBio ? 'text-crimson-300 bg-crimson-500/10 border border-crimson-400/15' : 'text-cyan-300 bg-cyan-500/10 border border-cyan-400/15'}`}>{tag}</span>
                                    </div>
                                    <div className="w-[1px] bg-white/10 self-stretch"></div>
                                    <p className="text-[11px] leading-relaxed text-slate-200">
                                        {text}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="p-3 border-t border-white/10 bg-black/25 shrink-0">
                    <div className="flex items-center gap-2 text-cyan-300/90">
                        <span className="animate-pulse font-bold">{'>'}</span>
                        <span className="text-[11px] font-medium tracking-wide truncate text-cyan-100/80">{state.currentThought || "Awaiting stimulus..."}</span>
                    </div>
                </div>
            </div>

            {/* PRAWA STRONA: HUD */}
            <div className="flex flex-col bg-black/10 relative min-h-0">
                {/* HEADER */}
                <div className="h-12 border-b border-white/10 bg-black/10 flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <BrainCircuit className="h-4 w-4 text-cyan-400" />
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">BIO_KERNEL</span>
                    </div>
                    <Badge variant="outline" className={`text-[9px] border-white/10 bg-black/30 ${state.drives.safety < 0.4 ? 'text-crimson-300 animate-pulse border-crimson-400/20 bg-crimson-500/10' : 'text-slate-500'}`}>
                        {state.drives.safety < 0.4 ? 'THREAT DETECTED' : 'SECURE'}
                    </Badge>
                </div>

                {/* 1. WYKRESY (GÓRA) */}
                <div className="flex-1 grid grid-cols-2 divide-x divide-white/10 min-h-0 bg-black/5">
                    <div className="flex flex-col relative p-4 items-center justify-center">
                        <div className="absolute top-2 left-4 text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            <Flame className="h-3 w-3 text-crimson-400" /> Instincts
                        </div>
                        <div className="w-full h-full max-w-[200px] max-h-[200px]">
                            <DrivesRadar drives={state.drives} />
                        </div>
                    </div>

                    <div className="flex flex-col relative p-4 items-center justify-center">
                        <div className="absolute top-2 left-4 text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            <Activity className="h-3 w-3 text-cyan-400" /> Affect
                        </div>
                        <div className="w-full h-full max-w-[200px] max-h-[200px]">
                            <PADTriangle v={state.mood.valence} a={state.mood.arousal} d={state.mood.dominance} />
                        </div>
                    </div>
                </div>

                {/* 2. BIO-MONITOR (DÓŁ - NEW DESIGN) */}
                <div className="h-[140px] border-t border-white/10 bg-black/10 flex shrink-0 relative overflow-hidden">
                    {/* Pionowe paski zasobów (SEGMENTED) */}
                    <div className="w-[80px] border-r border-white/10 flex justify-center gap-4 py-4 bg-black/10">
                        <SegmentedBar
                            value={state.energy}
                            icon={Zap}
                            colorClass={state.energy < 20 ? 'bg-red-500' : 'bg-yellow-500'}
                            shadowClass={state.energy < 20 ? 'shadow-[0_0_8px_red]' : 'shadow-[0_0_8px_#eab308]'}
                        />
                        <SegmentedBar
                            value={state.attention}
                            icon={Eye}
                            colorClass="bg-blue-500"
                            shadowClass="shadow-[0_0_8px_#3b82f6]"
                        />
                    </div>

                    {/* EKG Monitor */}
                    <div className="flex-1 relative flex flex-col">
                        <div className="absolute top-2 left-3 z-10 flex gap-4">
                            <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3 text-slate-400" />
                                <span className="text-[10px] font-mono text-slate-300">
                                    {Math.round(60 + (state.mood.arousal * 60))} BPM
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className={`h-1.5 w-1.5 rounded-full ${state.drives.safety < 0.4 ? 'bg-crimson-400 animate-ping' : 'bg-emerald-500'}`}></span>
                                <span className="text-[10px] font-mono text-slate-300">
                                    {state.drives.safety < 0.4 ? 'PANIC' : state.drives.libido > 0.6 ? 'AROUSED' : 'STABLE'}
                                </span>
                            </div>
                        </div>

                        {/* Canvas EKG */}
                        <HeartRateMonitor
                            arousal={state.mood.arousal}
                            energy={state.energy}
                            safety={state.drives.safety}
                            libido={state.drives.libido}
                        />

                        {/* Siatka w tle */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
                    </div>
                </div>

            </div>
        </div>
    )
}

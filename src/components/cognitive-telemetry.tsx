// src/components/cognitive-telemetry.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { getBotMentalState } from "@/app/actions"
import { Terminal, Activity } from 'lucide-react'

export function CognitiveTelemetry({ botName }: { botName: string }) {
    const [thoughts, setThoughts] = useState<string[]>([])
    const scrollRef = useRef<HTMLDivElement>(null)

    // Odpytywanie bazy o nowe myśli co 2 sekundy
    useEffect(() => {
        const fetchThoughts = async () => {
            const res = await getBotMentalState(botName)
            if (res.success && res.state?.thoughtStream) {
                // Jeśli struktura z bazy przyjdzie jako string, parsujemy, jeśli jako tablica - przypisujemy
                const parsed = typeof res.state.thoughtStream === 'string' 
                    ? JSON.parse(res.state.thoughtStream) 
                    : res.state.thoughtStream;
                setThoughts(parsed)
            }
        }
        fetchThoughts()
        const interval = setInterval(fetchThoughts, 2000)
        return () => clearInterval(interval)
    }, [botName])

    // Auto-scroll do najnowszej myśli na dole
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [thoughts])

    // Kolorowanie strumienia świadomości
    const getColor = (thought: string) => {
        if (thought.includes('[SYS-1]')) return 'text-slate-400'
        if (thought.includes('[SYS-2]')) return 'text-purple-400 font-semibold drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
        if (thought.includes('[APPRAISAL]')) return 'text-yellow-400'
        if (thought.includes('[SYS-3]')) return thought.includes('✅') ? 'text-green-400' : 'text-red-400 font-bold'
        if (thought.includes('[MCP]')) return 'text-blue-400'
        if (thought.includes('[BIO]')) return 'text-orange-500'
        return 'text-green-500' // Default / System
    }

    return (
        <div className="flex flex-col h-full bg-[#050505] border-l border-slate-800/50">
            <div className="flex items-center gap-2 p-2 px-4 border-b border-slate-800/50 bg-slate-900/30 text-[10px] font-mono text-slate-500 uppercase tracking-widest shrink-0">
                <Terminal className="h-3 w-3 text-blue-500" />
                Live Thought Stream
                <Activity className="h-3 w-3 ml-auto text-green-500 animate-pulse" />
            </div>
            <div 
                className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-3"
                ref={scrollRef}
            >
                {thoughts.length === 0 ? (
                    <div className="text-slate-700 animate-pulse flex items-center h-full justify-center italic">
                        Awaiting cognitive activity...
                    </div>
                ) : (
                    thoughts.map((t, i) => (
                        <div key={i} className={`leading-relaxed ${getColor(t)} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            {t}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

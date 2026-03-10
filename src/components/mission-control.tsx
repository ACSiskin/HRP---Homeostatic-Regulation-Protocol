// src/components/mission-control.tsx
'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Rocket, Target, Globe, Radio, Zap, Users, AlertTriangle, Loader2 } from "lucide-react"
import { startCampaign } from "@/app/actions"
import { toast } from "sonner" // Jeśli nie masz sonnera, możesz użyć alert() lub innego toasta

interface MissionControlProps {
  activeBotsCount: number
  totalBotsCount: number
}

export function MissionControl({ activeBotsCount, totalBotsCount }: MissionControlProps) {
  const [topic, setTopic] = useState("")
  const [missionType, setMissionType] = useState("influence")
  const [isLaunching, setIsLaunching] = useState(false)

  const handleLaunch = async () => {
    if (!topic) return
    setIsLaunching(true)

    // Wywołanie Server Action
    const result = await startCampaign(topic)

    if (result.success) {
      // Tu można dodać powiadomienie sukcesu
      console.log("Campaign launched:", result.message)
      setTopic("")
    } else {
      console.error("Campaign error:", result.error)
    }

    setIsLaunching(false)
  }

  return (
    <Card className="glass-tile overflow-hidden relative group shadow-none">
      {/* Efekt tła (Grid) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] bg-[linear-gradient(to_right,rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,.12)_1px,transparent_1px)] bg-[size:26px_26px]"></div>
      
      {/* Górny pasek statusu */}
      <div className="relative bg-black/10 border-b border-white/10 p-2 px-4 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest">
        <span className="flex items-center gap-2">
           <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
           </span>
           Global Ops Center
        </span>
        <span>Network Capacity: {Math.round((activeBotsCount / (totalBotsCount || 1)) * 100)}%</span>
      </div>

      <CardContent className="relative p-6 grid gap-6 md:grid-cols-3">
        
        {/* KOLUMNA 1: KONFIGURACJA MISJI */}
        <div className="md:col-span-2 space-y-4">
           <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Rocket className="h-5 w-5 text-cyan-400" /> 
                 Mission Launcher
              </h3>
              <p className="text-sm text-slate-400">Deploy coordinated tasks to active persona swarm.</p>
           </div>

           <div className="grid gap-4 p-4 rounded-xl border border-white/10 bg-black/20">
              
              {/* Wybór typu misji */}
              <div className="grid grid-cols-3 gap-2">
                 <Button 
                    variant="outline" 
                    className={`h-20 flex flex-col gap-1 border transition-all ${
                      missionType === 'influence'
                        ? 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,.06),0_0_18px_rgba(34,211,238,.06)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                    onClick={() => setMissionType('influence')}
                 >
                    <Radio className="h-5 w-5" />
                    <span className="text-xs">Influence</span>
                 </Button>
                 <Button 
                    variant="outline" 
                    className={`h-20 flex flex-col gap-1 border transition-all ${
                      missionType === 'traffic'
                        ? 'border-amber-400/25 bg-amber-500/10 text-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,.06),0_0_18px_rgba(251,191,36,.06)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                    onClick={() => setMissionType('traffic')}
                 >
                    <Globe className="h-5 w-5" />
                    <span className="text-xs">Traffic Gen</span>
                 </Button>
                 <Button 
                    variant="outline" 
                    className={`h-20 flex flex-col gap-1 border transition-all ${
                      missionType === 'warmup'
                        ? 'border-green-400/25 bg-green-500/10 text-green-200 shadow-[0_0_0_1px_rgba(74,222,128,.06),0_0_18px_rgba(74,222,128,.06)]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                    onClick={() => setMissionType('warmup')}
                 >
                    <Zap className="h-5 w-5" />
                    <span className="text-xs">Warmup</span>
                 </Button>
              </div>

              {/* Pola tekstowe */}
              <div className="space-y-3">
                 <div className="space-y-1">
                    <Label className="text-xs text-slate-400 uppercase tracking-[0.12em]">Narrative / Topic / Hashtags</Label>
                    <div className="flex gap-2">
                       <Input 
                          placeholder={missionType === 'influence' ? 'e.g. #Warszawa traffic jam opinions' : 'e.g. https://target-site.com'} 
                          className="bg-black/30 border-white/10 font-mono text-sm text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                       />
                    </div>
                 </div>
              </div>

           </div>
        </div>

        {/* KOLUMNA 2: READY CHECK & LAUNCH */}
        <div className="border-l border-white/10 pl-6 flex flex-col justify-between">
           
           <div className="space-y-4">
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Fleet Readiness</Label>
              
              <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Available Units</span>
                    <span className="font-mono text-green-400">{activeBotsCount} / {totalBotsCount}</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_18px_rgba(74,222,128,.2)]" 
                      style={{ width: `${(activeBotsCount / (totalBotsCount || 1)) * 100}%` }} 
                    />
                 </div>
              </div>

              <div className="p-3 bg-black/20 rounded-xl border border-white/10 text-xs text-slate-400 space-y-1">
                 <p className="flex items-center gap-2">
                    <CheckCircleIcon color="text-green-400" /> Proxy Network: Stable
                 </p>
                 <p className="flex items-center gap-2">
                    <CheckCircleIcon color="text-green-400" /> AI Core: Online (GPT-4)
                 </p>
                 <p className="flex items-center gap-2">
                    <CheckCircleIcon color={topic ? "text-green-400" : "text-slate-600"} /> Payload: {topic ? "Ready" : "Waiting..."}
                 </p>
              </div>
           </div>

           <Button 
              size="lg" 
              className={`w-full font-bold tracking-wider transition-all border ${
                 !topic 
                 ? 'border-white/10 bg-white/5 text-slate-500 cursor-not-allowed' 
                 : 'border-cyan-400/20 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 hover:from-cyan-500/25 hover:to-violet-500/25 text-white shadow-[0_0_0_1px_rgba(34,211,238,.08),0_0_24px_rgba(34,211,238,.12)]'
              }`}
              onClick={handleLaunch}
              disabled={!topic || isLaunching}
           >
              {isLaunching ? (
                 <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> INITIALIZING...</>
              ) : (
                 <><Rocket className="mr-2 h-5 w-5" /> LAUNCH CAMPAIGN</>
              )}
           </Button>

        </div>

      </CardContent>
    </Card>
  )
}

function CheckCircleIcon({ color }: { color: string }) {
   return (
      <svg className={`h-3 w-3 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
   )
}

// src/components/toolbox-view.tsx
'use client'

import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog"
import { 
  Wrench, Plus, Trash2, ShieldAlert, 
  Zap, Info, CheckCircle2, AlertTriangle, 
  Activity, Cpu, Server, Webhook, TerminalSquare, ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"

// 1. IMPORT LOGIKI (Nasz mózg)
import { useToolbox } from "@/core/services/use-toolbox"
// 2. IMPORT KOMPONENTU MODALA (Nasz nowy, wydzielony UI)
import { ToolInstallerModal } from "@/components/tool-installer-modal"

interface ToolBoxViewProps {
  bots: any[]
}

export function ToolBoxView({ bots }: ToolBoxViewProps) {
  // Zaciągamy wszystko z hooka
  const {
    selectedBot, setSelectedBot,
    servers, isCensorActive, botEnergy,
    isAddOpen, setIsAddOpen,
    newServer, setNewServer,
    isWarningOpen, setIsWarningOpen,
    handleAddServer, handleDelete, handleToggleCensor,
    confirmCensorDisable, handleUpdateCost
  } = useToolbox(bots)

  const getProtocolIcon = (type: string) => {
      switch(type) {
          case 'REST_API': return <Webhook className="h-5 w-5" />;
          case 'LOCAL_SHELL': return <TerminalSquare className="h-5 w-5" />;
          default: return <Server className="h-5 w-5" />;
      }
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6 animate-in fade-in duration-700">
      
      {/* 1. LEWY PANEL: SELEKCJA BOTÓW */}
      <Card className="w-full lg:w-64 shrink-0 border-slate-800 bg-slate-900/40 backdrop-blur-md flex flex-col overflow-hidden">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Hive Entities
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => setSelectedBot(bot)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-all group",
                  selectedBot?.id === bot.id 
                    ? "bg-blue-600/10 border border-blue-500/30 text-white" 
                    : "text-slate-500 hover:bg-slate-800/50 border border-transparent"
                )}
              >
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  bot.status === 'WORKING' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-slate-700"
                )} />
                <span className="text-sm font-medium">{bot.name}</span>
                {selectedBot?.id === bot.id && (
                    <Activity className="h-3 w-3 ml-auto animate-pulse text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* 2. PRAWY PANEL: ZARZĄDZANIE TOOLBOXEM */}
      <div className="flex-1 flex flex-col min-w-0 gap-6">
        
        {/* HEADER SEKCYJNY */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Wrench className="h-6 w-6 text-blue-500" />
              ToolBox: <span className="text-blue-400">{selectedBot?.name}</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">Configure Protocol tools and safety limits.</p>
          </div>

          <Button 
            onClick={() => setIsAddOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" /> Install New Tool
          </Button>

          {/* TUTAJ WPINAMY NASZ NOWY WYDZIELONY MODAL! */}
          <ToolInstallerModal 
            isOpen={isAddOpen}
            setIsOpen={setIsAddOpen}
            newServer={newServer}
            setNewServer={setNewServer}
            onInstall={handleAddServer}
          />
        </div>

        <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
          
          {/* LISTA NARZĘDZI */}
          <Card className="flex-1 border-slate-800 bg-slate-900/20 backdrop-blur-md overflow-hidden flex flex-col min-w-0">
            <CardHeader className="bg-slate-950/40 border-b border-slate-800">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-blue-500" /> Attached Capabilities
                    </CardTitle>
                    <Badge variant="outline" className="border-slate-800 text-slate-500 font-mono">
                        {servers.length} TOOLS LOADED
                    </Badge>
                </div>
            </CardHeader>
            <ScrollArea className="flex-1">
                <CardContent className="p-0">
                    {servers.length > 0 ? (
                        <div className="divide-y divide-slate-800">
                            {servers.map((server) => (
                                <div key={server.id} className="p-4 sm:p-6 group hover:bg-slate-800/30 transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={cn(
                                                "p-2 rounded-lg bg-slate-950 border shrink-0",
                                                server.status === 'ONLINE' ? "border-green-900/50" : "border-slate-800"
                                            )}>
                                                <span className={server.status === 'ONLINE' ? "text-green-500" : "text-slate-600"}>
                                                    {getProtocolIcon(server.protocolType)}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold text-white truncate">{server.name}</h4>
                                                    <Badge variant="outline" className="text-[9px] uppercase border-blue-900/50 text-blue-400 bg-blue-950/20 py-0 h-4 hidden sm:flex">
                                                        {server.protocolType || 'MCP'}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">{server.urlOrCommand}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge className={cn(
                                                "text-[9px] font-bold hidden sm:flex",
                                                server.status === 'ONLINE' ? "bg-green-950 text-green-400" : "bg-slate-900 text-slate-500"
                                            )}>
                                                {server.status}
                                            </Badge>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-slate-600 hover:text-red-500"
                                                onClick={() => handleDelete(server.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Wyświetlanie Schemy */}
                                    {server.description && (
                                      <div className="mb-4 bg-black/20 p-2 rounded border border-slate-800">
                                        <p className="text-[10px] text-slate-400 font-mono break-words whitespace-pre-wrap">
                                          <span className="text-blue-500/70 mr-2">{"//"} SCHEMA:</span>
                                          {server.description}
                                        </p>
                                      </div>
                                    )}

                                    {/* Informacja o ukrytych nagłówkach */}
                                    {server.customHeaders && (
                                      <div className="mb-4 bg-emerald-950/10 p-2 rounded border border-emerald-900/30">
                                        <p className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                                          <ShieldCheck className="h-3 w-3" /> Custom Headers / Secrets are active and hidden from AI.
                                        </p>
                                      </div>
                                    )}
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 items-center">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[10px] text-slate-500 uppercase tracking-tighter">Energy Usage</Label>
                                                <span className="text-[11px] font-bold text-blue-400">{server.energyCost}% / call</span>
                                            </div>
                                            <Slider 
                                                value={[server.energyCost]} 
                                                max={50} 
                                                onValueChange={v => handleUpdateCost(server.id, v[0])}
                                                className="py-2"
                                            />
                                        </div>
                                        <div className="bg-black/40 rounded-lg p-3 border border-slate-800 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Execution Mode</p>
                                                <p className="text-[11px] text-white font-medium">{server.autoApprove ? 'Fully Autonomous' : 'Human Approval Required'}</p>
                                            </div>
                                            <Switch checked={server.autoApprove} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                            <Info className="h-12 w-12 opacity-10 mb-4" />
                            <p className="text-sm font-serif italic">No tools installed. Add integration servers to expand capabilities.</p>
                        </div>
                    )}
                </CardContent>
            </ScrollArea>
          </Card>

          {/* PRAWY PANEL BEZPIECZEŃSTWA (SYSTEM 3) */}
          <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
            <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-red-500" /> Psychophysical Censor
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-slate-800">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-white">System 3 Watchdog</Label>
                        </div>
                        <Switch 
                            checked={isCensorActive} 
                            onCheckedChange={handleToggleCensor}
                            className="data-[state=checked]:bg-green-600"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" /> Power Management
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-2 mb-4">
                        <div className="text-4xl font-black text-white">{botEnergy.toFixed(0)}%</div>
                        <div className="text-[10px] text-slate-500 pb-1.5 uppercase font-bold tracking-widest">Neural Load</div>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-1000 ease-in-out" 
                            style={{ width: `${botEnergy}%` }}
                        />
                    </div>
                </CardContent>
            </Card>
          </div>

        </div>
      </div>

      {/* MODAL OSTRZEGAWCZY: RED MODAL */}
      <Dialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <DialogContent className="bg-red-950 border-2 border-red-500 text-white max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                    <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>
            </div>
            <DialogTitle className="text-2xl font-black text-center uppercase tracking-tighter">
                CRITICAL SAFETY WARNING
            </DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={confirmCensorDisable} className="w-full bg-white text-red-900 hover:bg-slate-200 font-black uppercase">
                I Understand the Risks - Disable Censor
            </Button>
            <Button variant="ghost" onClick={() => setIsWarningOpen(false)} className="w-full text-white hover:bg-white/10">
                Keep Safety Oversight Active
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

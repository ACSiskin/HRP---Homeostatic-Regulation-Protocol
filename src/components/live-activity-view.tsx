// src/components/live-activity-view.tsx
'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Activity, AlertCircle, CheckCircle, Info, Terminal, Search, Download, Clock, Database } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Log {
  id: string
  level: string
  message: string
  createdAt: Date
  bot?: {
    name: string
  } | null
}

export function LiveActivityView({ logs }: { logs: Log[] }) {
  // --- STAN: PEŁNA HISTORIA SESJI ---
  // Przechowujemy tu wszystkie logi, które przyszły od momentu załadowania strony
  const [sessionHistory, setSessionHistory] = useState<Log[]>([])
  const [filter, setFilter] = useState("")

  // --- EFEKT: AKUMULACJA LOGÓW ---
  useEffect(() => {
    setSessionHistory(prevHistory => {
      // 1. Tworzymy zbiór istniejących ID, aby uniknąć duplikatów
      const existingIds = new Set(prevHistory.map(l => l.id))
      
      // 2. Wybieramy tylko te logi z nowej paczki, których jeszcze nie mamy
      const newUniqueLogs = logs.filter(l => !existingIds.has(l.id))

      // 3. Jeśli nie ma nowych, nie robimy nic (optymalizacja renderowania)
      if (newUniqueLogs.length === 0) return prevHistory

      // 4. Łączymy: Nowe logi na górę + Stara historia
      // Dodatkowo sortujemy, żeby upewnić się, że najnowsze są zawsze pierwsze
      const merged = [...newUniqueLogs, ...prevHistory].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      return merged
    })
  }, [logs]) // Uruchamia się za każdym razem, gdy serwer przyśle nową paczkę (co ~4s)

  // --- FILTROWANIE ---
  // Filtrujemy całą historię, ale...
  const filteredLogs = sessionHistory.filter(log => 
    log.message.toLowerCase().includes(filter.toLowerCase()) ||
    (log.bot?.name && log.bot.name.toLowerCase().includes(filter.toLowerCase())) ||
    log.level.toLowerCase().includes(filter.toLowerCase())
  )

  // --- OPTYMALIZACJA WYŚWIETLANIA ---
  // Wyświetlamy tylko pierwsze 50 wyników, żeby nie zabić DOM przy dużej historii
  const visibleLogs = filteredLogs.slice(0, 50)

  // --- EKSPORT DO JSON ---
  const handleExport = () => {
    const dataStr = JSON.stringify(sessionHistory, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `vesper_logs_session_${new Date().toISOString()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper do ikon statusu
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR': return <AlertCircle className="h-4 w-4 text-crimson-400" />
      case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'WARN': return <AlertCircle className="h-4 w-4 text-amber-400" />
      case 'ACTION': return <Terminal className="h-4 w-4 text-violet-400" />
      default: return <Info className="h-4 w-4 text-cyan-400" />
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER & TOOLS */}
      <div className="glass-tile px-4 py-4 flex items-center justify-between gap-4">
        
        {/* Lewa strona: Tytuł i Licznik */}
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400 animate-pulse" />
            Neural Feed
          </h2>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono uppercase tracking-[0.12em]">
             <Database className="h-3 w-3 text-cyan-400/80" />
             <span>Buffer: {sessionHistory.length} events stored</span>
             <span className="text-slate-600">|</span>
             <span>Displaying: {visibleLogs.length}</span>
          </div>
        </div>

        {/* Prawa strona: Szukajka i Export */}
        <div className="flex items-center gap-2 shrink-0">
           <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Search logs..." 
                className="pl-8 bg-black/20 border-white/10 text-xs h-9 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
           </div>
           <Button 
             variant="outline" 
             size="sm" 
             className="h-9 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
             onClick={handleExport}
             disabled={sessionHistory.length === 0}
           >
              <Download className="mr-2 h-3 w-3 text-cyan-400" />
              Export Session
           </Button>
        </div>
      </div>

      {/* GŁÓWNA TABELA */}
      <Card className="flex-1 glass-tile overflow-hidden flex flex-col shadow-none">
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader className="bg-[rgba(7,11,18,0.8)] sticky top-0 z-10 backdrop-blur-sm">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-[140px] text-slate-500 text-xs font-mono pl-4 uppercase tracking-[0.14em]">TIMESTAMP</TableHead>
                  <TableHead className="w-[100px] text-slate-500 text-xs font-mono uppercase tracking-[0.14em]">LEVEL</TableHead>
                  <TableHead className="w-[180px] text-slate-500 text-xs font-mono uppercase tracking-[0.14em]">SOURCE</TableHead>
                  <TableHead className="text-slate-500 text-xs font-mono uppercase tracking-[0.14em]">PAYLOAD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="font-mono text-xs">
                {visibleLogs.length > 0 ? (
                  visibleLogs.map((log) => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      
                      {/* TIMESTAMP */}
                      <TableCell className="text-slate-500 pl-4 whitespace-nowrap flex flex-col justify-center">
                        <span className="text-slate-300">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-[9px] opacity-50">
                          .{new Date(log.createdAt).getMilliseconds().toString().padStart(3, '0')}
                        </span>
                      </TableCell>

                      {/* LEVEL */}
                      <TableCell>
                         <Badge variant="outline" className={`
                            text-[10px] h-5 border px-2 gap-1 bg-black/20
                            ${log.level === 'ERROR' ? 'border-crimson-400/20 text-crimson-300 bg-crimson-500/10' : ''}
                            ${log.level === 'SUCCESS' ? 'border-green-400/20 text-green-300 bg-green-500/10' : ''}
                            ${log.level === 'INFO' ? 'border-cyan-400/20 text-cyan-300 bg-cyan-500/10' : ''}
                            ${log.level === 'WARN' ? 'border-amber-400/20 text-amber-300 bg-amber-500/10' : ''}
                            ${log.level === 'ACTION' ? 'border-violet-400/20 text-violet-300 bg-violet-500/10' : ''}
                         `}>
                            {getLevelIcon(log.level)}
                            {log.level}
                         </Badge>
                      </TableCell>

                      {/* SOURCE (BOT) */}
                      <TableCell>
                        {log.bot ? (
                          <div className="flex items-center gap-2">
                             <Avatar className="h-5 w-5 border border-white/10">
                                <AvatarImage src={`/avatars/${log.bot.name.toLowerCase()}.jpg`} />
                                <AvatarFallback className="text-[9px] bg-black/20 text-slate-400 border border-white/10">
                                  {log.bot.name[0].toUpperCase()}
                                </AvatarFallback>
                             </Avatar>
                             <span className="text-slate-300 font-bold group-hover:text-white transition-colors">
                               {log.bot.name}
                             </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 opacity-60 text-slate-500">
                             <Terminal className="h-4 w-4" />
                             <span className="italic">SYSTEM</span>
                          </div>
                        )}
                      </TableCell>

                      {/* MESSAGE */}
                      <TableCell className="text-slate-400 group-hover:text-slate-200 break-words py-3 leading-relaxed">
                        {log.message}
                      </TableCell>

                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-slate-500 italic">
                       <div className="flex flex-col items-center gap-2">
                         <Search className="h-8 w-8 opacity-20 text-cyan-400" />
                         <p>Waiting for neural signals...</p>
                         <p className="text-[10px] opacity-50">Make sure your bots are running.</p>
                       </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </Card>
    </div>
  )
}

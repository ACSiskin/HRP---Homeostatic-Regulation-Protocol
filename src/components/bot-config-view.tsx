// src/components/bot-config-view.tsx
'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft, Save, Send, Bot, FileCode, Terminal,
  BrainCircuit, BookOpen
} from "lucide-react"
import { useRouter } from "next/navigation"
import { chatWithBot, saveBotConfig, getBotConfig, injectMemory } from "@/app/actions"
import { SessionManager } from "@/components/session-manager"
import { BotPortfolio } from "@/components/bot-portfolio"
import { BotLocalSettings } from "@/components/bot-local-settings"
import { MindStream } from "@/components/mind-stream"
import { BotJournal } from "@/components/bot-journal"
import { AnalyticsView } from "@/components/analytics-view"
import { CognitiveTelemetry } from "@/components/cognitive-telemetry" // <--- Import Telemetrii

interface BotData {
  id: string
  name: string
  status: string
  lastActive: Date
}

interface BotConfigViewProps {
  bot: BotData
}

interface ConsoleMessage {
  role: 'user' | 'bot' | 'system'
  text: string
  timestamp: string
}

export function BotConfigView({ bot }: BotConfigViewProps) {
  const router = useRouter()
  const displayName = bot.name.charAt(0).toUpperCase() + bot.name.slice(1)
  const getCurrentTime = () => new Date().toLocaleTimeString()

  // --- STAN APLIKACJI ---
  const [messages, setMessages] = useState<ConsoleMessage[]>([])
  const [inputMsg, setInputMsg] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [trainingMode, setTrainingMode] = useState(false)
  const [fileContent, setFileContent] = useState(`// Loading configuration for ${bot.name}...`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([
      { role: 'system', text: `>> System initialized. Neuro Link connected to unit: ${bot.name.toUpperCase()}`, timestamp: new Date().toLocaleTimeString() },
      { role: 'system', text: `>> Loading persona profile... OK.`, timestamp: new Date().toLocaleTimeString() }
    ])
    loadConfig()
  }, [bot.name])

  const loadConfig = async () => {
    const res = await getBotConfig(bot.name)
    if (res.success && res.content) {
      setFileContent(res.content)
    } else {
      setFileContent("// Error: Could not load persona file.")
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // --- LOGIKA BIZNESOWA ---

  const handleSend = async () => {
    if (!inputMsg.trim()) return
    const userText = inputMsg
    setInputMsg("")
    setIsProcessing(true)

    if (trainingMode) {
      setMessages(prev => [...prev, { role: 'user', text: `[INJECT]: ${userText}`, timestamp: getCurrentTime() }])
      const res = await injectMemory(bot.name, userText, fileContent)
      if (res.success && res.newContent) {
        setFileContent(res.newContent)
        setMessages(prev => [...prev, { role: 'system', text: `>> Memory block injected to ${bot.name}/persona.ts.`, timestamp: getCurrentTime() }])
      }
    } else {
      setMessages(prev => [...prev, { role: 'user', text: `> ${userText}`, timestamp: getCurrentTime() }])
      const res = await chatWithBot(bot.name, userText)
      setMessages(prev => [...prev, { role: 'bot', text: res.response, timestamp: getCurrentTime() }])
    }
    setIsProcessing(false)
  }

  const handleSave = async () => {
    await saveBotConfig(bot.name, fileContent)
    setMessages(prev => [...prev, { role: 'system', text: `>> Configuration saved to /bots/${bot.name}/persona.ts`, timestamp: getCurrentTime() }])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">

      {/* 1. HEADER (Responsywny) */}
      <div className="glass-tile px-4 py-3 flex items-center gap-3 md:gap-4 shrink-0 overflow-x-auto no-scrollbar">
        <Button variant="outline" size="icon" onClick={() => router.push('/?view=personas')} className="h-9 w-9 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 min-w-max">
          <Avatar className="h-10 w-10 border border-white/10 bg-black/20">
            <AvatarImage src={`/avatars/${bot.name}.jpg`} />
            <AvatarFallback>{bot.name[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col justify-center">
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 leading-tight">
              {displayName}
              <Badge variant="outline" className={`text-[9px] md:text-[10px] h-4 md:h-5 font-normal px-1.5 ${bot.status === 'WORKING' ? 'text-green-400 border-green-900 bg-green-900/10' : 'text-slate-400 border-slate-700'}`}>
                {bot.status}
              </Badge>
            </h2>
            <p className="text-[10px] md:text-xs text-slate-400 font-mono leading-tight mt-0.5">
              ID: {bot.id.substring(0, 8)}... <span className="hidden sm:inline">• </span><span className="block sm:inline text-cyan-400">Neuro Link Active</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. TABBED INTERFACE */}
      <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* ZAKŁADKI: h-auto i flex-wrap pozwalają na zawijanie wierszy na wąskich ekranach */}
        <div className="shrink-0 pb-2 md:pb-4 overflow-x-auto no-scrollbar">
          <TabsList className="glass-tile h-auto min-h-[2.5rem] flex-wrap md:flex-nowrap p-1 border border-white/10 bg-black/20 rounded-xl justify-start gap-1">
            <TabsTrigger value="chat" className="text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20 rounded-lg">Neuro Link (Chat)</TabsTrigger>
            <TabsTrigger value="journal" className="text-xs md:text-sm flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20 rounded-lg"><BookOpen className="h-3 w-3 hidden sm:block" /> Journal (Memory)</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm flex items-center gap-2 whitespace-nowrap data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20 rounded-lg"><BrainCircuit className="h-3 w-3 hidden sm:block" /> Analytics</TabsTrigger>
            <TabsTrigger value="session" className="text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20 rounded-lg">Session Manager</TabsTrigger>
            <TabsTrigger value="portfolio" className="text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20 rounded-lg">Full Portfolio</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs md:text-sm whitespace-nowrap data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20 rounded-lg">Local Settings</TabsTrigger>
          </TabsList>
        </div>

        {/* --- TAB 1: NEURO LINK (MindStream + Telemetry + Console) --- */}
        <TabsContent value="chat" className="flex-1 flex flex-col gap-4 min-h-0 mt-0 data-[state=inactive]:hidden overflow-y-auto pr-1">
          
          {/* PANEL KOGNITYWNY (MindStream + Telemetry) */}
          <Card className="flex-none lg:flex-1 min-h-[400px] lg:min-h-0 glass-tile border-white/10 flex flex-col overflow-hidden shadow-none">
            <CardHeader className="py-2 md:py-3 px-3 md:px-4 border-b border-white/10 bg-black/10 flex flex-row items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-400" />
                <CardTitle className="text-xs md:text-sm font-medium text-slate-100 truncate">Cognitive Telemetry ({displayName})</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-white/5 text-cyan-300 border border-cyan-400/20 text-[9px] md:text-[10px] flex items-center gap-1 shrink-0"><BrainCircuit className="h-3 w-3" /> Live</Badge>
            </CardHeader>
            
            {/* Responsywny układ: kolumna na mobile, wiersz na desktopie */}
            <div className="flex-1 min-h-0 bg-[rgba(7,11,18,0.45)] flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 min-h-[250px] lg:min-h-0 min-w-0 relative">
                <MindStream botName={bot.name} />
              </div>
              <div className="w-full lg:w-[320px] xl:w-[450px] h-[200px] lg:h-auto shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col">
                <CognitiveTelemetry botName={bot.name} />
              </div>
            </div>
          </Card>

          {/* PANEL OPERACYJNY (Konsola + Edytor Persona) */}
          <Card className="flex-none h-[350px] lg:h-[35%] lg:min-h-[250px] shrink-0 glass-tile border-white/10 flex flex-col shadow-none relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500 ${trainingMode ? 'bg-indigo-600 shadow-[0_0_10px_#4f46e5]' : 'bg-blue-600/50'}`} />
            
            <div className="flex flex-1 min-h-0">
              {/* TERMINAL CHAT */}
              <div className="flex-1 flex flex-col lg:border-r border-white/10 min-w-0">
                <div className="p-2 border-b border-white/10 bg-black/10 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2 px-1 md:px-2 min-w-0">
                    <Terminal className={`h-4 w-4 shrink-0 ${trainingMode ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="text-[10px] md:text-xs font-mono text-slate-400 uppercase tracking-[0.1em] md:tracking-[0.14em] truncate">CONSOLE_LINK_{bot.name.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center space-x-2 mr-1 md:mr-2 shrink-0">
                    <Label htmlFor="training-switch" className={`text-[9px] md:text-[10px] uppercase font-bold ${trainingMode ? 'text-indigo-400' : 'text-slate-600'}`}>
                      {trainingMode ? 'WRITE' : 'READ'}
                    </Label>
                    <Switch id="training-switch" className="scale-75 data-[state=checked]:bg-cyan-600" checked={trainingMode} onCheckedChange={setTrainingMode} />
                  </div>
                </div>
                <ScrollArea className="flex-1 bg-[rgba(4,6,12,0.75)] font-mono text-[10px] md:text-xs p-3 md:p-4">
                  <div className="space-y-1.5 md:space-y-1">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex gap-1.5 md:gap-2 break-words whitespace-pre-wrap ${m.role === 'user' ? 'text-blue-300' : m.role === 'system' ? 'text-yellow-500/80' : 'text-green-400'}`}>
                        <span className="opacity-30 select-none shrink-0">[{m.timestamp}]</span>
                        <span className="font-bold select-none shrink-0">{m.role === 'user' ? 'USR' : m.role === 'system' ? 'SYS' : 'BOT'}:</span>
                        <span className={m.role === 'system' ? 'italic' : ''}>{m.text}</span>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-2 md:p-3 bg-black/10 border-t border-white/10 flex gap-2 shrink-0">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 md:left-3 top-2.5 text-blue-500 font-mono text-xs md:text-sm">{'>'}</span>
                    <Input
                      className="bg-black/30 border-white/10 text-slate-200 font-mono pl-6 md:pl-7 h-9 focus-visible:ring-cyan-400/40 text-[10px] md:text-xs"
                      placeholder={trainingMode ? `Instrukcja (Auto-Learn)...` : `Wiadomość do ${displayName}...`}
                      value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                  </div>
                  <Button size="sm" onClick={handleSend} disabled={isProcessing} className={`shrink-0 ${trainingMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    {trainingMode ? <BrainCircuit className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* PERSONA EDITOR (Ukryty na małych ekranach: widoczny od lg w górę) */}
              <div className="w-[300px] xl:w-[400px] flex-col hidden lg:flex bg-[rgba(7,11,18,0.55)] border-l border-white/10">
                <div className="p-2 border-b border-white/10 bg-black/10 flex justify-between items-center">
                  <div className="flex items-center gap-2 px-2">
                    <FileCode className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-mono text-slate-400 truncate">persona.ts</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/10 border border-transparent hover:border-white/10" onClick={handleSave}><Save className="h-3 w-3 text-green-400" /></Button>
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <Textarea className="absolute inset-0 w-full h-full resize-none font-mono text-[10px] xl:text-xs leading-relaxed bg-transparent text-slate-300 border-0 p-3 focus-visible:ring-0" value={fileContent} onChange={(e) => setFileContent(e.target.value)} spellCheck={false} />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* POZOSTAŁE ZAKŁADKI */}
        <TabsContent value="journal" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-y-auto">
          <BotJournal botName={bot.name} />
        </TabsContent>

        <TabsContent value="analytics" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-y-auto">
          <AnalyticsView botName={bot.name} />
        </TabsContent>

        <TabsContent value="session" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-y-auto">
          <SessionManager botName={bot.name} />
        </TabsContent>

        <TabsContent value="portfolio" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-y-auto">
          <BotPortfolio botName={bot.name} />
        </TabsContent>

        <TabsContent value="settings" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-y-auto">
          <BotLocalSettings botName={bot.name} />
        </TabsContent>

      </Tabs>
    </div>
  )
}

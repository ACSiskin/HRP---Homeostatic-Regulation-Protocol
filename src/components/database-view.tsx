'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, HardDrive, FileText, Server } from "lucide-react"

interface DatabaseData {
  bots: any[]
  logs: any[]
}

export function DatabaseView({ data }: { data: DatabaseData }) {
  
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="glass-tile px-4 py-4 flex items-center justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="h-6 w-6 text-cyan-400" />
            System Database
          </h2>
          <p className="text-sm text-slate-400">Raw data inspector & storage metrics.</p>
        </div>
        <div className="flex gap-2">
           <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-300">
              Prisma / SQLite
           </Badge>
           <Badge className="border border-amber-400/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15">
              READ-ONLY MODE
           </Badge>
        </div>
      </div>

      {/* GŁÓWNY OBSZAR */}
      <Card className="flex-1 min-h-0 glass-tile flex flex-col overflow-hidden shadow-none">
        <Tabs defaultValue="bots" className="flex flex-col h-full">
          
          <CardHeader className="py-2 px-4 border-b border-white/10 bg-black/10 shrink-0">
             <div className="flex items-center justify-between">
                <TabsList className="glass-tile h-8 p-0.5 border border-white/10 bg-black/20 rounded-xl">
                  <TabsTrigger value="bots" className="text-xs h-7 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20">
                    <Server className="h-3 w-3 mr-2" /> BotState ({data.bots.length})
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="text-xs h-7 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border data-[state=active]:border-cyan-400/20">
                    <FileText className="h-3 w-3 mr-2" /> Logs (100 recent)
                  </TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                   <HardDrive className="h-3 w-3 text-cyan-400/70" /> dev.db
                </div>
             </div>
          </CardHeader>

          {/* TABELA: BOTS */}
          <TabsContent value="bots" className="flex-1 min-h-0 m-0 border-0 p-0 overflow-hidden">
             <ScrollArea className="h-full w-full bg-[rgba(7,11,18,0.35)]">
                <Table>
                   <TableHeader className="bg-[rgba(7,11,18,0.8)] sticky top-0 z-10 backdrop-blur-sm">
                      <TableRow className="border-white/10 hover:bg-transparent">
                         <TableHead className="font-mono text-xs text-cyan-300/70 w-[50px]">ID</TableHead>
                         <TableHead className="font-mono text-xs text-slate-400">NAME</TableHead>
                         <TableHead className="font-mono text-xs text-slate-400">STATUS</TableHead>
                         <TableHead className="font-mono text-xs text-slate-400">LAST_ACTIVE</TableHead>
                         <TableHead className="font-mono text-xs text-slate-400 text-right">RAW_JSON</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody className="font-mono text-xs text-slate-300">
                      {data.bots.map((bot) => (
                        <TableRow key={bot.id} className="border-white/5 hover:bg-white/5">
                           <TableCell className="text-slate-500">{bot.id.substring(0, 4)}...</TableCell>
                           <TableCell className="font-bold text-white">{bot.name}</TableCell>
                           <TableCell>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                bot.status === 'WORKING'
                                  ? 'bg-green-500/10 text-green-300 border-green-400/20'
                                  : 'bg-white/5 text-slate-400 border-white/10'
                              }`}>
                                {bot.status}
                              </span>
                           </TableCell>
                           <TableCell className="text-slate-500">
                              {new Date(bot.lastActive).toLocaleString()}
                           </TableCell>
                           <TableCell className="text-right text-slate-600 text-[10px] font-mono">
                              {`{ "id": "${bot.id}", "v": 1 }`}
                           </TableCell>
                        </TableRow>
                      ))}
                   </TableBody>
                </Table>
             </ScrollArea>
          </TabsContent>

          {/* TABELA: LOGS */}
          <TabsContent value="logs" className="flex-1 min-h-0 m-0 border-0 p-0 overflow-hidden">
             <ScrollArea className="h-full w-full bg-[rgba(7,11,18,0.35)]">
                <Table>
                   <TableHeader className="bg-[rgba(7,11,18,0.8)] sticky top-0 z-10 backdrop-blur-sm">
                      <TableRow className="border-white/10 hover:bg-transparent">
                         <TableHead className="font-mono text-xs text-cyan-300/70 w-[50px]">ID</TableHead>
                         <TableHead className="font-mono text-xs text-slate-400">TIMESTAMP</TableHead>
                         <TableHead className="font-mono text-xs text-slate-400">LEVEL</TableHead>
                         <TableHead className="font-mono text-xs text-slate-400">BOT_ID</TableHead>
                         <TableHead className="font-mono text-xs text-slate-400">MESSAGE</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody className="font-mono text-xs text-slate-300">
                      {data.logs.map((log) => (
                        <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                           <TableCell className="text-slate-500">{log.id}</TableCell>
                           <TableCell className="text-slate-500 whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                           </TableCell>
                           <TableCell>
                              <span className={`
                                ${log.level === 'ERROR' ? 'text-red-400' : ''}
                                ${log.level === 'SUCCESS' ? 'text-green-400' : ''}
                                ${log.level === 'INFO' ? 'text-cyan-400' : ''}
                              `}>
                                {log.level}
                              </span>
                           </TableCell>
                           <TableCell className="text-slate-500">{log.botId || '-'}</TableCell>
                           <TableCell className="text-slate-300 w-full">{log.message}</TableCell>
                        </TableRow>
                      ))}
                   </TableBody>
                </Table>
             </ScrollArea>
          </TabsContent>

        </Tabs>
      </Card>
    </div>
  )
}

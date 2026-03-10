// src/components/bot-row.tsx
'use client'

import { useState } from "react"
import { TableRow, TableCell } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Square, Settings, Instagram, BrainCircuit, RefreshCw, Terminal, Activity, Trash2, Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { startBotHybrid, stopBotAction, deleteBot } from "@/app/actions"

interface BotRowProps {
  bot: {
    id: string
    name: string
    status: string
    lastActive: Date
    logs: { message: string }[]
  }
}

export function BotRow({ bot }: BotRowProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Główne wywołanie startu
  const handleStart = async (mode: 'GHOST' | 'ACTIVE', platform: 'FACEBOOK' | 'INSTAGRAM') => {
    setIsLoading(true)
    await startBotHybrid(bot.name, mode, platform)
    setIsLoading(false)
    router.refresh()
  }

  const handleStop = async () => {
    setIsLoading(true)
    await stopBotAction(bot.name)
    setIsLoading(false)
    router.refresh()
  }

  const handleDelete = async () => {
    if (confirm(`Czy na pewno chcesz usunąć bota '${bot.name}'? Spowoduje to usunięcie jego logów, bazy wektorowej i plików z dysku. Nie można tego cofnąć.`)) {
      setIsLoading(true)
      await deleteBot(bot.name)
      setIsLoading(false)
      router.refresh()
    }
  }

  const handleConfigure = () => {
    router.push(`/?view=config&bot=${bot.name}`)
  }

  const isWorking = bot.status === 'WORKING'

  return (
    <TableRow className="border-white/10 hover:bg-white/[0.02] transition-colors group">
      {/* Avatar */}
      <TableCell className="pl-4 py-3">
        <div className="relative inline-block">
           <Avatar className="h-9 w-9 border border-white/10 ring-2 ring-transparent group-hover:ring-cyan-500/30 transition-all">
             <AvatarImage src={`/avatars/${bot.name.toLowerCase()}.jpg`} />
             <AvatarFallback className="bg-slate-800 text-slate-400 text-xs font-bold">
                {bot.name.substring(0,2).toUpperCase()}
             </AvatarFallback>
           </Avatar>
           {isWorking && (
             <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-slate-950"></span>
           )}
        </div>
      </TableCell>

      {/* Name */}
      <TableCell className="py-3 font-medium">
        <div className="flex flex-col">
           <span className="text-slate-200 text-sm font-bold group-hover:text-cyan-300 transition-colors">{bot.name}</span>
           <span className="text-[10px] text-slate-500 font-mono">ID: {bot.id.split('-')[0]}</span>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="py-3">
        <Badge variant="outline" className={`
          font-mono text-[9px] px-2 py-0.5 border flex items-center gap-1.5 w-max
          ${isWorking 
            ? 'text-green-400 bg-green-400/10 border-green-400/20' 
            : 'text-slate-400 bg-slate-400/10 border-slate-400/20'}
        `}>
           {isWorking ? <Activity className="h-3 w-3 animate-pulse" /> : <Square className="h-3 w-3" />}
           {bot.status}
        </Badge>
      </TableCell>

      {/* Last Sync */}
      <TableCell className="py-3">
         <div className="flex flex-col">
           <span className="text-xs text-slate-300">
              {new Date(bot.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
           <span className="text-[9px] text-slate-500">
              {new Date(bot.lastActive).toLocaleDateString()}
           </span>
         </div>
      </TableCell>

      {/* Log */}
      <TableCell className="py-3">
        {bot.logs && bot.logs.length > 0 ? (
           <div className="flex items-center gap-2 text-xs text-slate-400 max-w-[200px] truncate">
              <Terminal className="h-3 w-3 shrink-0 opacity-50" />
              <span className="truncate">{bot.logs[0].message}</span>
           </div>
        ) : (
           <span className="text-xs text-slate-600 italic">No recent activity</span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right pr-6 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" disabled={isLoading}>
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#0a0f18] border border-white/10 text-slate-300 shadow-xl">
            
            {!isWorking ? (
               <>
                  <DropdownMenuLabel className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Deployment</DropdownMenuLabel>
                  
                  {/* OPCJA 1: SAM MÓZG (Proces w tle) - TERAZ NA GÓRZE */}
                  <DropdownMenuItem onClick={() => handleStart('GHOST', 'FACEBOOK')} className="cursor-pointer hover:bg-cyan-500/10 focus:bg-cyan-500/10 text-cyan-300 py-2">
                     <BrainCircuit className="mr-2 h-4 w-4" />
                     <div className="flex flex-col">
                        <span className="font-bold">Start Neural Core</span>
                        <span className="text-[9px] text-slate-500">Autonomy & Hive Mind only</span>
                     </div>
                  </DropdownMenuItem>

                  {/* WYSZARZONE OPCJE WEB (FB) */}
                  <DropdownMenuItem disabled className="cursor-not-allowed opacity-40 py-2">
                     <Globe className="mr-2 h-4 w-4 text-slate-400" />
                     <div className="flex flex-col">
                        <span className="text-slate-300">Deploy Web Agent</span>
                        <span className="text-[9px] text-slate-500">FB Module Offline</span>
                     </div>
                  </DropdownMenuItem>

                  {/* WYSZARZONE OPCJE MOBILE (IG) */}
                  <DropdownMenuItem disabled className="cursor-not-allowed opacity-40 py-2">
                     <Instagram className="mr-2 h-4 w-4 text-slate-400" />
                     <div className="flex flex-col">
                        <span className="text-slate-300">Deploy Mobile Agent</span>
                        <span className="text-[9px] text-slate-500">IG Module Offline</span>
                     </div>
                  </DropdownMenuItem>
               </>
            ) : (
               <>
                  <DropdownMenuLabel className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Process Control</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleStop} className="cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-300 py-2">
                     <Square className="mr-2 h-4 w-4 fill-current" />
                     <span className="font-bold">Terminate Process</span>
                  </DropdownMenuItem>
               </>
            )}

            <DropdownMenuSeparator className="bg-white/10" />
            
            <DropdownMenuItem onClick={handleConfigure} className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
               <Settings className="mr-2 h-4 w-4 text-slate-400" />
               <span>Configure Persona</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/10" />

            {/* DELETE BOT */}
            <DropdownMenuItem onClick={handleDelete} className="cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-400 focus:text-red-400">
               <Trash2 className="mr-2 h-4 w-4" />
               <span className="font-bold">Delete Persona</span>
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// src/components/sidebar.tsx
'use client'

import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  LayoutDashboard, Users, Activity, Settings, 
  Shield, Database, Network, ChevronLeft,
  Wrench, Terminal, Zap, Cpu // <--- Dodane ikony dla ToolBox i Mission Control
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/sidebar-context"

export function Sidebar() {
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view') || 'overview'
  
  // Używamy globalnego stanu z Context API dla responsywności
  const { isCollapsed, toggleSidebar } = useSidebar()

  return (
    <div className={cn(
      "hidden md:block fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out h-screen",
      "border-r border-white/10 bg-[rgba(6,10,20,0.82)] backdrop-blur-xl",
      "shadow-[inset_-1px_0_0_rgba(255,255,255,0.03),0_10px_40px_rgba(0,0,0,0.35)]",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="flex h-full max-h-screen flex-col relative">
        
        {/* PRZYCISK ZWIJANIA (Pływający) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-cyan-400/20 bg-[rgba(8,12,22,0.95)] text-slate-400 hover:text-cyan-200 hover:bg-cyan-500/10 z-50 shadow-[0_0_0_1px_rgba(34,211,238,.08),0_8px_22px_rgba(0,0,0,.35)]"
        >
          <ChevronLeft className={cn("h-3 w-3 transition-transform duration-500", isCollapsed && "rotate-180")} />
        </Button>


{/* LOGO SEKCJA */}
        <div className="flex h-16 items-center border-b border-white/10 px-4 shrink-0 bg-black/10">
          <Link href="/" className="flex items-center gap-3 font-black tracking-tighter text-white">
            {/* Kontener dopasowany do dużego logo - h-14 to 56px */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center transition-all duration-300 hover:scale-110">
               <Image 
                 src="/HRP_logo_white.png" 
                 alt="HRP Logo" 
                 width={56} 
                 height={56} 
                 // Rozmyta poświata (glow) w kolorze cyjanowym
                 className="object-contain drop-shadow-[0_0_25px_rgba(34,211,238,0.45)]"
               />
            </div>
            
            {!isCollapsed && (
              <span className="text-xl animate-in fade-in slide-in-from-left-2 duration-500 tracking-widest text-slate-100 font-bold">
                MIND_OS
              </span>
            )}
          </Link>
        </div>


        {/* MENU GŁÓWNE */}
        <ScrollArea className="flex-1 py-4">
          <div className="px-3 space-y-1">
            <SidebarItem 
              href="/?view=overview" 
              icon={<LayoutDashboard className="h-4 w-4" />} 
              label="Overview" 
              active={currentView === 'overview'}
              isCollapsed={isCollapsed}
            />
            <SidebarItem 
              href="/?view=personas" 
              icon={<Users className="h-4 w-4" />} 
              label="Personas" 
              active={currentView === 'personas' || currentView === 'config'}
              isCollapsed={isCollapsed}
            />

            {/* NOWOŚĆ: TOOLBOX (Zarządzanie MCP) */}
            <SidebarItem 
              href="/?view=toolbox" 
              icon={<Wrench className="h-4 w-4 text-cyan-400" />} 
              label="ToolBox" 
              active={currentView === 'toolbox'}
              isCollapsed={isCollapsed}
            />

            <SidebarItem 
              href="/?view=activity" 
              icon={<Activity className="h-4 w-4" />} 
              label="Live Activity" 
              active={currentView === 'activity'}
              isCollapsed={isCollapsed}
            />
            <SidebarItem 
              href="/?view=hive" 
              icon={<Network className="h-4 w-4" />} 
              label="Hive Mind" 
              active={currentView === 'hive'}
              isCollapsed={isCollapsed}
            />
            <SidebarItem 
              href="/?view=mission" 
              icon={<Zap className="h-4 w-4 text-amber-400" />} 
              label="Mission Control" 
              active={currentView === 'mission'}
              isCollapsed={isCollapsed}
            />
            
            {/* MANAGEMENT SEPARATOR */}
            <div className="my-4 px-3">
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-[0.18em] transition-opacity duration-300 text-slate-500", 
                isCollapsed ? "opacity-0 h-0" : "opacity-100"
              )}>
                Management
              </p>
            </div>

            <SidebarItem 
              href="/?view=database" 
              icon={<Database className="h-4 w-4" />} 
              label="Database" 
              active={currentView === 'database'}
              isCollapsed={isCollapsed}
            />
            <SidebarItem 
              href="/?view=proxies" 
              icon={<Terminal className="h-4 w-4" />} 
              label="Proxy Manager" 
              active={currentView === 'proxies'}
              isCollapsed={isCollapsed}
            />
            <SidebarItem 
              href="/?view=settings" 
              icon={<Settings className="h-4 w-4" />} 
              label="Settings" 
              active={currentView === 'settings'}
              isCollapsed={isCollapsed}
            />
          </div>
        </ScrollArea>

        {/* USER CARD (FOOTER) */}
        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer group">
            <div className="h-9 w-9 shrink-0 rounded-full border border-cyan-400/20 bg-gradient-to-tr from-cyan-500/25 to-violet-500/25 flex items-center justify-center text-xs font-bold text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,.08),0_8px_20px_rgba(0,0,0,.25)] group-hover:scale-105 transition-transform">
              AD
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in duration-500 overflow-hidden">
                <p className="text-sm font-medium text-white leading-none truncate">Admin</p>
                <p className="text-xs text-slate-500 leading-none mt-1 truncate">master@vesper.io</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Komponent pomocniczy dla elementów menu (zachowany bez zmian w logice)
function SidebarItem({ href, icon, label, active, isCollapsed }: { href: string, icon: React.ReactNode, label: string, active: boolean, isCollapsed: boolean }) {
  return (
    <Link href={href} className="block">
      <Button 
        variant="ghost" 
        className={cn(
          "w-full mb-1 transition-all duration-200 group rounded-xl border",
          isCollapsed ? "justify-center px-0" : "justify-start px-3",
          active 
            ? "border-cyan-400/20 bg-cyan-500/10 text-white shadow-[0_0_0_1px_rgba(34,211,238,.08),0_0_18px_rgba(34,211,238,.08)]" 
            : "border-transparent text-slate-400 hover:text-white hover:border-white/10 hover:bg-white/5"
        )}
      >
        <div className={cn(
          "transition-transform duration-200 group-hover:scale-110",
          active ? "text-cyan-400" : ""
        )}>
          {icon}
        </div>
        {!isCollapsed && (
          <span className="ml-3 text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">
            {label}
          </span>
        )}
        {!isCollapsed && active && (
           <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
        )}
      </Button>
    </Link>
  )
}

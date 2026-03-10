// src/components/overview-stats.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Cpu, Zap, AlertTriangle, ShieldCheck } from "lucide-react"

// Importujemy akcje serwerowe, z których skorzystamy do aktualizacji na żywo
import { getAgentStatuses, getDatabaseData, getProxies } from "@/app/actions"

interface OverviewStatsProps {
  totalBots: number;
  activeCount: number;
  idleCount: number;
  stats: {
    totalActions: number;
    weeklyActions: number;
    proxyHealth: number;
    activeProxiesCount: number;
    totalProxies: number;
  };
}

export function OverviewStats({
  totalBots: initialTotalBots,
  activeCount: initialActiveCount,
  idleCount: initialIdleCount,
  stats: initialStats
}: OverviewStatsProps) {

  // Stan początkowy ustawiamy na podstawie propsów od serwera (Initial Load)
  const [data, setData] = useState({
    totalBots: initialTotalBots,
    activeCount: initialActiveCount,
    idleCount: initialIdleCount,
    totalActions: initialStats.totalActions,
    weeklyActions: initialStats.weeklyActions,
    proxyHealth: initialStats.proxyHealth,
    activeProxiesCount: initialStats.activeProxiesCount,
    totalProxies: initialStats.totalProxies
  })

  // Hook odświeżający dane na żywo bez przeładowania całej strony
  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const [agentRes, dbRes, proxyRes] = await Promise.all([
          getAgentStatuses(),
          getDatabaseData(),
          getProxies()
        ]);

        let active = 0;
        let idle = 0;
        let total = 0;
        let totalLogs = 0;
        let proxyHealth = 0;
        let activeProxies = 0;
        let proxiesCount = 0;

        // 1. Boty z bazy (do ustalenia liczby całkowitej i uśpionych)
        if (dbRes.success && dbRes.data) {
          total = dbRes.data.bots.length;
          // Zliczamy absolutnie wszystkie wpisy z bazy jako "Akcje Bota" (INFO, SUCCESS, ACTION)
          totalLogs = dbRes.data.totalLogs; 
          idle = dbRes.data.bots.filter((b: any) => b.status === 'IDLE').length;
        }

        // 2. Aktywne boty Live (z Agent Managera)
        if (agentRes.success && agentRes.data) {
           active = Object.values(agentRes.data).filter((s: any) => s.status === 'WORKING').length;
        }

        // 3. Proxy (Poprawka bugu: szukamy statusu "ONLINE", a nie "ACTIVE")
        if (proxyRes.success && proxyRes.data) {
          proxiesCount = proxyRes.data.length;
          activeProxies = proxyRes.data.filter((p: any) => p.status === 'ONLINE').length;
          proxyHealth = proxiesCount > 0 ? Math.round((activeProxies / proxiesCount) * 100) : 0;
        }

        setData({
          totalBots: total,
          activeCount: active,
          idleCount: idle,
          totalActions: totalLogs,
          weeklyActions: dbRes.data?.logs?.length || 0, // Pokazuje ilość ostatnich logów w małym napisie pod spodem
          proxyHealth,
          activeProxiesCount: activeProxies,
          totalProxies: proxiesCount
        });

      } catch (e) {
        console.error("Failed to fetch live stats", e);
      }
    };

    // Odpytuj backend co 3 sekundy
    const interval = setInterval(fetchLiveStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // Prosta matematyka na poczet botów totalnie wyłączonych
  const offlineBots = data.totalBots - data.activeCount - data.idleCount;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Personas"
        value={data.totalBots}
        icon={<Users className="h-4 w-4 text-cyan-400" />}
        footer={`${data.idleCount} units idle / ${Math.max(0, offlineBots)} offline`}
      />

      <StatCard
        title="Active Processes"
        value={data.activeCount}
        icon={<Cpu className={`h-4 w-4 ${data.activeCount > 0 ? 'text-green-400' : 'text-slate-500'}`} />}
        active={data.activeCount > 0}
        footer="Running neural threads"
      />

      <StatCard
        title="Total Actions"
        value={data.totalActions}
        icon={<Zap className="h-4 w-4 text-amber-400" />}
        footer={`${data.weeklyActions} recent signals monitored`}
      />

      <StatCard
        title="Proxy Health"
        value={`${data.proxyHealth}%`}
        icon={
          data.proxyHealth < 50
            ? <AlertTriangle className="h-4 w-4 text-crimson-400" />
            : <ShieldCheck className="h-4 w-4 text-cyan-400" />
        }
        footer={`${data.activeProxiesCount} / ${data.totalProxies} operational`}
      />
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  footer,
  active = false
}: {
  title: string;
  value: any;
  icon: any;
  footer: string;
  active?: boolean;
}) {
  return (
    <Card className="glass-tile glass-tile-hover text-slate-200 relative overflow-hidden group">
      {active && (
        <>
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-3xl -mr-10 -mt-10 rounded-full pointer-events-none"></div>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none"></div>
        </>
      )}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">
          {title}
        </CardTitle>
        <div className="transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-black text-white flex items-center gap-2">
          {value}
          {active && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-1 font-mono uppercase tracking-tight italic">
          {footer}
        </p>
      </CardContent>
    </Card>
  )
}

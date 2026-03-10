// src/app/page.tsx
import { PrismaClient } from '@prisma/client'
import { Sidebar } from "@/components/sidebar"
import { BotRow } from "@/components/bot-row"
import { PersonasTab } from "@/components/personas-tab"
import { BotConfigView } from "@/components/bot-config-view"
import { LiveActivityView } from "@/components/live-activity-view"
import { DatabaseView } from "@/components/database-view"
import { ProxyManagerView } from "@/components/proxy-manager-view"
import { SettingsView } from "@/components/settings-view"
import { MissionControl } from "@/components/mission-control"
import { ToolBoxView } from "@/components/toolbox-view"
import HiveMindView from "@/components/hive-mind-view"
import { OverviewStats } from "@/components/overview-stats" // <--- Import nowego komponentu

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Server } from "lucide-react"

import {
  getDatabaseData,
  getProxies,
  getAgentStatuses,
  getHiveNetwork
} from "@/app/actions"
import { PageWrapper } from "@/components/page-wrapper"
import { DashboardRefresher } from "@/components/dashboard-refresher"

const prisma = new PrismaClient()

// ==========================================
// 1. DATA FETCHING (Server Side Functions)
// ==========================================

async function getBots() {
  return await prisma.botState.findMany({
    include: { logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { name: 'asc' }
  })
}

async function getSystemLogs() {
  const logs = await prisma.log.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const bots = await prisma.botState.findMany();
  const botMap = new Map(bots.map(b => [b.id, b.name]));

  return logs.map(log => ({
    ...log,
    bot: log.botId ? { name: botMap.get(log.botId) || log.botId } : null
  }))
}

async function getDashboardStats() {
  const totalActions = await prisma.log.count({
    where: { level: 'ACTION' }
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weeklyActions = await prisma.log.count({
    where: {
      level: 'ACTION',
      createdAt: { gte: sevenDaysAgo }
    }
  });

  const proxyRes = await getProxies();
  let totalProxies = 0;
  let activeProxiesCount = 0;
  let proxyHealth = 0;

  if (proxyRes.success && proxyRes.data) {
    totalProxies = proxyRes.data.length;
    activeProxiesCount = proxyRes.data.filter((p: any) => p.status === 'ACTIVE').length;
    proxyHealth = totalProxies > 0 ? Math.round((activeProxiesCount / totalProxies) * 100) : 0;
  }

  return { totalActions, weeklyActions, totalProxies, activeProxiesCount, proxyHealth };
}

// ==========================================
// 2. MAIN DASHBOARD COMPONENT
// ==========================================

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function Dashboard({ searchParams }: Props) {
  // Paralelizacja zapytań
  const botsDataPromise = getBots()
  const dbDataPromise = getDatabaseData()
  const proxiesDataPromise = getProxies()
  const agentStatusesPromise = getAgentStatuses()
  const hiveNetworkPromise = getHiveNetwork()
  const statsPromise = getDashboardStats()

  const [
    bots,
    dbRes,
    proxyRes,
    agentStatuses,
    hiveData,
    stats
  ] = await Promise.all([
    botsDataPromise,
    dbDataPromise,
    proxiesDataPromise,
    agentStatusesPromise,
    hiveNetworkPromise,
    statsPromise
  ])

  const dbData = dbRes.success ? dbRes.data : { bots: [], logs: [], totalLogs: 0 }
  const proxies = proxyRes.success ? proxyRes.data : []
  const { nodes, edges } = hiveData && hiveData.success ? hiveData : { nodes: [], edges: [] }

  let currentView = typeof searchParams.view === 'string' ? searchParams.view : 'overview'
  const currentBotName = typeof searchParams.bot === 'string' ? searchParams.bot : null

  // --- RENDERING WARUNKOWY WIDOKÓW ---

  if (currentView === 'settings') {
    return (
      <div className="flex min-h-screen text-slate-200 font-sans">
        <Sidebar /><PageWrapper><SettingsView /></PageWrapper>
      </div>
    )
  }

  if (currentView === 'proxies') {
    return (
      <div className="flex min-h-screen text-slate-200 font-sans">
        <Sidebar /><PageWrapper><ProxyManagerView initialProxies={proxies as any} /></PageWrapper>
      </div>
    )
  }

  if (currentView === 'database') {
    return (
      <div className="flex min-h-screen text-slate-200 font-sans">
        <Sidebar /><PageWrapper>
          {dbRes.success ? <DatabaseView data={dbData as any} /> : (
            <div className="glass-tile p-6 text-red-300 border-red-400/20">
              Error loading database.
            </div>
          )}
        </PageWrapper>
      </div>
    )
  }

  if (currentView === 'hive') {
    return (
      <div className="flex min-h-screen text-slate-200 font-sans">
        <Sidebar /><PageWrapper className="p-0 overflow-hidden">
          <HiveMindView initialNodes={nodes} initialEdges={edges} />
        </PageWrapper>
      </div>
    )
  }

  if (currentView === 'activity') {
    const logs = await getSystemLogs()
    return (
      <div className="flex min-h-screen text-slate-200 font-sans">
        <Sidebar /><PageWrapper><LiveActivityView logs={logs as any} /></PageWrapper>
      </div>
    )
  }

  if (currentView === 'toolbox') {
    return (
      <div className="flex min-h-screen text-slate-200 font-sans">
        <Sidebar /><PageWrapper><ToolBoxView bots={bots} /></PageWrapper>
      </div>
    )
  }

  if (currentView === 'mission') {
    const activeAgentsCount = agentStatuses ? Object.values(agentStatuses).filter((s: any) => s.status === 'WORKING').length : 0;
    return (
      <div className="flex min-h-screen text-slate-200 font-sans">
        <Sidebar /><PageWrapper><MissionControl activeBotsCount={activeAgentsCount} totalBotsCount={bots.length} /></PageWrapper>
      </div>
    )
  }

  if (currentView === 'config' && currentBotName) {
    const selectedBot = bots.find(b => b.name.toLowerCase() === currentBotName.toLowerCase())
    if (selectedBot) {
      return (
        <div className="flex min-h-screen text-slate-200 font-sans">
          <Sidebar /><PageWrapper><BotConfigView bot={selectedBot as any} /></PageWrapper>
        </div>
      )
    }
  }

  if (currentView === 'config') currentView = 'overview';

  const activeCount = agentStatuses
    ? Object.values(agentStatuses as any).filter((s: any) => s.status === 'WORKING').length
    : bots.filter(b => b.status === 'WORKING').length

  const totalBots = bots.length
  const idleCount = bots.filter(b => b.status === 'IDLE').length

  return (
    <div className="flex min-h-screen text-slate-200 font-sans selection:bg-cyan-400/20">
      <Sidebar />
      <PageWrapper>
        <div className="glass-tile px-5 py-4 mb-6 md:mb-8 animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400 mb-1">
                Neural Command Surface
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                H.R.P. Alpha 2.0
              </h2>
              <p className="text-slate-400 mt-1 text-xs md:text-sm font-mono tracking-[0.18em] uppercase opacity-80">
                MIND_OS Homeostatic Regulation Protocol
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button className="border border-cyan-400/25 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 font-bold shadow-glow transition-all hover:scale-[1.02] active:scale-95">
                <Plus className="mr-2 h-4 w-4" /> Global Action
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue={currentView} key={currentView} className="space-y-6">
          <TabsList className="glass-tile p-1 h-auto rounded-xl2">
            <TabsTrigger
              value="overview"
              className="px-5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200 data-[state=active]:border data-[state=active]:border-cyan-400/20 rounded-lg"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="personas"
              className="px-5 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-200 data-[state=active]:border data-[state=active]:border-cyan-400/20 rounded-lg"
            >
              Personas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 animate-in fade-in-50 duration-500">
            {/* Zastąpiliśmy grid ze statystykami nowym komponentem */}
            <OverviewStats 
              totalBots={totalBots} 
              activeCount={activeCount} 
              idleCount={idleCount} 
              stats={stats} 
            />

            <Card className="glass-tile overflow-hidden">
              <CardHeader className="border-b border-white/10 bg-black/10 pb-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-white text-lg font-semibold flex items-center gap-2">
                    <Server className="h-5 w-5 text-cyan-400" />
                    Live Hive Management
                  </CardTitle>
                  <CustomBadge variant="outline" className="text-[10px] font-mono border-cyan-400/20 text-cyan-300 bg-cyan-500/5">
                    Auto-refresh: 4s
                  </CustomBadge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-black/15">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="w-[60px] pl-4 text-slate-400">Avatar</TableHead>
                      <TableHead className="text-slate-400 text-[11px] uppercase tracking-wider">Name</TableHead>
                      <TableHead className="text-slate-400 text-[11px] uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-slate-400 text-[11px] uppercase tracking-wider">Last Sync</TableHead>
                      <TableHead className="text-slate-400 text-[11px] uppercase tracking-wider">Recent Log</TableHead>
                      <TableHead className="text-right pr-6 text-[11px] uppercase tracking-wider text-slate-400">Controls</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {bots.length > 0 ? bots.map((bot) => (
                      <BotRow key={bot.id} bot={bot as any} />
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center text-slate-500 italic font-serif">
                          No personas detected in neural network.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* MissionControl przeniesione na dół */}
            <MissionControl activeBotsCount={activeCount} totalBotsCount={totalBots} />
          </TabsContent>

          <TabsContent value="personas" className="space-y-6 animate-in fade-in-50 duration-300">
            <PersonasTab bots={bots} />
          </TabsContent>
        </Tabs>

        <DashboardRefresher />
      </PageWrapper>
    </div>
  )
}

// ==========================================
// 3. HELPER COMPONENTS
// ==========================================

function CustomBadge({ children, variant, className }: any) {
  const styles = variant === 'outline'
    ? 'border border-white/10 bg-white/5'
    : 'bg-white/10 border border-white/10';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${styles} ${className}`}>
      {children}
    </span>
  )
}

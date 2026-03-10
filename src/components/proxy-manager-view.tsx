'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, Plus, Trash2, RefreshCw, Globe, Wifi, Server, CheckCircle, XCircle } from "lucide-react"
import { addProxies, deleteProxy, checkProxyStatus } from "@/app/actions"

interface ProxyItem {
  id: string
  ip: string
  port: string
  user: string
  protocol: string
  country: string
  status: string
  latency: number
}

export function ProxyManagerView({ initialProxies }: { initialProxies: ProxyItem[] }) {
  const [proxies, setProxies] = useState<ProxyItem[]>(initialProxies)
  const [isOpen, setIsOpen] = useState(false)
  const [bulkInput, setBulkInput] = useState("")
  const [isChecking, setIsChecking] = useState<string | null>(null) // ID sprawdzanego proxy

  // Obsługa dodawania
  const handleAdd = async () => {
    if (!bulkInput) return
    await addProxies(bulkInput)
    setIsOpen(false)
    setBulkInput("")
    // W prawdziwej produkcji odświeżylibyśmy listę router.refresh(), tu polegamy na revalidate
  }

  // Obsługa usuwania
  const handleDelete = async (id: string) => {
    // Optymistyczna aktualizacja UI
    setProxies(prev => prev.filter(p => p.id !== id))
    await deleteProxy(id)
  }

  // Obsługa sprawdzania statusu
  const handleCheck = async (id: string) => {
    setIsChecking(id)
    await checkProxyStatus(id)
    setIsChecking(null)
  }

  // Statystyki
  const onlineCount = proxies.filter(p => p.status === 'ONLINE').length
  const deadCount = proxies.filter(p => p.status === 'OFFLINE').length

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER & STATS */}
      <div className="grid gap-4 md:grid-cols-4 shrink-0">
         <Card className="glass-tile glass-tile-hover flex items-center p-4 gap-4 shadow-none">
            <div className="h-10 w-10 rounded-xl border border-cyan-400/15 bg-cyan-500/10 flex items-center justify-center text-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,.06),0_0_18px_rgba(34,211,238,.06)]">
               <Server className="h-5 w-5" />
            </div>
            <div>
               <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Total Proxies</p>
               <p className="text-xl font-bold text-white">{proxies.length}</p>
            </div>
         </Card>

         <Card className="glass-tile glass-tile-hover flex items-center p-4 gap-4 shadow-none">
            <div className="h-10 w-10 rounded-xl border border-green-400/15 bg-green-500/10 flex items-center justify-center text-green-400 shadow-[0_0_0_1px_rgba(74,222,128,.06),0_0_18px_rgba(74,222,128,.06)]">
               <Wifi className="h-5 w-5" />
            </div>
            <div>
               <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Online</p>
               <p className="text-xl font-bold text-white">{onlineCount}</p>
            </div>
         </Card>

         <Card className="glass-tile glass-tile-hover flex items-center p-4 gap-4 shadow-none">
            <div className="h-10 w-10 rounded-xl border border-red-400/15 bg-red-500/10 flex items-center justify-center text-red-400 shadow-[0_0_0_1px_rgba(248,113,113,.05),0_0_18px_rgba(248,113,113,.06)]">
               <XCircle className="h-5 w-5" />
            </div>
            <div>
               <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Offline</p>
               <p className="text-xl font-bold text-white">{deadCount}</p>
            </div>
         </Card>
         
         {/* ADD BUTTON */}
         <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
               <Button className="h-full glass-tile glass-tile-hover border-cyan-400/20 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-200 flex flex-col gap-1 items-center justify-center shadow-glow">
                  <Plus className="h-5 w-5" />
                  <span className="font-semibold">Import Proxies</span>
               </Button>
            </DialogTrigger>
            <DialogContent className="glass-tile border-white/10 text-slate-200">
               <DialogHeader>
                  <DialogTitle className="text-slate-100">Import Proxies</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Supported formats: <code className="rounded bg-black/30 px-1 py-0.5 text-slate-300">ip:port</code> or <code className="rounded bg-black/30 px-1 py-0.5 text-slate-300">ip:port:user:pass</code>
                  </DialogDescription>
               </DialogHeader>
               <Textarea 
                  placeholder={"192.168.1.1:8000\n10.0.0.1:3000:admin:secret"} 
                  className="bg-black/30 border-white/10 font-mono text-xs h-40 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
               />
               <DialogFooter>
                  <Button onClick={handleAdd} className="border border-cyan-400/20 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 shadow-glow">
                    Import to List
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>

      {/* PROXY TABLE */}
      <Card className="flex-1 min-h-0 glass-tile flex flex-col overflow-hidden shadow-none">
        <CardHeader className="py-3 px-4 border-b border-white/10 bg-black/10 flex flex-row items-center justify-between shrink-0">
           <div className="flex items-center gap-2">
             <Shield className="h-4 w-4 text-violet-400" />
             <span className="font-semibold text-white">Proxy List</span>
           </div>
        </CardHeader>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <Table>
              <TableHeader className="bg-black/15 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.14em]">IP Address</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.14em]">Port</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.14em]">Protocol</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.14em]">Location</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.14em]">Status</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.14em] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="font-mono text-xs">
                {proxies.length > 0 ? (
                  proxies.map((proxy) => (
                    <TableRow key={proxy.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                         <div className={`h-2 w-2 rounded-full shadow-[0_0_10px_currentColor] ${
                            proxy.status === 'ONLINE' ? 'bg-green-400 text-green-400' : 
                            proxy.status === 'OFFLINE' ? 'bg-red-400 text-red-400' : 'bg-slate-600 text-slate-600'
                         }`} />
                      </TableCell>
                      <TableCell className="text-white">{proxy.ip}</TableCell>
                      <TableCell className="text-slate-400">{proxy.port}</TableCell>
                      <TableCell className="text-slate-500 uppercase">{proxy.protocol}</TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2 text-slate-300">
                            <Globe className="h-3 w-3 text-slate-500" />
                            {proxy.country}
                         </div>
                      </TableCell>
                      <TableCell>
                         {proxy.status === 'ONLINE' ? (
                            <Badge variant="outline" className="text-green-300 border-green-400/20 bg-green-500/10 text-[10px]">
                               {proxy.latency}ms
                            </Badge>
                         ) : proxy.status === 'OFFLINE' ? (
                            <Badge variant="outline" className="text-red-300 border-red-400/20 bg-red-500/10 text-[10px]">
                               DEAD
                            </Badge>
                         ) : (
                            <Badge variant="outline" className="text-slate-400 border-white/10 bg-white/5 text-[10px]">
                               UNCHECKED
                            </Badge>
                         )}
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                              onClick={() => handleCheck(proxy.id)}
                              disabled={isChecking === proxy.id}
                            >
                               <RefreshCw className={`h-3 w-3 ${isChecking === proxy.id ? 'animate-spin text-cyan-400' : ''}`} />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-slate-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleDelete(proxy.id)}
                            >
                               <Trash2 className="h-3 w-3" />
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                     <TableCell colSpan={7} className="h-32 text-center text-slate-500 italic">
                        No proxies loaded. Import some to get started.
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

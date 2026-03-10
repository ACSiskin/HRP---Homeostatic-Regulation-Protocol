'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBot } from "@/app/actions"
import { Plus, Clock, Shield, MoreHorizontal, Settings } from "lucide-react"

export function PersonasTab({ bots }: { bots: any[] }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    await createBot(formData)
    setIsLoading(false)
    setIsOpen(false)
  }

  // Funkcja nawigacji - to ona naprawia problem
  const handleConfigClick = (botName: string) => {
    console.log("Navigating to config for:", botName) // Log dla debugowania
    router.push(`/?view=config&bot=${botName}`)
  }

  return (
    <div className="space-y-6">
      <div className="glass-tile px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mb-1">
            Identity Matrix
          </div>
          <h3 className="text-lg font-semibold text-white">Identity Management</h3>
          <p className="text-sm text-slate-400">Manage AI personalities and their configurations.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="border border-cyan-400/25 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 font-bold shadow-glow">
              <Plus className="mr-2 h-4 w-4" /> Create New Persona
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-tile border-white/10 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Create New Bot</DialogTitle>
              <DialogDescription className="text-slate-400">
                This will create a new folder in <code className="rounded bg-black/30 px-1 py-0.5 text-slate-300">/bots</code> based on the template.
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right text-slate-400">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g. Marek"
                    className="col-span-3 bg-black/30 border-white/10 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="border border-cyan-400/20 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 shadow-glow"
                >
                  {isLoading ? 'Creating...' : 'Generate Files'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {bots.map((bot) => (
          <Card key={bot.id} className="glass-tile glass-tile-hover transition-all group flex flex-col shadow-none overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4 pb-2 border-b border-white/5 bg-black/10">
              <Avatar className="h-12 w-12 border-2 border-white/10 group-hover:border-cyan-400/20 transition-colors">
                <AvatarImage src={`/avatars/${bot.name}.jpg`} />
                <AvatarFallback className="bg-black/30 text-slate-300 border border-white/10">
                  {bot.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <CardTitle className="text-base text-white truncate">
                  {bot.name.charAt(0).toUpperCase() + bot.name.slice(1)}
                </CardTitle>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Shield className="h-3 w-3 text-cyan-400" /> Social Bot
                </span>
              </div>
            </CardHeader>
            
            <CardContent className="pb-2 flex-1 pt-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-slate-400">Status</span>
                  <Badge
                    variant="outline"
                    className={
                      bot.status === 'WORKING'
                        ? 'text-green-300 border-green-400/20 bg-green-500/10'
                        : 'text-slate-400 border-white/10 bg-white/5'
                    }
                  >
                    {bot.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-400"/> Schedule</span>
                    <span className="font-mono">08:00 - 22:00</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-gradient-to-r from-cyan-500/50 to-violet-500/50 w-3/4 ml-4 rounded-full"></div>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-4 border-t border-white/10 flex justify-between gap-2 bg-black/5">
              {/* === TU JEST KLUCZOWY BUTTON === */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex-1 text-xs text-slate-300 hover:text-white h-8 hover:bg-white/5 border border-white/10 hover:border-cyan-400/20"
                onClick={(e) => {
                  e.preventDefault(); // Zapobiega dziwnym zachowaniom
                  handleConfigClick(bot.name);
                }}
              >
                 <Settings className="h-3 w-3 mr-2 text-cyan-400" />
                 Config
              </Button>

              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10">
                 <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}

// src/components/session-manager.tsx
'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Fingerprint, Key, Lock, Eye, EyeOff, RefreshCw, LogOut, CheckCircle, AlertTriangle, PlayCircle, Monitor } from "lucide-react"
import { saveCredentials, getCredentials, getSessionStatus, performLogin, clearSession } from "@/app/actions"

interface SessionManagerProps {
  botName: string
}

export function SessionManager({ botName }: SessionManagerProps) {
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactor, setTwoFactor] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [status, setStatus] = useState<'ACTIVE' | 'EXPIRED' | 'MISSING'>('MISSING')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoginRunning, setIsLoginRunning] = useState(false)

  // Ładowanie danych przy starcie
  useEffect(() => {
    loadData()
  }, [botName])

  async function loadData() {
    // 1. Pobierz credentials
    const creds = await getCredentials(botName)
    if (creds.success) {
      setLogin(creds.data.login || "")
      setPassword(creds.data.password || "")
      setTwoFactor(creds.data.twoFactor || "")
    }
    // 2. Pobierz status sesji
    const sess = await getSessionStatus(botName)
    // @ts-ignore
    setStatus(sess.status)
  }

  const handleSave = async () => {
    setIsLoading(true)
    await saveCredentials(botName, { login, password, twoFactor })
    setIsLoading(false)
    alert("Credentials secure saved.")
  }

  const handleLogin = async (type: 'AUTO' | 'INTERACTIVE') => {
    setIsLoginRunning(true)
    const res = await performLogin(botName, type)
    setIsLoginRunning(false)
    
    if (res.success) {
      setStatus('ACTIVE')
    } else {
      alert("Login failed: " + res.error)
    }
  }

  const handleLogout = async () => {
    await clearSession(botName)
    setStatus('MISSING')
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 h-full">
      
      {/* LEWA STRONA: STATUS & ACTIONS */}
      <div className="space-y-6">
        
        {/* Karta Statusu */}
        <Card className={`glass-tile shadow-none border-l-4 ${status === 'ACTIVE' ? 'border-l-green-400 bg-green-500/5' : status === 'EXPIRED' ? 'border-l-amber-400 bg-amber-500/5' : 'border-l-crimson-400 bg-crimson-500/5'} border-white/10`}>
          <CardHeader className="pb-2 border-b border-white/10 bg-black/10">
            <CardTitle className="text-sm font-medium text-slate-400 flex justify-between items-center uppercase tracking-[0.16em]">
              SESSION HEALTH
              {status === 'ACTIVE' && <Badge className="bg-green-500/15 text-green-300 border border-green-400/20">VALID</Badge>}
              {status === 'EXPIRED' && <Badge className="bg-amber-500/15 text-amber-300 border border-amber-400/20">STALE</Badge>}
              {status === 'MISSING' && <Badge className="bg-crimson-500/15 text-crimson-300 border border-crimson-400/20">NO SESSION</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
             <div className="flex items-center gap-3">
               {status === 'ACTIVE' ? (
                 <CheckCircle className="h-8 w-8 text-green-400" />
               ) : (
                 <AlertTriangle className={`h-8 w-8 ${status === 'EXPIRED' ? 'text-amber-400' : 'text-crimson-400'}`} />
               )}
               <div>
                 <p className="text-xl font-bold text-white">
                   {status === 'ACTIVE' ? 'Connected' : status === 'EXPIRED' ? 'Needs Refresh' : 'Disconnected'}
                 </p>
                 <p className="text-xs text-slate-500">
                   {status === 'ACTIVE' ? 'Cookies injected successfully.' : 'Bot cannot access platform.'}
                 </p>
               </div>
             </div>
          </CardContent>
        </Card>

        {/* Karta Akcji */}
        <Card className="glass-tile glass-tile-hover shadow-none">
          <CardHeader className="border-b border-white/10 bg-black/10">
            <CardTitle className="text-base text-white flex items-center gap-2">
               <PlayCircle className="h-5 w-5 text-cyan-400" /> Launch Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
             <Button 
                onClick={() => handleLogin('AUTO')} 
                disabled={isLoginRunning || status === 'ACTIVE'}
                className="w-full border border-cyan-400/25 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 shadow-glow disabled:opacity-50"
             >
                {isLoginRunning ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Fingerprint className="mr-2 h-4 w-4" />}
                {isLoginRunning ? 'Authenticating...' : 'Auto-Login (Headless)'}
             </Button>

             <Button 
                onClick={() => handleLogin('INTERACTIVE')}
                disabled={isLoginRunning}
                variant="outline" 
                className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
             >
                <Monitor className="mr-2 h-4 w-4 text-amber-400" /> Interactive Mode (GUI)
             </Button>

             {status === 'ACTIVE' && (
               <Button
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full bg-crimson-500/15 hover:bg-crimson-500/25 text-crimson-200 border border-crimson-400/20"
               >
                  <LogOut className="mr-2 h-4 w-4" /> Kill Session (Logout)
               </Button>
             )}
          </CardContent>
        </Card>
      </div>

      {/* PRAWA STRONA: CREDENTIALS FORM */}
      <Card className="glass-tile glass-tile-hover shadow-none">
         <CardHeader className="border-b border-white/10 bg-black/10">
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Key className="h-5 w-5 text-amber-400" /> Credentials Store
            </CardTitle>
            <CardDescription className="text-slate-400">Securely stored in /bots/{botName}/credentials.json</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4 pt-4">
            
            <div className="space-y-2">
               <Label className="text-slate-300">Facebook Login / Email</Label>
               <Input 
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="marek@example.com" 
                  className="bg-black/30 border-white/10 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
               />
            </div>

            <div className="space-y-2">
               <Label className="text-slate-300">Password</Label>
               <div className="relative">
                 <Input 
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-black/30 border-white/10 text-slate-200 pr-10 focus-visible:ring-cyan-400/40"
                 />
                 <button 
                   onClick={() => setShowPass(!showPass)}
                   className="absolute right-3 top-2.5 text-slate-500 hover:text-cyan-300 transition-colors"
                 >
                   {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                 </button>
               </div>
            </div>

            <div className="space-y-2">
               <Label className="flex justify-between text-slate-300">
                  <span>2FA Secret Key (Optional)</span>
                  <span className="text-[10px] text-cyan-400 cursor-pointer">What is this?</span>
               </Label>
               <Input 
                  value={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.value)}
                  placeholder="A1B2 C3D4..." 
                  className="bg-black/30 border-white/10 text-slate-200 font-mono text-xs placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
               />
               <p className="text-[10px] text-slate-500">For bypassing OTP automatically.</p>
            </div>

         </CardContent>
         <CardFooter className="border-t border-white/10 bg-black/5 pt-4">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full border border-cyan-400/20 bg-white/5 hover:bg-cyan-500/10 text-slate-100"
            >
               {isLoading ? 'Saving...' : 'Save Credentials'}
            </Button>
         </CardFooter>
      </Card>
    </div>
  )
}

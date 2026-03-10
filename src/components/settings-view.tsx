// src/components/settings-view.tsx
'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Key, ShieldAlert, Zap, Lock, 
  Bell, Radio, Smartphone, Trash2, Database, 
  Download, Save, AlertTriangle, Fingerprint, CheckCircle2, XCircle, Loader2
} from "lucide-react"

// Importujemy nasze akcje
import { 
  getSystemEnvStatus, 
  executeMasterKill, 
  sendTestNotification,
  getDatabaseSize,
  backupSystemDatabase,
  purgeSystemLogs
} from "@/app/actions"
import { toast } from "sonner" 

export function SettingsView() {
  const [killSwitch, setKillSwitch] = useState(false)
  const [humanizeDelay, setHumanizeDelay] = useState([5])
  const [isTestingNotify, setIsTestingNotify] = useState(false)
  
  // --- MAINTENANCE STATE ---
  const [dbSize, setDbSize] = useState("0.00")
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isPurging, setIsPurging] = useState(false)

  const [envStatus, setEnvStatus] = useState({
    openai: false,
    discordWebhook: false,
    captcha: false,
    sms: false
  })

  useEffect(() => {
    // 1. Ładowanie statusu .env
    getSystemEnvStatus().then(res => {
      if (res.success && res.env) {
        setEnvStatus(res.env)
      }
    })
    
    // 2. Ładowanie wagi bazy danych
    fetchDbSize()
  }, [])

  const fetchDbSize = async () => {
    const res = await getDatabaseSize()
    if (res.success && res.sizeMB) {
      setDbSize(res.sizeMB)
    }
  }

  // --- LOGIKA MASTER KILL SWITCH ---
  const handleKillSwitch = async (checked: boolean) => {
    setKillSwitch(checked);
    
    if (checked) {
      toast.error("MASTER KILL SWITCH ACTIVATED", {
        description: "Terminating all active instances globally..."
      });
      
      const res = await executeMasterKill();
      
      if (res.success) {
        toast.success(`SYSTEM PURGED. ${res.killedCount} bot(s) terminated successfully.`);
      } else {
        toast.error(`Purge failed: ${res.error}`);
        setKillSwitch(false); 
      }
    } else {
        toast.info("Master Kill Switch Disengaged", {
            description: "System ready for normal operations. You must manually wake up bots."
        });
    }
  }

  // --- LOGIKA POWIADOMIEŃ ---
  const handleTestNotification = async () => {
    if (!envStatus.discordWebhook) {
        toast.error("Webhook Missing", { description: "Configure DISCORD_WEBHOOK_URL in your .env file first." });
        return;
    }

    setIsTestingNotify(true);
    toast.info("Sending ping to remote channel...");
    
    const res = await sendTestNotification();
    
    if (res.success) {
        toast.success("Signal Acquired!", { description: "Test notification delivered successfully." });
    } else {
        toast.error("Transmission Failed", { description: res.error });
    }
    
    setIsTestingNotify(false);
  }

  // --- LOGIKA MAINTENANCE ---
  const handleBackup = async () => {
    setIsBackingUp(true);
    toast.info("Initializing database backup...");
    
    const res = await backupSystemDatabase();
    
    if (res.success) {
      toast.success("Backup Successful", { description: `Saved to: ${res.path}` });
    } else {
      toast.error("Backup Failed", { description: res.error });
    }
    setIsBackingUp(false);
  }

  const handlePurgeLogs = async () => {
    setIsPurging(true);
    toast.info("Purging old logs...");
    
    // Usuwamy logi starsze niż 7 dni
    const res = await purgeSystemLogs(7);
    
    if (res.success) {
      toast.success("Logs Purged", { description: `Removed ${res.count} obsolete log entries.` });
      await fetchDbSize(); // Odświeżamy wagę bazy po usunięciu
    } else {
      toast.error("Purge Failed", { description: res.error });
    }
    setIsPurging(false);
  }

  // Obliczenie procentowego zapełnienia dysku (zakładamy limit 1GB = 1024MB)
  const dbPercentage = Math.min(100, (parseFloat(dbSize) / 1024) * 100);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Fingerprint className="h-6 w-6 text-slate-400" />
            System Configuration
          </h2>
          <p className="text-sm text-slate-400">Global parameters, security protocols & API integrations.</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20">
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>

      {/* GRID 2x2 */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* 1. API VAULT (Klucze w .env) */}
        <Card className="bg-slate-950 border-slate-800 shadow-lg">
          <CardHeader className="border-b border-slate-900 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="p-2 bg-yellow-500/10 rounded-lg"><Key className="h-5 w-5 text-yellow-500" /></div>
                 <div>
                   <CardTitle className="text-base text-slate-200">API Vault (.env Mode)</CardTitle>
                   <CardDescription className="text-xs">Secrets locked safely in environment variables.</CardDescription>
                 </div>
              </div>
              <Badge variant="outline" className="text-emerald-500 border-emerald-900 bg-emerald-900/10 flex items-center gap-1">
                <Lock className="h-3 w-3" /> SECURED
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            
            <div className="flex items-center justify-between p-3 bg-black/40 border border-slate-800 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-xs text-slate-300">OpenAI Core (GPT-4)</Label>
                <div className="text-[10px] text-slate-500 font-mono">env: OPENAI_API_KEY</div>
              </div>
              {envStatus.openai ? (
                <Badge className="bg-green-900/30 text-green-400 border border-green-900"><CheckCircle2 className="h-3 w-3 mr-1" /> ACTIVE</Badge>
              ) : (
                <Badge variant="outline" className="text-red-400 border-red-900/50"><XCircle className="h-3 w-3 mr-1" /> MISSING</Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-black/40 border border-slate-800 rounded-lg">
              <div className="space-y-0.5">
                 <Label className="text-xs text-slate-300">2Captcha / Anti-Captcha</Label>
                 <div className="text-[10px] text-slate-500 font-mono">env: CAPTCHA_API_KEY</div>
              </div>
              {envStatus.captcha ? (
                <Badge className="bg-green-900/30 text-green-400 border border-green-900"><CheckCircle2 className="h-3 w-3 mr-1" /> ACTIVE</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500 border-slate-800">NOT SET</Badge>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-black/40 border border-slate-800 rounded-lg">
              <div className="space-y-0.5">
                 <Label className="text-xs text-slate-300">SMS-Activate Service</Label>
                 <div className="text-[10px] text-slate-500 font-mono">env: SMS_ACTIVATE_KEY</div>
              </div>
              {envStatus.sms ? (
                <Badge className="bg-green-900/30 text-green-400 border border-green-900"><CheckCircle2 className="h-3 w-3 mr-1" /> ACTIVE</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500 border-slate-800">NOT SET</Badge>
              )}
            </div>

            <p className="text-[10px] text-slate-500 italic mt-4">
              * To update keys, edit your system's .env file and restart the instance. UI inputs disabled for security.
            </p>

          </CardContent>
        </Card>

        {/* 2. STEALTH & SAFETY (Kill Switch) */}
        <Card className={`bg-slate-950 border-slate-800 shadow-lg transition-colors duration-500 ${killSwitch ? 'border-red-600/50 bg-red-950/5' : ''}`}>
          <CardHeader className="border-b border-slate-900 pb-3">
             <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className={`p-2 rounded-lg transition-colors ${killSwitch ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-500'}`}>
                   <ShieldAlert className="h-5 w-5" />
                 </div>
                 <div>
                   <CardTitle className={`text-base ${killSwitch ? 'text-red-400' : 'text-slate-200'}`}>Global Stealth</CardTitle>
                   <CardDescription className="text-xs">Safety overrides & limits.</CardDescription>
                 </div>
              </div>
              {killSwitch && <Badge className="bg-red-600 animate-pulse">EMERGENCY STOP</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            <div className="flex items-center justify-between p-4 border border-red-900/30 rounded-lg bg-red-950/10">
               <div className="space-y-0.5">
                  <div className="font-bold text-red-500 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> MASTER KILL SWITCH
                  </div>
                  <div className="text-xs text-red-400/70">Instantly stop all bot threads.</div>
               </div>
               <Switch 
                  checked={killSwitch}
                  onCheckedChange={handleKillSwitch}
                  className="data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-slate-700"
               />
            </div>

            <Separator className="bg-slate-800" />

            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <Label className="text-sm text-slate-300">Humanization Delay</Label>
                  <span className="text-xs font-mono text-blue-400">+{humanizeDelay} min</span>
               </div>
               <Slider 
                  defaultValue={[5]} 
                  max={60} 
                  step={1} 
                  value={humanizeDelay}
                  onValueChange={setHumanizeDelay}
                  className="py-2"
               />
               <p className="text-[10px] text-slate-500">
                 Adds random sleep intervals between actions. Current: <span className="text-slate-300">{humanizeDelay}m ± 2m</span>
               </p>
            </div>

          </CardContent>
        </Card>

        {/* 3. ALERTS (Powiadomienia) */}
        <Card className="bg-slate-950 border-slate-800 shadow-lg">
          <CardHeader className="border-b border-slate-900 pb-3">
             <div className="flex items-center gap-2">
                 <div className="p-2 bg-blue-500/10 rounded-lg"><Bell className="h-5 w-5 text-blue-500" /></div>
                 <div>
                   <CardTitle className="text-base text-slate-200">Notifications</CardTitle>
                   <CardDescription className="text-xs">Remote monitoring channels.</CardDescription>
                 </div>
              </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
             
             <div className="flex items-center justify-between p-3 bg-black/40 border border-slate-800 rounded-lg">
                <div className="space-y-0.5">
                   <Label className="text-xs text-slate-300 flex items-center gap-2">
                      <Radio className="h-3 w-3 text-indigo-400" /> Discord / Telegram Webhook
                   </Label>
                   <div className="text-[10px] text-slate-500 font-mono">env: DISCORD_WEBHOOK_URL</div>
                </div>
                {envStatus.discordWebhook ? (
                  <Badge className="bg-green-900/30 text-green-400 border border-green-900">CONNECTED</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 border-slate-800">MISSING</Badge>
                )}
             </div>

             <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <Label className="text-sm text-slate-300 font-normal">Notify on <span className="text-red-400">Ban / Checkpoint</span></Label>
                   <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                   <Label className="text-sm text-slate-300 font-normal">Notify on <span className="text-yellow-400">Low Balance</span></Label>
                   <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                   <Label className="text-sm text-slate-300 font-normal">Daily Summary Report</Label>
                   <Switch />
                </div>
             </div>

             <Button 
                variant="secondary" 
                onClick={handleTestNotification}
                disabled={isTestingNotify || !envStatus.discordWebhook}
                className="w-full h-8 text-xs bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
             >
                {isTestingNotify ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Smartphone className="h-3 w-3 mr-2" />}
                {isTestingNotify ? "Transmitting..." : "Send Test Notification"}
             </Button>

          </CardContent>
        </Card>

        {/* 4. MAINTENANCE (Dane) */}
        <Card className="bg-slate-950 border-slate-800 shadow-lg">
          <CardHeader className="border-b border-slate-900 pb-3">
             <div className="flex items-center gap-2">
                 <div className="p-2 bg-purple-500/10 rounded-lg"><Database className="h-5 w-5 text-purple-500" /></div>
                 <div>
                   <CardTitle className="text-base text-slate-200">System Maintenance</CardTitle>
                   <CardDescription className="text-xs">Storage & data integrity.</CardDescription>
                 </div>
              </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
             
             <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="h-20 flex flex-col gap-2 border-slate-800 hover:bg-slate-900 hover:border-slate-700 group"
                >
                   {isBackingUp ? (
                     <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
                   ) : (
                     <Download className="h-6 w-6 text-slate-500 group-hover:text-purple-400 transition-colors" />
                   )}
                   <div className="text-center">
                      <div className="text-xs font-bold text-slate-300">Backup DB</div>
                      <div className="text-[9px] text-slate-600">.sqlite / .json</div>
                   </div>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={handlePurgeLogs}
                  disabled={isPurging}
                  className="h-20 flex flex-col gap-2 border-slate-800 hover:bg-red-950/10 hover:border-red-900/50 group"
                >
                   {isPurging ? (
                     <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
                   ) : (
                     <Trash2 className="h-6 w-6 text-slate-500 group-hover:text-red-500 transition-colors" />
                   )}
                   <div className="text-center">
                      <div className="text-xs font-bold text-slate-300">Purge Logs</div>
                      <div className="text-[9px] text-slate-600">Older than 7 days</div>
                   </div>
                </Button>
             </div>

             <div className="bg-slate-900/50 p-3 rounded border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                   <span className="text-slate-500">Database Size</span>
                   <span className="text-slate-300 font-mono">{dbSize} MB</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-purple-600 transition-all duration-1000" 
                     style={{ width: `${dbPercentage}%` }}
                   ></div>
                </div>
                <div className="flex justify-between text-xs">
                   <span className="text-slate-500">Storage Limit</span>
                   <span className="text-slate-500 font-mono">1 GB</span>
                </div>
             </div>

          </CardContent>
        </Card>

      </div>
    </div>
  )
}

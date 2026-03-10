'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Image as ImageIcon, MapPin, Briefcase, GraduationCap, 
  Calendar, X, Save, Loader2, RefreshCw, Sun, Moon, CloudRain, 
  Coffee, Palmtree, AlertTriangle, Radio
} from "lucide-react"
import { getBotProfile, saveBotProfile, getBotMedia, getBotContext } from "@/app/actions"
import { BotContext } from "@/core/types"

interface BotPortfolioProps {
  botName: string
}

export function BotPortfolio({ botName }: BotPortfolioProps) {
  // --- STAN DANYCH ---
  const [profile, setProfile] = useState({
    age: "", location: "", job: "", edu: "", traits: [] as string[], interests: [] as string[]
  })
  const [mediaFiles, setMediaFiles] = useState<string[]>([])
  const [context, setContext] = useState<BotContext | null>(null)
  const [newInterest, setNewInterest] = useState("")
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // --- ŁADOWANIE DANYCH ---
  useEffect(() => {
    loadAllData()
  }, [botName])

  async function loadAllData() {
    setIsLoading(true)
    
    // 1. Profil (Bio)
    const prof = await getBotProfile(botName)
    if (prof.success && prof.data) setProfile(prev => ({ ...prev, ...prof.data }))
    
    // 2. Media (Zdjęcia)
    const media = await getBotMedia(botName)
    if (media.success) setMediaFiles(media.files)

    // 3. Context (Pogoda/Czas/Lokalizacja z Proxy)
    const ctx = await getBotContext(botName)
    if (ctx.success && ctx.data) setContext(ctx.data)
    
    setIsLoading(false)
  }

  // --- OBSŁUGA ZAPISU (AUTO-SAVE) ---
  const performSave = async (dataToSave: any) => {
    setIsSaving(true)
    await saveBotProfile(botName, dataToSave)
    setIsSaving(false)
  }

  const handleSave = async () => {
    await performSave(profile)
  }

  // --- OBSŁUGA INTERAKCJI ---
  const addInterest = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newInterest.trim()) {
       const tag = newInterest.trim()
       if (!profile.interests.includes(tag)) {
          const updatedInterests = [...profile.interests, tag]
          const updatedProfile = { ...profile, interests: updatedInterests }
          setProfile(updatedProfile)
          setNewInterest("")
          await performSave(updatedProfile)
       } else {
          setNewInterest("")
       }
    }
  }

  const removeInterest = async (tag: string) => {
    const updatedInterests = profile.interests.filter(t => t !== tag)
    const updatedProfile = { ...profile, interests: updatedInterests }
    setProfile(updatedProfile)
    await performSave(updatedProfile)
  }

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  // --- LOGIKA SPRAWDZANIA PROXY ---
  const isProxyMatch = () => {
    if (!profile.location || !context?.location) return false
    const targetCity = profile.location.toLowerCase().trim()
    const proxyInfo = context.location.toLowerCase()
    return proxyInfo.includes(targetCity) || (targetCity === 'warsaw' && proxyInfo.includes('warszawa'))
  }

  if (isLoading) return <div className="flex h-full items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2"/> Loading Persona DNA...</div>

  return (
    <div className="grid gap-4 md:grid-cols-3 h-full overflow-hidden content-start">
      
      {/* === SEKCJA 1: LIVE AWARENESS === */}
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1.1 CZAS & SLOT */}
          <Card className="glass-tile glass-tile-hover flex items-center p-3 gap-3 shadow-none">
              <div className={`p-2 rounded-xl border ${
                  context?.timeSlot === 'WORK' ? 'bg-amber-500/10 text-amber-400 border-amber-400/15' :
                  context?.timeSlot === 'EVENING' ? 'bg-violet-500/10 text-violet-400 border-violet-400/15' :
                  context?.timeSlot === 'MORNING' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-400/15' :
                  'bg-green-500/10 text-green-400 border-green-400/15' 
              }`}>
                  {context?.timeSlot === 'WORK' && <Briefcase className="h-5 w-5" />}
                  {context?.timeSlot === 'EVENING' && <Moon className="h-5 w-5" />}
                  {context?.timeSlot === 'MORNING' && <Coffee className="h-5 w-5" />}
                  {context?.timeSlot === 'DAY_OFF' && <Palmtree className="h-5 w-5" />}
                  {!context?.timeSlot && <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
              <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Time Slot</p>
                  <p className="text-sm font-bold text-slate-200">
                      {context?.timeSlot || "SYNCING..."} <span className="text-xs font-mono text-slate-500">{context?.localTime ? `(${context.localTime})` : ''}</span>
                  </p>
              </div>
          </Card>

          {/* 1.2 POGODA */}
          <Card className="glass-tile glass-tile-hover flex items-center p-3 gap-3 shadow-none">
              <div className={`p-2 rounded-xl border ${context?.weather?.isRaining ? 'bg-blue-500/10 text-blue-400 border-blue-400/15' : 'bg-yellow-500/10 text-yellow-400 border-yellow-400/15'}`}>
                  {context?.weather?.isRaining ? <CloudRain className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </div>
              <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Atmosphere</p>
                  <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      {context?.weather ? `${context.weather.temp}°C` : "--"}
                      <span className="text-xs font-normal text-slate-400 truncate max-w-[120px]">
                         {context?.weather?.description || "Checking satellites..."}
                      </span>
                  </p>
              </div>
          </Card>

          {/* --- SEKCJA NEWSÓW --- */}
          <Card className="md:col-span-3 glass-tile p-3 shadow-none mb-4">
              <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl border border-red-400/15 bg-red-500/10 text-red-400 shrink-0 mt-1">
                      <Radio className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="flex-1">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                          Local Intelligence ({profile.location || "Unknown"})
                      </p>
                      <div className="space-y-1">
                          {context?.headlines && context.headlines.length > 0 ? (
                              context.headlines.map((news, i) => (
                                  <p key={i} className="text-xs text-slate-300 font-mono truncate border-l-2 border-white/10 pl-2">
                                      {news}
                                  </p>
                              ))
                          ) : (
                              <p className="text-xs text-slate-600 italic">No news feed available.</p>
                          )}
                      </div>
                  </div>
              </div>
          </Card>

          {/* 1.3 LOKALIZACJA (OPERATIONAL AREA) */}
          <Card className="glass-tile glass-tile-hover flex items-center p-3 gap-3 shadow-none">
              <div className={`p-2 rounded-xl border ${isProxyMatch() ? 'bg-green-500/10 text-green-400 border-green-400/15' : 'bg-amber-500/10 text-amber-400 border-amber-400/15'}`}>
                   {isProxyMatch() ? <MapPin className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Operational Area</p>
                  <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-200 truncate pr-2">
                          {profile.location || "Not Set"}
                      </p>
                      {profile.location && (
                          <Badge variant="outline" className={`text-[9px] h-4 px-1 border ${isProxyMatch() ? 'bg-green-500/10 text-green-300 border-green-400/20' : 'bg-amber-500/10 text-amber-300 border-amber-400/20'}`}>
                              {isProxyMatch() ? 'PROXY MATCH' : 'MISMATCH'}
                          </Badge>
                      )}
                  </div>
              </div>
          </Card>
      </div>

      {/* === SEKCJA 2: KOLUMNA LEWA (EDYCJA BIO) === */}
      <div className="md:col-span-1 flex flex-col gap-4 h-full min-h-0">
        <Card className="glass-tile shadow-none flex flex-col h-full overflow-hidden">
           <CardHeader className="pb-2 flex flex-row items-center justify-between shrink-0 border-b border-white/10 bg-black/10">
              <CardTitle className="text-sm font-medium text-slate-300">Persona DNA</CardTitle>
              <div className="flex items-center gap-2">
                 {isSaving && <span className="text-[9px] text-green-400 animate-pulse font-mono">SAVING...</span>}
                 <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving} title="Force Save" className="h-8 w-8 hover:bg-white/5 border border-transparent hover:border-white/10">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-green-400"/> : <Save className="h-4 w-4 text-slate-400 hover:text-cyan-300"/>}
                 </Button>
              </div>
           </CardHeader>
           <CardContent className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar pt-4">
              
              <div className="flex items-center gap-4">
                 <Avatar className="h-16 w-16 border-2 border-white/10">
                    <AvatarImage src={`/avatars/${botName}.jpg`} />
                    <AvatarFallback className="bg-black/20 text-slate-300 border border-white/10">{botName[0].toUpperCase()}</AvatarFallback>
                 </Avatar>
                 <div>
                    <h3 className="text-lg font-bold text-white capitalize">{botName}</h3>
                    <p className="text-xs text-slate-500 font-mono">ID: {botName.substring(0,4).toUpperCase()}...</p>
                 </div>
              </div>
              
              <Separator className="bg-white/10"/>
              
              <div className="space-y-3">
                 <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-500 shrink-0"/> 
                    <Input 
                      placeholder="Location (e.g. Warsaw)" 
                      className="h-7 text-xs bg-black/20 border-white/10 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
                      value={profile.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      onBlur={handleSave}
                    />
                 </div>
                 <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-500 shrink-0"/> 
                    <Input 
                      placeholder="Job Title" 
                      className="h-7 text-xs bg-black/20 border-white/10 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
                      value={profile.job}
                      onChange={(e) => handleChange('job', e.target.value)}
                      onBlur={handleSave}
                    />
                 </div>
                 <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-slate-500 shrink-0"/> 
                    <Input 
                      placeholder="Education" 
                      className="h-7 text-xs bg-black/20 border-white/10 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
                      value={profile.edu}
                      onChange={(e) => handleChange('edu', e.target.value)}
                      onBlur={handleSave}
                    />
                 </div>
                 <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500 shrink-0"/> 
                    <Input 
                      placeholder="Age" 
                      className="h-7 text-xs bg-black/20 border-white/10 w-20 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
                      value={profile.age}
                      onChange={(e) => handleChange('age', e.target.value)}
                      onBlur={handleSave}
                    />
                 </div>
              </div>

              <Separator className="bg-white/10"/>
              
              <div className="pt-2">
                 <p className="text-xs text-slate-500 mb-2">Interests / Keywords (Type & Enter):</p>
                 <Input 
                    placeholder="+ Add interest..." 
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyDown={addInterest}
                    className="h-8 text-xs bg-black/20 border-white/10 mb-2 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
                 />
                 <div className="flex flex-wrap gap-1">
                    {profile.interests.length > 0 ? profile.interests.map(i => (
                      <Badge key={i} variant="secondary" className="text-[10px] bg-white/5 text-slate-300 hover:bg-white/10 pr-1 border border-white/10">
                        #{i}
                        <X className="h-3 w-3 ml-1 cursor-pointer hover:text-red-400" onClick={() => removeInterest(i)}/>
                      </Badge>
                    )) : <span className="text-[10px] text-slate-600 italic">No interests defined.</span>}
                 </div>
              </div>
           </CardContent>
        </Card>
      </div>

      {/* === SEKCJA 3: KOLUMNA PRAWA (MEDIA STASH) === */}
      <Card className="md:col-span-2 glass-tile shadow-none flex flex-col h-full min-h-0 overflow-hidden">
         <CardHeader className="border-b border-white/10 pb-3 flex flex-row items-center justify-between shrink-0 bg-black/10">
            <div>
               <CardTitle className="text-base text-slate-200 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-violet-400" /> Media Stash
               </CardTitle>
               <CardDescription className="text-xs text-slate-500">
                  Scanning: <code className="bg-black/20 px-1 py-0.5 rounded text-slate-400 border border-white/10">/bots/{botName}/media/</code>
               </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={loadAllData} className="text-xs border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10">
               <RefreshCw className="h-3 w-3 mr-2 text-cyan-400" /> Refresh
            </Button>
         </CardHeader>
         
         <ScrollArea className="flex-1 p-4 bg-[rgba(7,11,18,0.25)]">
            {mediaFiles.length > 0 ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mediaFiles.map((file, index) => (
                     <div key={index} className="group relative aspect-square bg-black/20 rounded-xl border border-white/10 overflow-hidden hover:border-cyan-400/20 transition-colors">
                        <img 
                          src={`/api/media?bot=${botName}&file=${file}`} 
                          alt={file}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute top-2 left-2">
                           <Badge className="text-[9px] h-4 px-1 bg-green-500/15 text-green-200 backdrop-blur-sm border border-green-400/20">FRESH</Badge>
                        </div>
                        <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm p-1 border-t border-white/10">
                           <p className="text-[9px] text-center text-slate-300 truncate">{file}</p>
                        </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-3">
                  <ImageIcon className="h-10 w-10 opacity-20 text-cyan-400" />
                  <p className="text-sm">Folder is empty or missing.</p>
                  <p className="text-xs font-mono bg-black/20 p-2 rounded border border-white/10 text-slate-500">
                    Add photos to: /bots/{botName}/media/
                  </p>
               </div>
            )}
         </ScrollArea>
      </Card>
    </div>
  )
}

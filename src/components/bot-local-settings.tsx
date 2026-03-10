// src/components/bot-local-settings.tsx
'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
   Clock, Hash, Shield, Save, X, Brain,
   Search, Users, Crown, Wifi, Heart, Power
} from "lucide-react"
import { getBotInstincts, updateBotInstincts, getBotSettings, updateBotSettings } from "@/app/actions"
import { toast } from "sonner"

interface BotLocalSettingsProps {
   botName: string
}

export function BotLocalSettings({ botName }: BotLocalSettingsProps) {
   // --- STATE ---
   const [hashtags, setHashtags] = useState<string[]>([])
   const [newTag, setNewTag] = useState("")
   const [postFreq, setPostFreq] = useState([2])
   const [commentFreq, setCommentFreq] = useState([15])
   const [perception, setPerception] = useState([60])
   const [isAutonomous, setIsAutonomous] = useState(false)
   const [humanizedHours, setHumanizedHours] = useState(true)

   const [instincts, setInstincts] = useState<any>(null)

   // Ładowanie danych z backendu przy starcie
   useEffect(() => {
      if (botName) {
         // Ładowanie instynktów (Drives)
         getBotInstincts(botName).then(res => {
            if (res.success) setInstincts(res.drives)
         })
         
         // Ładowanie ustawień fizycznych (Pętla Życia)
         getBotSettings(botName).then(res => {
            if (res.success && res.settings) {
                setIsAutonomous(res.settings.is_autonomous === true)
                setHumanizedHours(res.settings.humanized_hours !== false) // default true
                if (res.settings.post_freq) setPostFreq([res.settings.post_freq])
                if (res.settings.comment_freq) setCommentFreq([res.settings.comment_freq])
                if (res.settings.perception_interval) setPerception([res.settings.perception_interval])
                if (res.settings.target_hashtags) setHashtags(res.settings.target_hashtags)
            }
         })
      }
   }, [botName])

   // --- AUTO-ZAPIS USTAWIEŃ ---
   const saveSetting = async (key: string, value: any) => {
      const res = await updateBotSettings(botName, { [key]: value })
      if (!res.success) toast.error("Failed to save " + key)
   }

   const handleInstinctChange = async (key: string, val: number) => {
      setInstincts((prev: any) => ({ ...prev, [key]: val }))
      await updateBotInstincts(botName, { [key]: val })
   }

   const addTag = async (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && newTag.trim()) {
         if (!hashtags.includes(newTag.trim())) {
            const newTags = [...hashtags, newTag.trim()];
            setHashtags(newTags)
            await saveSetting('target_hashtags', newTags)
         }
         setNewTag("")
      }
   }

   const removeTag = async (tag: string) => {
      const newTags = hashtags.filter(t => t !== tag);
      setHashtags(newTags)
      await saveSetting('target_hashtags', newTags)
   }

   return (
      <div className="grid gap-6 md:grid-cols-2 p-6 overflow-y-auto h-full bg-transparent font-sans">

         {/* 🧠 SECTION 1: COGNITIVE INSTINCTS */}
         <Card className="glass-tile glass-tile-hover shadow-none overflow-hidden">
            <CardHeader className="border-b border-white/10 bg-black/10">
               <CardTitle className="text-sm font-bold flex items-center gap-2 text-violet-300 uppercase tracking-widest">
                  <Brain className="h-4 w-4 text-violet-400" /> Neuro-Biology & Drives
               </CardTitle>
               <CardDescription className="text-[10px] text-slate-500 uppercase tracking-tighter">
                  Baseline motivation & Hormonal regulation
               </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-7">
               {[
                  { id: 'curiosity', label: 'Curiosity', icon: <Search className="h-3 w-3 text-blue-400" /> },
                  { id: 'safety', label: 'Safety', icon: <Shield className="h-3 w-3 text-green-400" /> },
                  { id: 'affiliation', label: 'Affiliation', icon: <Users className="h-3 w-3 text-indigo-400" /> },
                  { id: 'dominance', label: 'Dominance', icon: <Crown className="h-3 w-3 text-amber-400" /> },
                  { id: 'libido', label: 'Libido / Intimacy', icon: <Heart className="h-3 w-3 text-pink-400" /> }
               ].map((item) => (
                  <div key={item.id} className="space-y-3">
                     <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-2 tracking-[0.12em]">
                           {item.icon} {item.label}
                        </Label>
                        <Badge variant="outline" className="text-[9px] font-mono border-violet-400/20 text-violet-300 bg-violet-500/10">
                           {instincts?.[item.id]?.toFixed(2) || "0.50"}
                        </Badge>
                     </div>
                     <div className="relative pt-1">
                        <Slider
                           value={[instincts?.[item.id] || 0.5]}
                           max={1} step={0.01}
                           className="rounded-full h-1.5 cursor-pointer"
                           onValueChange={(val) => handleInstinctChange(item.id, val[0])}
                        />
                     </div>
                  </div>
               ))}
            </CardContent>
         </Card>

         {/* 🕒 SECTION 2: ACTIVITY SCHEDULE & AUTONOMY */}
         <Card className="glass-tile glass-tile-hover shadow-none overflow-hidden border-cyan-900/50">
            <CardHeader className="border-b border-cyan-900/30 bg-cyan-950/20">
               <CardTitle className="text-sm font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-widest">
                  <Clock className="h-4 w-4" /> Autonomy & Schedule
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
               
               {/* GŁÓWNY WŁĄCZNIK AUTONOMII */}
               <div className="flex items-center justify-between p-4 bg-black/40 border border-cyan-900/50 rounded-lg">
                  <div className="space-y-1">
                     <Label className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Power className={`h-4 w-4 ${isAutonomous ? 'text-green-400 animate-pulse' : 'text-slate-600'}`} /> 
                        Master Autonomy Loop
                     </Label>
                     <p className="text-[10px] text-slate-400">Allows the agent to wake up and act on its own.</p>
                  </div>
                  <Switch 
                    checked={isAutonomous} 
                    onCheckedChange={(val) => {
                        setIsAutonomous(val);
                        saveSetting('is_autonomous', val);
                        toast.success(val ? "Agent is now Fully Autonomous!" : "Autonomy Disabled.");
                    }} 
                    className="data-[state=checked]:bg-green-500"
                  />
               </div>

               <div className="flex items-center justify-between pb-2 pt-2">
                  <div className="space-y-0.5">
                     <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Humanized Working Hours</Label>
                     <p className="text-[10px] text-slate-500">Sleeps at night (23:00 - 07:00).</p>
                  </div>
                  <Switch 
                    checked={humanizedHours} 
                    onCheckedChange={(val) => { setHumanizedHours(val); saveSetting('humanized_hours', val); }} 
                  />
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">
                     <span>Max Daily Posts</span>
                     <span className="text-cyan-300">{postFreq} / day</span>
                  </div>
                  <Slider
                     value={postFreq}
                     onValueChange={(val) => { setPostFreq(val); saveSetting('post_freq', val[0]); }}
                     max={12} step={1}
                     className="rounded-full"
                  />
               </div>

               <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">
                     <span>Perception Interval (Vigilance)</span>
                     <span className="text-pink-300">{perception[0]} min</span>
                  </div>
                  <div className="text-[9px] text-slate-600 mb-2">How often the background loop wakes up the bot to think.</div>
                  <Slider
                     value={perception}
                     max={240} min={5} step={5}
                     className="rounded-full"
                     onValueChange={(val) => { setPerception(val); saveSetting('perception_interval', val[0]); }}
                  />
               </div>
            </CardContent>
         </Card>

         {/* 🎯 SECTION 3: ENGAGEMENT STRATEGY */}
         <Card className="glass-tile glass-tile-hover shadow-none overflow-hidden">
            <CardHeader className="border-b border-white/10 bg-black/10">
               <CardTitle className="text-sm font-bold text-slate-100 flex items-center gap-2 uppercase tracking-widest">
                  <Hash className="h-4 w-4 text-pink-400" /> Engagement Strategy
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Hashtags / Topics</Label>
                  <div className="flex flex-wrap gap-2">
                     {hashtags.map(tag => (
                        <Badge key={tag} className="bg-white/5 border border-white/10 text-slate-300 text-[9px] py-1 hover:bg-white/10">
                           #{tag}
                           <X className="h-2.5 w-2.5 ml-2 cursor-pointer hover:text-red-400" onClick={() => removeTag(tag)} />
                        </Badge>
                     ))}
                  </div>
                  <Input
                     placeholder="Press Enter to add tag..."
                     value={newTag}
                     onChange={(e) => setNewTag(e.target.value)}
                     onKeyDown={addTag}
                     className="bg-black/20 border-white/10 text-[11px] h-8 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
                  />
               </div>
            </CardContent>
         </Card>

      </div>
   )
}

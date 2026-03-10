'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Book, Fingerprint, Calendar, Activity } from "lucide-react"
import { getBotAutobiography } from "@/app/actions"

interface BotJournalProps {
  botName: string
}

export function BotJournal({ botName }: BotJournalProps) {
  const [bio, setBio] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (botName) {
      getBotAutobiography(botName).then(res => {
        if (res.success) setBio(res.data)
        setLoading(false)
      })
    }
  }, [botName])

  if (loading) return <div className="p-4 text-xs text-slate-500">Loading memories...</div>
  if (!bio) return <div className="p-4 text-xs text-slate-500">No autobiography found. Trigger sleep cycle first.</div>

  // Sortowanie rozdziałów: najnowsze na górze
  const chapters = [...(bio.chapters || [])].reverse();

  return (
    <div className="grid gap-6 p-6 h-full overflow-hidden bg-transparent font-sans">
      
      {/* 🧠 HEADER: CURRENT SELF MODEL */}
      <Card className="glass-tile shadow-none overflow-hidden">
        <CardHeader className="pb-3 border-b border-white/10 bg-black/10">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-violet-300 uppercase tracking-widest">
                <Fingerprint className="h-4 w-4 text-violet-400" /> Current Identity Model
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
            <p className="text-xs text-slate-300 italic font-serif leading-relaxed border-l-2 border-violet-400/20 pl-3">
                "{bio.currentSelfModel}"
            </p>
            <div className="mt-3 flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-[9px] border-violet-400/20 text-violet-300 bg-violet-500/10">
                    Created: {new Date(bio.createdAt).toLocaleDateString()}
                </Badge>
                <Badge variant="outline" className="text-[9px] border-cyan-400/20 text-cyan-300 bg-cyan-500/10">
                    Chapters: {bio.chapters?.length || 0}
                </Badge>
            </div>
        </CardContent>
      </Card>

      {/* 📖 TIMELINE: CHAPTERS */}
      <div className="flex flex-col gap-2 min-h-0">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2 pl-1 tracking-[0.14em]">
             <Book className="h-3 w-3 text-cyan-400" /> Life Chapters (Reverse Chronological)
          </h3>
          
          <ScrollArea className="flex-1 pr-4 h-[400px]">
             <div className="space-y-4">
                {chapters.map((chapter: any) => (
                    <Card key={chapter.id} className="glass-tile glass-tile-hover shadow-none overflow-hidden">
                        <CardHeader className="py-3 border-b border-white/10 bg-black/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-xs font-bold text-slate-100">
                                        {chapter.title}
                                    </CardTitle>
                                    <CardDescription className="text-[10px] flex items-center gap-2 mt-1 text-slate-500">
                                        <Calendar className="h-3 w-3 text-cyan-400" /> {chapter.date}
                                        <span className="text-slate-700">|</span>
                                        <Activity className="h-3 w-3 text-pink-400" /> {chapter.dominantEmotion}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="py-3 space-y-3">
                            {/* Stats Snapshot */}
                            <div className="flex gap-2 mb-2 flex-wrap">
                                <Badge className="bg-pink-500/10 text-pink-300 border border-pink-400/20 text-[9px] hover:bg-pink-500/15">
                                    Libido: {chapter.statsSnapshot?.avgLibido?.toFixed(2) || "?"}
                                </Badge>
                                <Badge className="bg-blue-500/10 text-blue-300 border border-blue-400/20 text-[9px] hover:bg-blue-500/15">
                                    Energy: {chapter.statsSnapshot?.avgEnergy?.toFixed(0) || "?"}%
                                </Badge>
                            </div>

                            {/* Content */}
                            <p className="text-[11px] text-slate-300 leading-5 font-serif border-l-2 border-white/10 pl-3">
                                {chapter.content}
                            </p>

                            {/* Key Learnings */}
                            {chapter.keyLearnings && chapter.keyLearnings.length > 0 && (
                                <div className="pt-2 bg-black/20 p-3 rounded-xl border border-white/10">
                                    <span className="text-[9px] font-bold text-green-400 uppercase block mb-1 tracking-[0.12em]">Learnings:</span>
                                    <ul className="list-disc list-inside text-[10px] text-slate-400 space-y-0.5">
                                        {chapter.keyLearnings.map((l: string, i: number) => (
                                            <li key={i}>{l}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
             </div>
          </ScrollArea>
      </div>
    </div>
  )
}

// src/components/hive-mind-view.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Dodałem 'Heart' do importów poniżej
import { Send, Activity, Zap, Radio, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHiveHistory, postHiveAdminMessage, getHiveNetwork } from "@/app/actions";

interface HiveMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  emotion: string;
  arousal: number;
}

interface NetworkNode {
  id: string; // name
  status: string;
  avatar: string;
  x?: number; // Pozycja obliczana dynamicznie
  y?: number;
}

interface NetworkEdge {
  from: string;
  to: string;
  score: number;
}

const emotionConfig: any = {
  anger: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-400/20', icon: '🤬' },
  joy: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-400/20', icon: '😂' },
  sadness: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-400/20', icon: '😭' },
  fear: { color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-400/20', icon: '😱' },
  neutral: { color: 'text-slate-400', bg: 'bg-white/5 border-white/10', icon: '😐' },
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-black/20 rounded-2xl rounded-bl-none border border-white/10 backdrop-blur-md w-fit animate-in fade-in slide-in-from-bottom-2">
      <div className="w-2 h-2 bg-cyan-400/70 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-cyan-400/70 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-cyan-400/70 rounded-full animate-bounce"></div>
      <span className="ml-2 text-xs text-slate-400 font-mono">pisze...</span>
    </div>
  );
}

interface HiveMindViewProps {
  nodes?: any[];
  edges?: any[];
}

export default function HiveMindView({ nodes: initialNodes, edges: initialEdges }: HiveMindViewProps = {}) {
  const [messages, setMessages] = useState<HiveMessage[]>([]);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);

  // --- 1. POBIERANIE WIADOMOŚCI (CHAT) ---
  const fetchMessages = async () => {
    const res = await getHiveHistory();
    if (res.success && Array.isArray(res.data)) {
      const sorted = (res.data as any[]).sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      if (sorted.length > messages.length) setIsSomeoneTyping(false);
      setMessages(sorted);
      setIsLive(true);
    }
  };

  // --- 2. POBIERANIE TOPOLOGII (BOTY) ---
  const fetchNetwork = async () => {
    const res = await getHiveNetwork();
    if (res.success && res.nodes) {
      const count = res.nodes.length;
      const radius = 35; // Promień okręgu w %
      const centerX = 50;
      const centerY = 50;

      const positionedNodes = res.nodes.map((node: any, index: number) => {
        const angle = (index / count) * 2 * Math.PI - (Math.PI / 2); // Start od góry
        return {
          ...node,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });

      setNodes(positionedNodes);
      setEdges(res.edges || []);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchNetwork();
    const interval = setInterval(() => {
      fetchMessages();
      if (Math.random() > 0.8) fetchNetwork();
    }, 2000);
    return () => clearInterval(interval);
  }, [messages.length]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSomeoneTyping]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const tempMsg: HiveMessage = {
      id: Date.now().toString(), senderId: 'admin', content: input,
      timestamp: new Date().toISOString(), emotion: 'neutral', arousal: 1
    };
    setMessages(prev => [...prev, tempMsg]);
    setIsSomeoneTyping(true);
    setTimeout(() => setIsSomeoneTyping(false), 20000);
    await postHiveAdminMessage(input);
    setInput('');
  };

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-transparent text-slate-300 p-4 gap-4 font-sans selection:bg-cyan-400/20">

      {/* LEWA KOLUMNA: CZAT */}
      <Card className="flex-1 flex flex-col glass-tile h-full shadow-none overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-10 [mask-image:radial-gradient(circle_at_30%_10%,black,transparent_75%)] bg-[linear-gradient(to_right,rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,.12)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <CardHeader className="pb-3 border-b border-white/10 flex flex-row items-center justify-between sticky top-0 bg-[rgba(7,11,18,0.85)] backdrop-blur-md z-10">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-slate-100 tracking-wide">
              <Zap className="h-4 w-4 text-amber-400" />
              HIVE MIND PROTOCOL
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs font-mono uppercase">
              ACTIVE NODES: {nodes.map(n => n.id).join(', ') || "SEARCHING..."}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border-white/10 bg-white/5 text-xs font-mono",
              isLive ? "text-green-300 border-green-400/20 bg-green-500/10" : "text-amber-300 border-amber-400/20 bg-amber-500/10"
            )}
          >
            {isLive ? <Activity className="w-3 h-3 mr-2 animate-pulse" /> : <Radio className="w-3 h-3 mr-2 animate-spin" />}
            {isLive ? "LIVE" : "SYNC..."}
          </Badge>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
          <ScrollArea className="flex-1 p-4 z-10">
            <div className="space-y-6">
              {messages.map((msg) => {
                const isMe = msg.senderId === 'admin';
                const emo = emotionConfig[msg.emotion] || emotionConfig['neutral'];
                return (
                  <div key={msg.id} className={cn("flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? "justify-end" : "justify-start")}>
                    {!isMe && (
                      <Avatar className="h-9 w-9 border border-white/10 mt-1 shadow-lg ring-2 ring-black/30">
                        <AvatarImage src={`/avatars/${msg.senderId}.jpg`} />
                        <AvatarFallback className="bg-black/30 text-slate-400 text-xs font-bold border border-white/10">{msg.senderId[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn("flex flex-col max-w-[80%]", isMe ? "items-end" : "items-start")}>
                      {!isMe && (
                        <span className="text-[10px] text-slate-500 mb-1 ml-1 flex items-center gap-2 uppercase tracking-widest font-bold font-mono">
                          {msg.senderId}
                        </span>
                      )}
                      <div
                        className={cn(
                          "relative px-4 py-3 text-sm shadow-xl transition-all duration-300 border backdrop-blur-md",
                          isMe
                            ? "bg-cyan-500/15 text-cyan-50 rounded-2xl rounded-br-sm border-cyan-400/25 shadow-[0_0_0_1px_rgba(34,211,238,.08),0_0_20px_rgba(34,211,238,.08)]"
                            : `${emo.bg} text-slate-200 rounded-2xl rounded-bl-sm`
                        )}
                      >
                        <span className="leading-relaxed">{msg.content}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {isSomeoneTyping && (
                <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2">
                  <Avatar className="h-9 w-9 border border-white/10 mt-1 opacity-50">
                    <AvatarFallback className="bg-black/30 border border-white/10 text-slate-500">...</AvatarFallback>
                  </Avatar>
                  <TypingIndicator />
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-white/10 bg-[rgba(7,11,18,0.75)] backdrop-blur-md flex gap-3 z-20">
            <Input
              placeholder="Wiadomość do roju..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="bg-black/20 border-white/10 text-slate-200 font-mono text-sm placeholder:text-slate-500 focus-visible:ring-cyan-400/40"
            />
            <Button
              onClick={handleSendMessage}
              size="icon"
              className="border border-cyan-400/20 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 shrink-0 shadow-glow"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PRAWA KOLUMNA: WIZUALIZACJA DYNAMICZNA */}
      <div className="w-96 flex flex-col gap-4 h-full hidden md:flex">

        {/* NEURAL TOPOLOGY (SVG) */}
        <Card className="glass-tile shrink-0 h-80 relative overflow-hidden shadow-none">
          <CardHeader className="pb-2 border-b border-white/10 bg-black/10">
            <CardTitle className="text-xs text-slate-400 font-mono uppercase tracking-[0.16em]">Neural Topology</CardTitle>
          </CardHeader>
          <CardContent className="h-full relative p-0">
            <div className="absolute inset-0 opacity-10 pointer-events-none [mask-image:radial-gradient(circle_at_center,black,transparent_80%)] bg-[linear-gradient(to_right,rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,.12)_1px,transparent_1px)] bg-[size:24px_24px]" />
            <svg className="w-full h-full z-10 pointer-events-none absolute inset-0">
              {/* LINIE POŁĄCZEŃ (Edges) */}
              {edges.map((edge, idx) => {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                // Kolor linii zależny od relacji
                const strokeColor = edge.score > 0 ? "stroke-cyan-400/20" : "stroke-crimson-400/20";

                return (
                  <line
                    key={idx}
                    x1={`${fromNode.x}%`} y1={`${fromNode.y}%`}
                    x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                    className={`${strokeColor} stroke-1`}
                  />
                );
              })}

              {/* WĘZŁY (Nodes) */}
              {nodes.map((node) => (
                <g key={node.id}>
                  {/* Aura */}
                  <circle cx={`${node.x}%`} cy={`${node.y}%`} r="35" className="fill-cyan-400/5 animate-pulse duration-[3000ms]" />
                  {/* Kropka */}
                  <circle cx={`${node.x}%`} cy={`${node.y}%`} r="6" className="fill-[rgba(7,11,18,0.95)] stroke-cyan-300/60 stroke-2" />

                  {/* Awatar (opcjonalny) */}
                  <foreignObject x={`calc(${node.x}% - 10px)`} y={`calc(${node.y}% - 10px)`} width="20" height="20">
                    <img src={node.avatar} className="w-full h-full rounded-full opacity-80" onError={(e) => e.currentTarget.style.display = 'none'} />
                  </foreignObject>

                  {/* Podpis */}
                  <text x={`${node.x}%`} y={`${node.y}%`} dy="25" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono uppercase font-bold">{node.id}</text>
                </g>
              ))}
            </svg>

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs font-mono">
                SCANNING NEURAL NET...
              </div>
            )}
          </CardContent>
        </Card>

        {/* SYNC MATRIX (TABELA) */}
        <Card className="glass-tile flex-1 shadow-none overflow-hidden">
          <CardHeader className="pb-2 border-b border-white/10 bg-black/10">
            <CardTitle className="text-xs font-bold flex items-center gap-2 text-slate-400 uppercase tracking-widest font-mono">
              <Heart className="h-3 w-3 text-crimson-400" />
              Sync Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[400px]">
            {edges.length > 0 ? edges.map((rel, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-b border-white/10 pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-bold">{rel.from}</span>
                  <span className="text-slate-600">vs</span>
                  <span className="text-slate-200 font-bold">{rel.to}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] border",
                    rel.score > 0
                      ? "text-green-300 border-green-400/20 bg-green-500/10"
                      : "text-crimson-300 border-crimson-400/20 bg-crimson-500/10"
                  )}
                >
                  {rel.score > 0 ? 'SYNCED' : 'CONFLICT'} ({rel.score})
                </Badge>
              </div>
            )) : (
              <p className="text-center text-slate-600 text-xs mt-4">Brak wystarczającej liczby botów do analizy.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

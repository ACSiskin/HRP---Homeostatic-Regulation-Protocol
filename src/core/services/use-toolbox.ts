// src/core/services/use-toolbox.ts
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { 
  getMcpServers, addMcpServer, removeMcpServer, 
  updateMcpServer, toggleToolCensor, getBotConfig, getBotMentalState,
  pingAllTools
} from "@/app/actions"

// ZMIANA: Dodano 'PLUGIN' do dozwolonych typów protokołów
export type ProtocolType = 'MCP' | 'REST_API' | 'LOCAL_SHELL' | 'PLUGIN';

export interface NewServerState {
  name: string;
  description: string;
  customHeaders: string; // <--- NOWOŚĆ: Stan dla naszych ukrytych nagłówków API
  url: string;
  cost: number;
  auto: boolean;
  protocol: ProtocolType;
}

export function useToolbox(bots: any[]) {
  const [selectedBot, setSelectedBot] = useState<any>(bots[0] || null)
  const [servers, setServers] = useState<any[]>([])
  const [isCensorActive, setIsCensorActive] = useState(true)
  const [botEnergy, setBotEnergy] = useState<number>(100)
  const [isLoading, setIsLoading] = useState(false)
  
  // State dla formularza dodawania narzędzia
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newServer, setNewServer] = useState<NewServerState>({
    name: "",
    description: "", 
    customHeaders: "", // Domyślnie puste
    url: "",
    cost: 15,
    auto: false,
    protocol: 'REST_API' // Domyślnie na REST API
  })

  // State dla ostrzeżenia Systemu 3
  const [isWarningOpen, setIsWarningOpen] = useState(false)

  // ==========================================
  // SYNC: selectedBot vs bots (gdy bots ładuje się później / zmienia)
  // ==========================================
  useEffect(() => {
    if (!selectedBot && bots.length > 0) {
      setSelectedBot(bots[0])
      return
    }
    if (selectedBot && bots.length > 0) {
      const stillExists = bots.some((b) => b?.id === selectedBot?.id)
      if (!stillExists) {
        setSelectedBot(bots[0])
      }
    }
  }, [bots, selectedBot])

  // ==========================================
  // GŁÓWNA PĘTLA ODŚWIEŻAJĄCA (HEARTBEAT)
  // ==========================================
  useEffect(() => {
    if (selectedBot) {
      refreshData()
      
      // Co 5 sekund sprawdzamy poziom energii bota
      const energyInterval = setInterval(() => fetchEnergyOnly(), 5000)
      
      // Co 10 sekund pukamy do narzędzi, aby sprawdzić czy są ONLINE
      const pingInterval = setInterval(async () => {
        const res = await pingAllTools(selectedBot.name);
        if (res.success && res.servers) {
          setServers(res.servers); 
        }
      }, 10000)

      return () => {
        clearInterval(energyInterval)
        clearInterval(pingInterval)
      }
    }
  }, [selectedBot])

  const fetchEnergyOnly = async () => {
    if (!selectedBot) return;
    const mentalRes = await getBotMentalState(selectedBot.name);
    if (mentalRes.success && mentalRes.state) {
      setBotEnergy(mentalRes.state.energy ?? 0);
    }
  }

  const refreshData = async () => {
    if (!selectedBot) return;

    setIsLoading(true)
    const [mcpRes, configRes, mentalRes] = await Promise.all([
      getMcpServers(selectedBot.name),
      getBotConfig(selectedBot.name),
      getBotMentalState(selectedBot.name)
    ])
    
    if (mcpRes.success) setServers(mcpRes.servers)
    
    // Natychmiastowy ping po wczytaniu danych
    pingAllTools(selectedBot.name).then(res => {
        if (res.success && res.servers) setServers(res.servers);
    });

    if (mentalRes.success && mentalRes.state) {
      setBotEnergy(mentalRes.state.energy ?? 0)
    }
    
    // Parsujemy config bota, aby wyciągnąć flagę cenzora
    try {
        const config = JSON.parse(configRes.content.match(/export const config = (\{[\s\S]*?\});/)?.[1] || "{}")
        setIsCensorActive(config.tool_censor_active !== false)
    } catch {
        setIsCensorActive(true)
    }
    
    setIsLoading(false)
  }

  const handleAddServer = async () => {
    // Walidacja z powiadomieniami dla UX
    if (!newServer.name) {
        toast.error("Validation Error", { description: "Tool Name is required." });
        return;
    }
    if (!newServer.url) {
        // ZMIANA: Komunikat dostosowany do wtyczek
        toast.error("Validation Error", { description: "Endpoint URL or Plugin Name is required." });
        return;
    }
    
    setIsLoading(true);
    toast.info("Integrating new tool...");

    // Przesyłamy parametry do backendu
    const res = await addMcpServer(
        selectedBot.name, 
        newServer.name, 
        newServer.description, 
        newServer.customHeaders, 
        newServer.url, 
        newServer.cost, 
        newServer.auto,
        newServer.protocol
    )
    
    if (res.success) {
      toast.success("Tool Successfully Attached", { description: `${newServer.name} is now available to ${selectedBot.name}.` });
      setIsAddOpen(false)
      // Resetowanie wszystkich pól formularza
      setNewServer({ name: "", description: "", customHeaders: "", url: "", cost: 15, auto: false, protocol: 'REST_API' })
      refreshData()
    } else {
      toast.error("Failed to add tool", { description: res.error })
    }
    setIsLoading(false);
  }

  const handleDelete = async (id: string) => {
    const res = await removeMcpServer(selectedBot.name, id)
    if (res.success) {
      toast.info("Tool disconnected successfully")
      refreshData()
    }
  }

  const handleToggleCensor = async (checked: boolean) => {
    if (!checked) {
      setIsWarningOpen(true)
    } else {
      await toggleToolCensor(selectedBot.name, true)
      setIsCensorActive(true)
      toast.success("System 3 Oversight: ACTIVE")
    }
  }

  const confirmCensorDisable = async () => {
    await toggleToolCensor(selectedBot.name, false)
    setIsCensorActive(false)
    setIsWarningOpen(false)
    toast.error("System 3 Oversight: DISABLED", {
        description: "Instance is now operating without psychophysical safety limits."
    })
  }

  const handleUpdateCost = async (id: string, cost: number) => {
    await updateMcpServer(selectedBot.name, id, { energyCost: cost })
    setServers(prev => prev.map(s => s.id === id ? { ...s, energyCost: cost } : s))
  }

  return {
    selectedBot, setSelectedBot,
    servers,
    isCensorActive,
    botEnergy,
    isLoading,
    isAddOpen, setIsAddOpen,
    newServer, setNewServer,
    isWarningOpen, setIsWarningOpen,
    handleAddServer,
    handleDelete,
    handleToggleCensor,
    confirmCensorDisable,
    handleUpdateCost
  }
}

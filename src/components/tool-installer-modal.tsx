// src/components/tool-installer-modal.tsx
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Twitter, CloudRain, ShieldCheck, RadioTower, Send, MessageSquare, TerminalSquare, FolderSearch, Wrench, Globe } from "lucide-react"

interface ToolInstallerModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  newServer: any; // Stan z naszego use-toolbox
  setNewServer: (server: any) => void;
  onInstall: () => void;
}

export function ToolInstallerModal({ isOpen, setIsOpen, newServer, setNewServer, onInstall }: ToolInstallerModalProps) {
  
  // Funkcja ładująca gotowe szablony (opisy przetłumaczone dla System 2)
  const applyTemplate = (type: 'TWITTER' | 'WEATHER' | 'TELEGRAM' | 'DISCORD' | 'HIVE' | 'SYSTEM_CODER' | 'LOCAL_FS' | 'TOOL_FORGE' | 'INTERNET_SEARCH') => {
    if (type === 'TWITTER') {
      setNewServer({
        ...newServer,
        name: "x_post_tweet",
        protocol: "REST_API",
        url: "https://api.twitter.com/2/tweets",
        description: "Publishes a post on the X platform. Requires JSON: { \"body\": { \"text\": \"Tweet content\" } }",
        customHeaders: "{\n  \"Authorization\": \"Bearer YOUR_API_TOKEN\",\n  \"Content-Type\": \"application/json\"\n}",
        cost: 20
      });
    } else if (type === 'WEATHER') {
      setNewServer({
        ...newServer,
        name: "get_weather",
        protocol: "REST_API",
        url: "https://api.open-meteo.com/v1/forecast?latitude=52.2298&longitude=21.0118&current_weather=true",
        description: "Fetches current weather. Requires no arguments. Call with an empty object {}.",
        customHeaders: "", 
        cost: 5
      });
    } else if (type === 'TELEGRAM') {
      setNewServer({
        ...newServer,
        name: "telegram_send",
        protocol: "REST_API",
        url: "https://api.telegram.org/bot[YOUR_BOT_TOKEN]/sendMessage",
        description: "Sends a Telegram message. Requires JSON: { \"chat_id\": \"CHAT_OR_CHANNEL_ID\", \"text\": \"Message content\" }",
        customHeaders: "{\n  \"Content-Type\": \"application/json\"\n}",
        cost: 15
      });
    } else if (type === 'DISCORD') {
      setNewServer({
        ...newServer,
        name: "discord_send",
        protocol: "REST_API",
        url: "https://discord.com/api/v10/channels/[CHANNEL_ID]/messages",
        description: "Sends a message to a Discord channel. Requires JSON: { \"content\": \"Message content\" }",
        customHeaders: "{\n  \"Authorization\": \"Bot YOUR_BOT_TOKEN\",\n  \"Content-Type\": \"application/json\"\n}",
        cost: 15
      });
    } else if (type === 'HIVE') {
      setNewServer({
        ...newServer,
        name: "hive_communicator",
        protocol: "PLUGIN",
        url: "hive_communicator",
        description: "Broadcasts a message to the Hive Mind so other agents can read and respond. Use this to talk. Requires JSON: { \"topic\": \"Short topic\", \"message\": \"Message content\" }",
        customHeaders: "",
        cost: 2
      });
    } else if (type === 'SYSTEM_CODER') {
      setNewServer({
        ...newServer,
        name: "system_coder",
        protocol: "PLUGIN",
        url: "system_coder",
        description: "Writes and executes Python 3 scripts in a sandboxed local workspace. Requires JSON payload: { \"filename\": \"script.py\", \"code\": \"print('Hello')\" }. Use this to solve math, process data, or interact with OS. Always output final result using print() function.",
        customHeaders: "",
        cost: 5
      });
    } else if (type === 'LOCAL_FS') {
      setNewServer({
        ...newServer,
        name: "local_fs",
        protocol: "PLUGIN",
        url: "local_fs",
        description: "Reads files or lists directory contents within your secure workspace. Requires JSON payload: { \"action\": \"read\" | \"list\", \"targetPath\": \".\" | \"data.txt\" }. Use this to inspect files you generated or to read data before processing it.",
        customHeaders: "",
        cost: 5
      });
    } else if (type === 'TOOL_FORGE') {
      setNewServer({
        ...newServer,
        name: "tool_forge",
        protocol: "PLUGIN",
        url: "tool_forge",
        description: "Creates a new PERMANENT tool for yourself. Requires JSON: { \"tool_name\": \"name\", \"description\": \"Detailed instructions for yourself on how to use it\", \"code\": \"Python 3 code\" }. The Python code MUST read its arguments as a JSON string from sys.argv[1]. Example: import sys, json\\nargs = json.loads(sys.argv[1])\\nprint(args['my_var']). Once forged, the tool is permanently installed in your cognitive interface.",
        customHeaders: "",
        cost: 5
      });
    } else if (type === 'INTERNET_SEARCH') {
      // NOWOŚĆ: Szablon dla naszej natywnej wyszukiwarki internetowej
      setNewServer({
        ...newServer,
        name: "internet_search",
        protocol: "PLUGIN",
        url: "internet_search",
        description: "Searches the internet (Google, Bing, Reddit) in real-time. Requires an argument in JSON format: {\"query\": \"exact phrase to search for\"}. Use this tool whenever you need up-to-date information.",
        customHeaders: "",
        cost: 10
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-200 max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Integration Tool</DialogTitle>
          <DialogDescription className="text-slate-500">
            Connect a new external capability to this entity's cognitive layer.
          </DialogDescription>
        </DialogHeader>

        {/* VERIFIED TEMPLATES SECTION */}
        <div className="flex flex-col gap-2 mb-2 p-3 rounded-lg bg-blue-950/20 border border-blue-900/30">
          <span className="text-xs font-bold text-blue-400 flex items-center mr-2 uppercase tracking-wider">
            Verified Templates:
          </span>
          <div className="flex flex-wrap gap-2">
            
            <Button variant="outline" size="sm" onClick={() => applyTemplate('INTERNET_SEARCH')} className="h-7 text-[10px] bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/50 text-emerald-300">
              <Globe className="h-3 w-3 mr-1" /> Web Search
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('SYSTEM_CODER')} className="h-7 text-[10px] bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/50 text-emerald-300">
              <TerminalSquare className="h-3 w-3 mr-1" /> Python Coder
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('LOCAL_FS')} className="h-7 text-[10px] bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/50 text-emerald-300">
              <FolderSearch className="h-3 w-3 mr-1" /> File Reader
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('TOOL_FORGE')} className="h-7 text-[10px] bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/50 text-emerald-300">
              <Wrench className="h-3 w-3 mr-1" /> Tool Forge
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => applyTemplate('HIVE')} className="h-7 text-[10px] bg-indigo-950/30 border-indigo-500/50 hover:bg-indigo-900/50 text-indigo-300 mt-1">
              <RadioTower className="h-3 w-3 mr-1" /> Hive Communicator
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('TWITTER')} className="h-7 text-[10px] bg-black border-slate-700 hover:border-blue-500 hover:text-blue-400 mt-1">
              <Twitter className="h-3 w-3 mr-1" /> Post on X
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('TELEGRAM')} className="h-7 text-[10px] bg-black border-slate-700 hover:border-blue-500 hover:text-blue-400 mt-1">
              <Send className="h-3 w-3 mr-1" /> Telegram Bot
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('DISCORD')} className="h-7 text-[10px] bg-black border-slate-700 hover:border-blue-500 hover:text-blue-400 mt-1">
              <MessageSquare className="h-3 w-3 mr-1" /> Discord Bot
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate('WEATHER')} className="h-7 text-[10px] bg-black border-slate-700 hover:border-blue-500 hover:text-blue-400 mt-1">
              <CloudRain className="h-3 w-3 mr-1" /> Open-Meteo
            </Button>
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Protocol Type</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-slate-800 bg-black px-3 py-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                value={newServer.protocol}
                onChange={e => setNewServer({...newServer, protocol: e.target.value})}
              >
                <option value="REST_API">REST API (HTTP/JSON)</option>
                <option value="PLUGIN">Workspace Plugin (Internal)</option>
                <option value="LOCAL_SHELL">Local Shell Script</option>
                <option value="MCP">MCP (Model Context Protocol)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tool Name</Label>
              <Input 
                placeholder="e.g. get_weather or system_coder" 
                className="bg-black border-slate-800"
                value={newServer.name}
                onChange={e => setNewServer({...newServer, name: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endpoint URL / Command / Plugin Name</Label>
            <Input 
              placeholder="e.g. https://api.example.com/v1/data OR local_fs" 
              className="bg-black border-slate-800 font-mono text-xs"
              value={newServer.url}
              onChange={e => setNewServer({...newServer, url: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-blue-400 flex items-center gap-2">
              Description / Schema <span className="text-[10px] text-slate-500 font-normal">(Instructions for System 2 LLM)</span>
            </Label>
            <textarea 
              placeholder={'Fetches data. Requires JSON: {"location": "City"}'} 
              className="flex min-h-[60px] w-full rounded-md border border-slate-800 bg-black px-3 py-2 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 font-mono"
              value={newServer.description}
              onChange={e => setNewServer({...newServer, description: e.target.value})}
            />
          </div>

          {/* POLE: SECRETS (Niewidoczne dla LLM) */}
          <div className="space-y-2">
            <Label className="text-emerald-500 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Custom Headers / Secrets 
              <span className="text-[10px] text-slate-500 font-normal">(Hidden from AI)</span>
            </Label>
            <textarea 
              placeholder={'{\n  "Authorization": "Bearer TOKEN"\n}'} 
              className="flex min-h-[60px] w-full rounded-md border border-emerald-900/50 bg-black px-3 py-2 text-xs text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900 font-mono placeholder:text-emerald-900/50"
              value={newServer.customHeaders}
              onChange={e => setNewServer({...newServer, customHeaders: e.target.value})}
            />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <Label>Cognitive Energy Cost</Label>
              <span className="text-xs text-blue-400">{newServer.cost}%</span>
            </div>
            <Slider 
              value={[newServer.cost]} 
              max={50} 
              step={1} 
              onValueChange={v => setNewServer({...newServer, cost: v[0]})}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} className="border-slate-800 bg-transparent hover:bg-slate-800">Cancel</Button>
          <Button onClick={onInstall} className="bg-blue-600 hover:bg-blue-500 text-white">Finalize Installation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

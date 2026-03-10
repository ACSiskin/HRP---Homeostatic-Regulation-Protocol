'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function DashboardRefresher() {
    const router = useRouter()
    const [isRefreshing, setIsRefreshing] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setIsRefreshing(true)
            router.refresh()
            setTimeout(() => setIsRefreshing(false), 1000)
        }, 4000)
        return () => clearInterval(interval)
    }, [router])

    return (
        <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
            <div
                className={`p-2 rounded-full border border-cyan-400/20 bg-[rgba(8,12,22,0.85)] backdrop-blur-xl shadow-[0_0_0_1px_rgba(34,211,238,.06),0_10px_28px_rgba(0,0,0,.35)] transition-all duration-500 ${
                    isRefreshing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
            >
                <RefreshCw className={`h-4 w-4 text-cyan-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            </div>
        </div>
    )
}

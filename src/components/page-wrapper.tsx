// src/components/page-wrapper.tsx
'use client'

import React from 'react'
import { useSidebar } from "@/components/sidebar-context"
import { cn } from "@/lib/utils"

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  const { isCollapsed } = useSidebar()
  
  return (
    <main className={cn(
      // Baza: wysokość ekranu, tło i animacja przejścia
      "flex-1 h-screen transition-all duration-300 ease-in-out",
      "bg-transparent",
      
      // Dynamiczny margines reagujący na stan paska (Context)
      isCollapsed ? "md:ml-20" : "md:ml-64",
      
      // Logika stylów:
      // Jeśli podano 'className' (np. w Hive Mind), używamy go.
      // W przeciwnym razie stosujemy domyślne style (padding i scroll).
      className ? className : "p-6 md:p-8 overflow-y-auto scrollbar-hide"
    )}>
      {children}
    </main>
  )
}

'use client'
import Sidebar from '@/components/chat/Sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import { KnowledgeBaseManager } from '@/components/knowledge'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function HomeContent() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view')
  const baseUrl = process.env.NEXT_PUBLIC_AGENTOS_URL || 'http://localhost:7777'
  
  return (
    <div className="flex h-screen bg-background/80">
      <Sidebar />
      {view === 'knowledge' ? (
        <div className="flex-1 overflow-auto">
          <KnowledgeBaseManager baseUrl={baseUrl} />
        </div>
      ) : (
        <ChatArea />
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}

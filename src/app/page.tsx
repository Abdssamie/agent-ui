'use client'
import Sidebar from '@/components/chat/Sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import { KnowledgeBaseManager } from '@/components/knowledge'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ViewToolbar } from '@/components/chat/ViewToolbar';
import Icon from '@/components/ui/icon'

// Placeholder component for test views
const PlaceholderView = ({ viewName, icon }: { viewName: string; icon: string }) => (
  <div className="flex-1 flex items-center justify-center bg-background pt-16">
    <div className="text-center space-y-4">
      <div className="w-24 h-24 mx-auto rounded-xl bg-accent border border-primary/15 flex items-center justify-center">
        <Icon type={icon as any} size="md" className="text-primary" />
      </div>
      <div>
        <h2 className="text-xs font-medium uppercase text-primary mb-2">{viewName}</h2>
        <p className="text-xs text-muted-foreground max-w-md">
          This is a placeholder view for testing the ViewToolbar. In a real application, this would contain the {viewName.toLowerCase()} management interface.
        </p>
      </div>
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 max-w-md">
        <div className="flex gap-3">
          <Icon type="info" size="sm" className="text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="text-xs font-medium uppercase text-primary mb-1">One Person Company</p>
            <p>
              Perfect for solo entrepreneurs managing everything from leads to finances in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
)

function HomeContent() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view')
  const dbId = searchParams.get('db_id')
  const baseUrl = process.env.NEXT_PUBLIC_AGENTOS_URL || 'http://localhost:7777'
  
  const renderView = () => {
    switch (view) {
      case 'knowledge':
        return (
          <div className="flex-1 overflow-auto">
            <KnowledgeBaseManager baseUrl={baseUrl} dbId={dbId} />
          </div>
        )
      case 'leads':
        return <PlaceholderView viewName="Leads" icon="user" />
      case 'content':
        return <PlaceholderView viewName="Content" icon="file" />
      case 'analytics':
        return <PlaceholderView viewName="Analytics" icon="database" />
      case 'calendar':
        return <PlaceholderView viewName="Calendar" icon="edit" />
      case 'finances':
        return <PlaceholderView viewName="Finances" icon="check-circle" />
      default:
        return <ChatArea />
    }
  }
  
  return (
    <div className="flex h-screen bg-background/80">
      <Sidebar />
      <div className="relative flex-1 flex flex-col h-full">
        <ViewToolbar />
        {renderView()}
      </div>
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

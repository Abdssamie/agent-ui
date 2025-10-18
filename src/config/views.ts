import { IconType } from '@/components/ui/icon/types'

export interface ViewConfig {
  id: string
  label: string
  icon: IconType
  path: string
  description?: string
}

export const VIEWS: ViewConfig[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: 'agent',
    path: '/',
    description: 'AI agent conversations'
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: 'references',
    path: '/knowledge',
    description: 'Knowledge base management'
  }
]

export const getViewByPath = (path: string): ViewConfig | undefined => {
  return VIEWS.find(view => view.path === path)
}

export const getViewById = (id: string): ViewConfig | undefined => {
  return VIEWS.find(view => view.id === id)
}

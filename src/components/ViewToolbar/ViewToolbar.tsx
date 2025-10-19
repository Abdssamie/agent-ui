'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryState } from 'nuqs'
import { useState } from 'react'
import Icon from '@/components/ui/icon'
import { IconType } from '@/components/ui/icon/types'

interface ViewItem {
    id: string
    label: string
    icon: IconType
}

const views: ViewItem[] = [
    {
        id: 'knowledge',
        label: 'Knowledge',
        icon: 'references'
    },
    {
        id: 'workflows',
        label: 'Workflows',
        icon: 'hammer'
    },
    {
        id: 'leads',
        label: 'Leads',
        icon: 'user'
    },
    {
        id: 'content',
        label: 'Content',
        icon: 'file'
    },
    {
        id: 'analytics',
        label: 'Analytics',
        icon: 'database'
    },
    {
        id: 'calendar',
        label: 'Calendar',
        icon: 'edit'
    },
    {
        id: 'finances',
        label: 'Finances',
        icon: 'check-circle'
    }
]

const ViewToolbar = () => {
    const [view, setView] = useQueryState('view')
    const [hoveredItem, setHoveredItem] = useState<string | null>(null)

    const handleViewClick = (viewId: string) => {
        setView(view === viewId ? null : viewId)
    }

    return (
        <div className="absolute left-1/2 top-4 z-40 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-xl border border-primary/15 bg-background/95 p-2 backdrop-blur-sm">
                {views.map((viewItem) => {
                    const isActive = view === viewItem.id
                    const isHovered = hoveredItem === viewItem.id
                    
                    return (
                        <motion.button
                            key={viewItem.id}
                            onClick={() => handleViewClick(viewItem.id)}
                            onHoverStart={() => setHoveredItem(viewItem.id)}
                            onHoverEnd={() => setHoveredItem(null)}
                            className={`flex items-center gap-2 rounded-xl border border-primary/15 px-3 py-2 text-xs font-medium uppercase transition-colors ${isActive
                                ? 'bg-primaryAccent text-primary'
                                : 'bg-accent text-muted hover:bg-primaryAccent/50 hover:text-primary'
                                }`}
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            <Icon type={viewItem.icon} size="xs" />
                            <AnimatePresence>
                                {(isHovered || isActive) && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden whitespace-nowrap"
                                    >
                                        {viewItem.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}

export default ViewToolbar;
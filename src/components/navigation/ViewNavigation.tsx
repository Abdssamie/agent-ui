'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import { VIEWS } from '@/config/views'

export default function ViewNavigation() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-2">
      {VIEWS.map((view) => {
        const isActive = pathname === view.path
        
        return (
          <Link key={view.id} href={view.path}>
            <Button
              className={`h-9 w-full justify-start rounded-xl text-xs font-medium uppercase ${
                isActive
                  ? 'bg-primaryAccent text-primary border border-primary/15'
                  : 'bg-accent text-muted hover:bg-primaryAccent/50 hover:text-primary border border-primary/15'
              }`}
            >
              <Icon type={view.icon} size="xs" />
              <span>{view.label}</span>
            </Button>
          </Link>
        )
      })}
    </div>
  )
}

import type { ReactNode } from 'react'
import { BackButton } from '../components/BackButton'
import { BottomNav } from '../components/BottomNav'

type Props = {
  children: ReactNode
  show_back?: boolean
  back_to?: string
  show_nav?: boolean
  className?: string
}

export function PageLayout({
  children,
  show_back = false,
  back_to = '/',
  show_nav = true,
  className = '',
}: Props) {
  return (
    <div className="min-h-dvh bg-white flex justify-center">
      <div className={`relative w-full max-w-md px-5 pt-[calc(3.5rem+env(safe-area-inset-top))] ${show_nav ? 'pb-24' : 'pb-10'} ${className}`}>
        {show_back && <BackButton to={back_to} className="absolute left-5 top-[calc(3.5rem+env(safe-area-inset-top))]" />}
        {children}
      </div>
      {show_nav && <BottomNav />}
    </div>
  )
}

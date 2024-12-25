import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CollapsibleProps {
  children: React.ReactNode
  title: string
  defaultOpen?: boolean
}

export const Collapsible: React.FC<CollapsibleProps> = ({ children, title, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setHeight(ref.current?.getBoundingClientRect().height)
    } else {
      setHeight(0)
    }
  }, [isOpen])

  return (
    <div className="border rounded-md mb-4">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between py-2 px-4"
      >
        {title}
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </Button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ height: height }}
      >
        <div ref={ref}>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

export const CollapsibleTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

export const CollapsibleContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}
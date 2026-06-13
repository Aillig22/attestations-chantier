import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/* Composant Select façon shadcn/ui (basé sur Radix), stylisé aux couleurs AXA. */

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex items-center justify-between gap-2 rounded-full border border-border bg-surface py-1.5 pl-3.5 pr-2.5 text-sm font-medium text-foreground shadow-sm transition-colors',
      'hover:border-axa-blue focus:border-axa-blue focus:outline-none focus:ring-2 focus:ring-axa-blue/30',
      'data-[state=open]:border-axa-blue data-[state=open]:ring-2 data-[state=open]:ring-axa-blue/30',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown
        size={16}
        className="text-axa-blue transition-transform duration-200 data-[state=open]:rotate-180"
      />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-surface py-1 text-foreground shadow-lg',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        position === 'popper' && 'data-[side=bottom]:translate-y-1.5',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-0',
          position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center justify-between gap-4 whitespace-nowrap px-3 py-2 text-sm outline-none transition-colors',
      'focus:bg-axa-blue-light data-[highlighted]:bg-axa-blue-light',
      'data-[state=checked]:font-semibold data-[state=checked]:text-axa-blue',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator>
      <Check size={15} className="text-axa-blue" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

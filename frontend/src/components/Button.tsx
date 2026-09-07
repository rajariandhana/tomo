import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

const variant_classes: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white',
  secondary: 'border border-gray-200 text-gray-700',
}

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      className={`w-full py-3 rounded-full font-semibold text-sm active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none ${variant_classes[variant]} ${className}`}
      {...props}
    />
  )
}

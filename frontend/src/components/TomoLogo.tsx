type Props = {
  size?: number
  color?: string
  className?: string
}

export function TomoLogo({ size = 32, color = 'var(--color-tomo-blue)', className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <rect x="1" y="1" width="30" height="22" rx="6" fill={color} />
      <path d="M5 21 L3 31 L15 21 Z" fill={color} />
      <text
        x="16"
        y="12"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="14"
        fontWeight="600"
        fill="white"
      >
        友
      </text>
    </svg>
  )
}

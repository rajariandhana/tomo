import { useNavigate } from 'react-router'

type Props = {
  to: string
  className?: string
}

export function BackButton({ to, className = '' }: Props) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(to)}
      className={`flex items-center justify-center w-10 h-10 -ml-1 rounded-xl text-gray-400 hover:text-gray-600 transition-colors ${className}`}
      aria-label="Back"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M12.5 15L7.5 10L12.5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

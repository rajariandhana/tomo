type Props = {
  topic_key: string
  size?: number
  className?: string
}

const PATHS: Record<string, React.ReactNode> = {
  self_introduction: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </>
  ),
  hometown: (
    <>
      <path d="M2 12L12 4l10 8" />
      <path d="M5 12v8h5v-5h4v5h5V12" />
    </>
  ),
  food: (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z" />
      <path d="M21 15v7" />
    </>
  ),
  hobbies: (
    <path d="M11.5 2.5l2.5 7.7H22l-6.7 4.9 2.6 7.9-6.4-4.7-6.4 4.7 2.6-7.9L2 10.2h8z" />
  ),
  travel: (
    <path d="M22 16.5V14L13 8.5V3.5a1.5 1.5 0 0 0-3 0V8.5L1 14v2l9-2.5V19l-2 1.5V22l4-1 4 1v-1.5L14 19v-5.5z" />
  ),
  pop_culture: (
    <>
      <rect x="2" y="7" width="20" height="13" rx="2" />
      <path d="M10 11l6 2.5-6 2.5V11z" fill="currentColor" stroke="none" />
      <path d="M6 4h2M10 4h2M14 4h2M18 4h2" />
      <path d="M5 3.5v3M9 3.5v3M13 3.5v3M17 3.5v3" />
    </>
  ),
}

export function TopicIcon({ topic_key, size = 24, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[topic_key] ?? PATHS['self_introduction']}
    </svg>
  )
}

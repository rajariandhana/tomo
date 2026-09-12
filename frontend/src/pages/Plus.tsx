import { PageLayout } from '../layouts/PageLayout'
import { Button } from '../components/Button'

function InfinityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FeedbackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5h16v10H8l-4 4V5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9.8l2 2 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="10.5"
        width="16"
        height="10.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 10.5V7a4 4 0 0 1 7.6-1.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const FEATURES = [
  { label: 'Unlimited conversations', icon: InfinityIcon },
  { label: 'Talk instead of type', icon: MicIcon },
  { label: 'Conversation feedback', icon: FeedbackIcon },
  { label: 'Unlock harder levels', icon: UnlockIcon },
]

export function Plus() {
  return (
    <PageLayout className="min-h-dvh flex flex-col">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-tomo-blue tracking-tight">Tomo Plus</h1>
        <p className="text-sm text-gray-400 mt-1.5">Unlock the full experience</p>
      </header>

      <div className="flex flex-col gap-4">
        {FEATURES.map(({ label, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-blue-50 text-tomo-blue flex items-center justify-center">
              <Icon />
            </div>
            <span className="text-sm text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-10">
        <Button variant="primary">
          Upgrade now <span className="font-normal italic">(coming soon)</span>
        </Button>
      </div>
    </PageLayout>
  )
}

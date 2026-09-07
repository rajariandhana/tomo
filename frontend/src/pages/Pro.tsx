import { PageLayout } from '../layouts/PageLayout'
import { Button } from '../components/Button'

const FEATURES = [
  'Unlimited conversations',
  'Talk instead of type',
  'Conversation feedback',
]

export function Pro() {
  return (
    <PageLayout>
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-tomo-blue tracking-tight">Tomo Pro</h1>
        <p className="text-sm text-gray-400 mt-1.5">Unlock the full experience</p>
      </header>

      <div className="flex flex-col gap-3 mb-10">
        {FEATURES.map(f => (
          <div key={f} className="flex items-center gap-3">
            <div className="shrink-0 w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2 2 4-4" stroke="#0000FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">{f}</span>
          </div>
        ))}
      </div>

      <Button variant="primary">
        Upgrade now <span className="font-normal italic">(coming soon)</span>
      </Button>
    </PageLayout>
  )
}

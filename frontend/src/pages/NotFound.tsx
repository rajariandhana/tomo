import { useLocation, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { PageLayout } from '../layouts/PageLayout'
import { Button } from '../components/Button'

// A mistyped URL can be arbitrarily long. React escapes it, but a wall of text
// would still break the layout, so only the head of it is echoed back.
const MAX_PATH_SHOWN = 48

export function NotFound() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const shown_path =
    pathname.length > MAX_PATH_SHOWN ? `${pathname.slice(0, MAX_PATH_SHOWN)}…` : pathname

  return (
    <PageLayout>
      <motion.div
        className="flex flex-col items-center pt-24"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <h1 className="text-5xl font-bold text-tomo-blue tracking-tight">404</h1>
        <p className="text-sm text-gray-400 mt-1.5">ページが見つかりません</p>

        <p className="text-sm text-gray-500 leading-relaxed text-center max-w-xs mt-8">
          There's nothing at this address. It may have moved, or the link may be wrong.
        </p>
        <p className="text-xs text-gray-400 mt-3 break-all text-center max-w-xs">{shown_path}</p>

        <div className="w-full max-w-xs flex flex-col gap-3 mt-10">
          <Button variant="primary" onClick={() => navigate('/')}>
            Go home
          </Button>
          <Button variant="secondary" onClick={() => navigate('/topics')}>
            Start a conversation
          </Button>
        </div>
      </motion.div>
    </PageLayout>
  )
}

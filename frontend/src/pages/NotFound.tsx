import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { PageLayout } from '../layouts/PageLayout'
import { Button } from '../components/Button'

export function NotFound() {
  const navigate = useNavigate()

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

        <div className="w-full max-w-xs flex flex-col gap-3 mt-10">
          <Button variant="secondary" onClick={() => navigate('/')}>
            Go home
          </Button>
        </div>
      </motion.div>
    </PageLayout>
  )
}

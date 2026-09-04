import { motion } from 'framer-motion'

export function TypingIndicator() {
  return (
    <motion.div
      className="flex justify-start"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
    >
      <div className="bg-white border border-blue-100 rounded-2xl rounded-tl-md px-4 py-3.5 flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="block w-2 h-2 rounded-full bg-blue-300"
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 0.65,
              repeat: Infinity,
              delay: i * 0.14,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}

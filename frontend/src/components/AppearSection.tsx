import { motion } from "framer-motion";

export const appear_initial = { opacity: 0, y: 40 };
export const appear_whileInView = { opacity: 1, y: 0 };
// export const appear_transition_fast = {
//   duration: 0.8,
//   ease: "easeOut",
// };
export const appear_transition = { duration: 0.6, ease: "easeOut"};
export const appear_viewport = { once: true };

type Props = {
  children?: React.ReactNode;
  className?: string;
}

export default function AppearSection({ children, className } : Props) {
  return (
    <motion.section
      className={className}
      initial={appear_initial}
      whileInView={appear_whileInView}
      transition={appear_transition}
      viewport={appear_viewport}
    >
      {children}
    </motion.section>
  );
}

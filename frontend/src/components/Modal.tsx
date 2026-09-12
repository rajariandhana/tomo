import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  title?: string;
  subtitle?: string;
  on_close: () => void;
  children?: React.ReactNode;
};

export function Modal({ open, title, subtitle, on_close, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const on_key = (e: KeyboardEvent) => {
      if (e.key === "Escape") on_close();
    };
    // Keep the page behind the modal from scrolling under the sheet.
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", on_key);
    return () => {
      document.body.style.overflow = previous_overflow;
      window.removeEventListener("keydown", on_key);
    };
  }, [open, on_close]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={on_close}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white px-6 pt-6 pb-8"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <button
              type="button"
              onClick={on_close}
              aria-label="Close"
              className="absolute right-5 top-5 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 active:scale-90 transition-transform"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {title && (
              <header className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-blue-600 tracking-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-sm text-gray-400 mt-1.5">{subtitle}</p>
                )}
              </header>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

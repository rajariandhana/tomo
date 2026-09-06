import { useState } from "react";
import { useLocation, Navigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { MessageBubble } from "../components/MessageBubble";
import type { Message } from "../types";
import { TomoLogo } from "../components/TomoLogo";

type Location_state = {
  messages?: Message[];
};

export function ConversationEnded() {
  const location = useLocation();
  const [show_history, set_show_history] = useState(false);

  const state = location.state as Location_state | null;
  const messages = state?.messages;

  if (!messages) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="fixed inset-x-0 top-0 h-dvh flex justify-center bg-white">
      <div className="relative w-full max-w-md h-full flex flex-col items-center justify-center bg-white px-6">
        <TomoLogo size={200}></TomoLogo>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          Thanks for trying out Tomo
        </h1>
        <span className="text-sm text-gray-500 leading-relaxed text-center max-w-xs mb-12">
          How was it? Upgrade to Pro to have more conversations.
        </span>
        <div className="w-full max-w-xs flex flex-col gap-3">
					<button
            // onClick={() => navigate("/")}
            className="w-full py-3 rounded-full bg-blue-600 text-white font-semibold text-sm active:scale-95 transition-transform"
          >
            Upgrade now <span className="font-normal italic">(coming soon)</span>
          </button>
          <button
            onClick={() => set_show_history(true)}
            className="w-full py-3 rounded-full border border-gray-200 text-gray-700 font-semibold text-sm active:scale-95 transition-transform"
          >
            View conversation
          </button>
          
        </div>
      </div>

      {/* History modal */}
      <AnimatePresence>
        {show_history && (
          <motion.div
            className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => set_show_history(false)}
          >
            <motion.div
              className="w-full max-w-md sm:max-w-xs max-h-[80vh] bg-white rounded-t-3xl sm:rounded-3xl p-5 flex flex-col shadow-xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h2 className="text-base font-bold text-gray-800">
                  Conversation
                </h2>
                <button
                  onClick={() => set_show_history(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto flex flex-col gap-3 pr-1">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

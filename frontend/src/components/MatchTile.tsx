import { motion } from "framer-motion";

type Props = {
  label: string;
  variant: "kanji" | "meaning";
  is_selected: boolean;
  is_matched: boolean;
  is_wrong: boolean;
  on_click: () => void;
};

const base =
  "w-full h-16 px-2 rounded-2xl border flex items-center justify-center text-center transition-colors duration-150 cursor-pointer";

export function MatchTile({
  label,
  variant,
  is_selected,
  is_matched,
  is_wrong,
  on_click,
}: Props) {
  const state_classes = is_matched
    ? "border-transparent bg-gray-100 text-gray-300 cursor-default"
    : is_wrong
      ? "border-tomo-orange bg-orange-50 text-tomo-orange"
      : is_selected
        ? "border-tomo-blue bg-blue-50 text-tomo-blue"
        : "border-blue-100 bg-white text-gray-700";

  const text_classes =
    variant === "kanji"
      ? "text-2xl font-semibold"
      : "text-[13px] font-medium leading-snug";

  return (
    <motion.button
      type="button"
      onClick={on_click}
      disabled={is_matched}
      aria-pressed={is_selected}
      className={`${base} ${state_classes}`}
      // The shake is the wrong-answer indicator: a quick damped left-right
      // wobble on both tiles of the failed pair, alongside the orange styling.
      animate={is_wrong ? { x: [0, -9, 9, -7, 7, -4, 4, 0] } : { x: 0 }}
      transition={
        is_wrong ? { duration: 0.45, ease: "easeInOut" } : { duration: 0.15 }
      }
      whileTap={is_matched ? undefined : { scale: 0.96 }}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <span className={text_classes}>{label}</span>
    </motion.button>
  );
}

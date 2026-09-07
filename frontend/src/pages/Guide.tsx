import { NavLink } from "react-router";
import AppearSection from "../components/AppearSection";
import { PageLayout } from "../layouts/PageLayout";

const STEPS = [
  {
    title: "Pick a topic",
    body: "Choose one from four conversation topics and Tomo will begin a conversation.",
  },
  {
    title: "Reply in Japanese as best you can",
    body: "Don't worry if you struggle, Tomo can still understand if you use English.",
  },
  {
    title: "Lost in translation?",
    body: (
      <span className="">
        Click{" "}
        <span className="text-[12px] font-medium text-gray-400">
          Show translation
        </span>{" "}
        to see what Tomo messaged you in English.
      </span>
    ),
  },
  {
    title: "Listen along",
    body: "Tap the speaker icon on Tomo's replies to hear them read aloud.",
  },
  {
    title: "Five exchanges",
    body: (
      <span>
        Each conversation runs for five of your messages, then wraps up so you
        can review it. Upgrade to{" "}
        <NavLink to="/pro" className="text-tomo-blue font-semibold">
          Pro
        </NavLink>{" "}
        for longer conversations.
      </span>
    ),
  },
];

export function Guide() {
  return (
    <PageLayout>
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 tracking-tight">
          Guide
        </h1>
        <p className="text-sm text-gray-400 mt-1.5">How Tomo works</p>
      </header>

      <AppearSection className="flex flex-col gap-5">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex gap-4">
            <div className="shrink-0 w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
              {i + 1}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                {step.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mt-0.5">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </AppearSection>
    </PageLayout>
  );
}

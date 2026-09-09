import { NavLink } from "react-router";

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11.5L12 4l8 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v9a1 1 0 0 0 1 1h3v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5h3a1 1 0 0 0 1-1v-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TopicsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5h16v10H8l-4 4V5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.5 9.3a2.5 2.5 0 1 1 3.6 2.25c-.75.36-1.1.9-1.1 1.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="16.8" r="0.9" fill="currentColor" />
    </svg>
  );
}

function KanjiIcon() {
  return (
		<span className="font-semibold">
			漢字
		</span>
  );
}

function ProIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type NavItem = {
  to: string;
  label: string;
  icon: () => React.ReactElement;
  end: boolean;
  active_color?: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/topics", label: "Topics", icon: TopicsIcon, end: false },
  { to: "/kanji", label: "Kanji", icon: KanjiIcon, end: false },
  { to: "/guide", label: "Guide", icon: GuideIcon, end: false },
  { to: "/pro", label: "Pro", icon: ProIcon, end: false },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center border-t border-gray-100 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-full max-w-md flex items-stretch">
        {NAV_ITEMS.map(
          ({ to, label, icon: Icon, end, active_color = "text-blue-600" }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  isActive ? active_color : "text-gray-400"
                }`
              }
            >
              <Icon />
              <span className="text-[10px] font-semibold">{label}</span>
            </NavLink>
          ),
        )}
      </div>
    </nav>
  );
}

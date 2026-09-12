import { useNavigate } from "react-router";
import { TomoLogo } from "../components/TomoLogo";
import { Button } from "../components/Button";
import { BottomNav } from "../components/BottomNav";
import AppearSection from "../components/AppearSection";

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-x-0 top-0 h-dvh flex justify-center bg-white">
      {/* The call to action is pinned to the bottom, so the padding has to clear
          the fixed nav and the home indicator under it. */}
      <div className="relative w-full max-w-md h-full flex flex-col items-center bg-white px-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="flex-1 flex flex-col items-center justify-center">
          <TomoLogo size={200}></TomoLogo>
          <h1 className="text-3xl font-bold mb-2 text-tomo-blue">Tomo</h1>
          <span className="text-sm text-gray-500 leading-relaxed text-center max-w-xs">
            Your Japanese conversation partner
          </span>
        </div>
        <AppearSection className="w-full max-w-xs">
          <Button variant="primary" onClick={() => navigate("/topics")}>
            Start chatting
          </Button>
        </AppearSection>
      </div>
      <BottomNav />
    </div>
  );
}

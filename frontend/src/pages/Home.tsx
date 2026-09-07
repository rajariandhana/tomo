import { useNavigate } from "react-router";
import { TomoLogo } from "../components/TomoLogo";
import { Button } from "../components/Button";
import { BottomNav } from "../components/BottomNav";
import AppearSection from "../components/AppearSection";

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-x-0 top-0 h-dvh flex justify-center bg-white">
      <div className="relative w-full max-w-md h-full flex flex-col items-center justify-center bg-white px-6 pb-16">
        <TomoLogo size={200}></TomoLogo>
        <h1 className="text-3xl font-bold mb-2 text-tomo-blue">Tomo</h1>
        <span className="text-sm text-gray-500 leading-relaxed text-center max-w-xs mb-12">
          Your Japanese conversation partner
        </span>
        <AppearSection className="w-full max-w-xs flex flex-col gap-3">
          <Button variant="primary" onClick={() => navigate("/topics")}>
            Start chatting
          </Button>
          <Button variant="secondary">Find out more</Button>
        </AppearSection>
      </div>
      <BottomNav />
    </div>
  );
}

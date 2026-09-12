import AppearSection from "../components/AppearSection";
import { GuideSteps } from "../components/GuideSteps";
import { PageLayout } from "../layouts/PageLayout";

export function Guide() {
  return (
    <PageLayout>
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 tracking-tight">
          Guide
        </h1>
        <p className="text-sm text-gray-400 mt-1.5">How Tomo works</p>
      </header>

      <AppearSection>
        <GuideSteps />
      </AppearSection>
    </PageLayout>
  );
}

import { AssessmentProvider } from "@/app/components/assessment/AssessmentContext";
import { AssessmentNavigator } from "@/app/components/assessment/AssessmentNavigator";

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AssessmentProvider>
      <div className="h-full flex min-h-0 bg-background">
        <AssessmentNavigator />
        <div className="flex-1 min-w-0 min-h-0">{children}</div>
      </div>
    </AssessmentProvider>
  );
}

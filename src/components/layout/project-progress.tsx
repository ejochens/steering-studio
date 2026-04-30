"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface StepStatus {
  details: boolean;
  intake: boolean;
  review: boolean;
  documents: boolean;
  export: boolean;
}

const steps = [
  { key: "details", label: "Overview", segment: "" },
  { key: "intake", label: "Intake", segment: "/intake" },
  { key: "review", label: "Review", segment: "/review" },
  { key: "documents", label: "Documents", segment: "/documents" },
  { key: "export", label: "Export", segment: "/export" },
] as const;

export default function ProjectProgress({
  projectId,
  status,
}: {
  projectId: string;
  status: StepStatus;
}) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  return (
    <nav aria-label="Project progress" className="mb-4">
      <ol className="flex items-center gap-0" role="list">
        {steps.map((step, index) => {
          const href = `${basePath}${step.segment}`;
          const isComplete = status[step.key];
          const isActive =
            step.segment === ""
              ? pathname === basePath || pathname === `${basePath}/settings`
              : pathname.startsWith(`${basePath}${step.segment}`);
          const isLast = index === steps.length - 1;

          return (
            <li key={step.key} className="flex items-center">
              <Link
                href={href}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
                  isActive
                    ? "bg-blue-100 text-blue-800"
                    : isComplete
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isComplete && !isActive ? (
                  <svg
                    className="h-3.5 w-3.5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                )}
                {step.label}
              </Link>
              {!isLast && (
                <svg
                  className="h-4 w-4 text-gray-300 mx-1 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

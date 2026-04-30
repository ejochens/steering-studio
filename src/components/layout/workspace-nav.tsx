"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Overview", segment: "" },
  { label: "Intake", segment: "/intake" },
  { label: "Review", segment: "/review" },
  { label: "Documents", segment: "/documents" },
  { label: "Export", segment: "/export" },
  { label: "Settings", segment: "/settings" },
] as const;

export default function WorkspaceNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  return (
    <nav aria-label="Project sections">
      <ul className="flex gap-1 border-b border-gray-200" role="list">
        {navItems.map(({ label, segment }) => {
          const href = `${basePath}${segment}`;
          const isActive =
            segment === ""
              ? pathname === basePath
              : pathname.startsWith(href);

          return (
            <li key={label}>
              <Link
                href={href}
                className={`inline-block px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

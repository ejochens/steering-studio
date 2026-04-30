"use client";

import {
  CompletenessSidebar,
  type SidebarSection,
} from "@/features/intake/components/completeness-sidebar";

interface ReviewSidebarProps {
  sections: SidebarSection[];
}

export function ReviewSidebar({ sections }: ReviewSidebarProps) {
  return (
    <CompletenessSidebar
      sections={sections}
      onSectionClick={() => {
        // Section click scrolling is deferred (Requirement 10.3).
        // No-op for now.
      }}
    />
  );
}

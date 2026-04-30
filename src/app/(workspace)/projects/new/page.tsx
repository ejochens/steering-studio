import Link from "next/link";
import NewProjectForm from "@/features/projects/components/new-project-form";

export const metadata = {
  title: "New Project – Steering Studio",
};

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-gray-700 hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-gray-900 font-medium">
            New Project
          </li>
        </ol>
      </nav>

      <h1 className="text-xl font-semibold text-gray-900">Create a new project</h1>
      <p className="mt-2 text-sm text-gray-600">
        Set up the basics for your context pack. You can refine details later in
        the project workspace.
      </p>

      <div className="mt-6">
        <NewProjectForm />
      </div>
    </div>
  );
}

import Link from "next/link";

export default function ShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="text-lg font-semibold text-gray-900 hover:text-gray-700"
          >
            Steering Studio
          </Link>
          <ul className="flex items-center gap-4" role="list">
            <li>
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/settings/provider"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Settings
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

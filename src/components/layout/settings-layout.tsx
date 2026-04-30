export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}

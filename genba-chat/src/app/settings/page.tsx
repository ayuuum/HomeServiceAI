import { SettingsMenu } from "@/components/SettingsMenu";

export default function SettingsPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-zinc-900">設定</h1>
      </header>
      <SettingsMenu />
    </div>
  );
}

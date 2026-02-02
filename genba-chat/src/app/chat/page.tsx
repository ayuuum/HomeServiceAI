import { ChatGroupList } from "@/components/ChatGroupList";
import { ChatThread } from "@/components/ChatThread";

export default function ChatPage() {
  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)]">
      <aside className="w-1/3 min-w-[120px] max-w-[180px] border-r border-zinc-200 bg-white">
        <ChatGroupList />
      </aside>
      <main className="flex-1 flex flex-col bg-[#f7f7f7]">
        <ChatThread />
      </main>
    </div>
  );
}

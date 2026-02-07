import { useState } from 'react';
import { AdminHeader } from '@/components/AdminHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/icon';
import InboxContent from '@/components/messages/InboxContent';
import BroadcastContent from '@/components/messages/BroadcastContent';

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState('inbox');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminHeader />

      <div className="border-b bg-card">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <Icon name="forum" size={22} className="text-primary" />
            メッセージ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">LINEメッセージの確認・返信・一斉配信</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="container max-w-6xl mx-auto px-4 pt-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="inbox" className="flex items-center gap-1.5">
                <Icon name="inbox" size={16} />
                受信トレイ
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="flex items-center gap-1.5">
                <Icon name="campaign" size={16} />
                一斉配信
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inbox" className="mt-0 flex-1">
              <InboxContent />
            </TabsContent>

            <TabsContent value="broadcast" className="mt-0">
              <BroadcastContent />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

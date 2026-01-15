import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LineChat } from './LineChat';
import { Icon } from '@/components/ui/icon';

interface LineChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  lineUserId: string | undefined;
  customerName: string;
}

export function LineChatModal({
  open,
  onOpenChange,
  customerId,
  lineUserId,
  customerName,
}: LineChatModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-[#06C755] text-white rounded-t-lg">
          <DialogTitle className="flex items-center gap-2">
            <Icon name="chat" size={20} />
            {customerName || 'チャット'}
          </DialogTitle>
        </DialogHeader>
        
        {lineUserId ? (
          <div className="flex-1 overflow-hidden">
            <LineChat
              customerId={customerId}
              lineUserId={lineUserId}
              customerName={customerName}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Icon name="link_off" size={32} className="opacity-50" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">LINE未連携</p>
            <p className="text-sm text-center">
              この顧客はまだLINEアカウントと連携されていません。
              <br />
              顧客がLINE公式アカウントをフォローすると、
              <br />
              チャットが可能になります。
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { CheckCircle, X, PartyPopper } from 'lucide-react';

interface SuccessModalProps {
  title: string;
  message: string;
  onClose: () => void;
}

export function SuccessModal({
  title,
  message,
  onClose,
}: SuccessModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-strong max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <PartyPopper className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-end px-6 py-4 bg-muted/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors"
          >
            ¡Genial!
          </button>
        </div>
      </div>
    </div>
  );
}

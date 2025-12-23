import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { APP_LOGO, APP_TITLE } from "@/const";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function ManusDialog({
  title = APP_TITLE,
  logo = APP_LOGO,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: ManusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    if (!onOpenChange) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog
      open={onOpenChange ? open : internalOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="w-full max-w-[400px] rounded-2xl border border-border/70 bg-card/90 p-0 text-center shadow-md supports-[backdrop-filter]:bg-card/80 supports-[backdrop-filter]:backdrop-blur">
        <div className="flex flex-col items-center gap-2 p-5 pt-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-background/60">
            <img src={logo} alt="App icon" className="w-10 h-10 rounded-md" />
          </div>

          {/* Title and subtitle */}
          <DialogTitle className="font-display text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Faça login com o Manus para continuar
          </DialogDescription>
        </div>

        <DialogFooter className="px-5 py-5">
          {/* Login button */}
          <Button
            onClick={onLogin}
            className="w-full h-10 rounded-2xl"
          >
            Entrar com Manus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";

interface LegalModalProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode; 
}

export function LegalModal({ title, open, onOpenChange, children }: LegalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription>
            Last Updated: May 19, 2026
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-6 prose dark:prose-invert">
          {children}
        </div>

        <DialogFooter className="mt-4 flex-shrink-0">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
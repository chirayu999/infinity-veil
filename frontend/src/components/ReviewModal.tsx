import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReviewModalProps {
  open: boolean;
  title: string;
  submitLabel: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => Promise<void> | void;
}

export default function ReviewModal({
  open,
  title,
  submitLabel,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ReviewModalProps) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) {
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async () => {
    await onSubmit(notes);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Add optional analyst notes for audit trail and downstream triage.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add review notes (optional)"
          className="min-h-28 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


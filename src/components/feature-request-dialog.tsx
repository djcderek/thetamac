"use client";

import { useState, type ComponentProps } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<typeof Button>;

interface FeatureRequestDialogProps {
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  triggerClassName?: string;
  iconOnly?: boolean;
  showIcon?: boolean;
}

function getErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") return "Failed to submit feature request.";

  const response = data as {
    error?: string;
    details?: { message?: string[] };
  };

  return response.details?.message?.[0] ?? response.error ?? "Failed to submit feature request.";
}

export function FeatureRequestDialog({
  triggerLabel = "Suggest a feature",
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName,
  iconOnly = false,
  showIcon = true,
}: FeatureRequestDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedMessage = message.trim();
  const canSubmit = trimmedMessage.length >= 5;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(getErrorMessage(data));
        return;
      }

      setMessage("");
      setIsOpen(false);
    } catch (submitError) {
      console.error("Failed to submit feature request", submitError);
      setError("Failed to submit feature request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          aria-label={iconOnly ? triggerLabel : undefined}
        >
          {showIcon ? <MessageSquarePlus className="h-4 w-4" /> : null}
          {iconOnly ? <span className="sr-only">{triggerLabel}</span> : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest a feature</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="feature-request-message">What should we build?</Label>
          <textarea
            id="feature-request-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Example: Add custom timer durations and a streak-based XP bonus..."
            className={cn(
              "min-h-[120px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm",
              "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          />
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sent to our backlog. Please avoid including sensitive info.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

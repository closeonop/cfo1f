"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTour } from "@/tours/tour-context";

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const { active } = useTour();
  // Driver supplies the modal spotlight/focus handling during a walkthrough.
  // Radix normally hides all outside nodes, including Driver's body-level popover.
  return <DialogPrimitive.Root {...props} modal={active ? false : props.modal} />;
}
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: "center" | "right" }
>(({ className, children, side = "center", onInteractOutside, onEscapeKeyDown, onOpenAutoFocus, ...props }, ref) => {
  const {active}=useTour();
  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onOpenAutoFocus={event=>{if(active)event.preventDefault();else onOpenAutoFocus?.(event);}}
      onInteractOutside={event=>{
        if(active && event.target instanceof Element && event.target.closest(".driver-popover, .driver-layer")) event.preventDefault();
        else onInteractOutside?.(event);
      }}
      onEscapeKeyDown={event=>{if(active)event.preventDefault();else onEscapeKeyDown?.(event);}}
      className={cn(
        "fixed z-50 bg-card shadow-lg focus:outline-none",
        side === "center" &&
          "left-1/2 top-1/2 grid w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border p-6 sm:max-w-xl max-h-[85vh] overflow-y-auto",
        side === "right" && "inset-y-0 right-0 h-full w-full max-w-md border-l p-6 overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close data-tour="dialog-close" className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-2 focus:outline-ring focus:outline-offset-2 disabled:pointer-events-none cursor-pointer" aria-label="Close">
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

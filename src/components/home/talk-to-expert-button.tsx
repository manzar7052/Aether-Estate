"use client";

import { Button, type ButtonVariant, type ButtonSize } from "@/components/ui/button";
import { useChat } from "@/components/chat/chat-context";

interface TalkToExpertButtonProps {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  children?: React.ReactNode;
  initialQuery?: string;
}

export function TalkToExpertButton({
  className,
  size = "lg",
  variant = "secondary",
  children = "Talk to an Expert",
  initialQuery,
}: TalkToExpertButtonProps) {
  const { openChat } = useChat();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => openChat(initialQuery)}
    >
      {children}
    </Button>
  );
}

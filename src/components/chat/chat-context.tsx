"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

interface ChatContextValue {
  isOpen: boolean;
  openChat: (initialQuery?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  pendingQuery: string | null;
  clearPendingQuery: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  const openChat = useCallback((query?: string) => {
    if (query) {
      setPendingQuery(query);
    }
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const clearPendingQuery = useCallback(() => {
    setPendingQuery(null);
  }, []);

  // Listen for global custom events as a resilient fallback
  useEffect(() => {
    const handleOpenEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ query?: string }>;
      openChat(customEvent.detail?.query);
    };

    window.addEventListener("aether:open-chat", handleOpenEvent);
    return () => {
      window.removeEventListener("aether:open-chat", handleOpenEvent);
    };
  }, [openChat]);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        openChat,
        closeChat,
        toggleChat,
        pendingQuery,
        clearPendingQuery,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}

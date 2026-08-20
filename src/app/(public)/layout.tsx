import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import { ChatWidget } from "@/components/chat/chat-widget";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-cream text-brand-ink">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <ChatWidget />
    </div>
  );
}

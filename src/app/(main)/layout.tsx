import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/sidebar-provider";
import { MainContent } from "@/components/main-content";
import { MobileTopBar } from "@/components/mobile-top-bar";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        {/* Mobile: Top bar + drawer navigation */}
        <MobileTopBar />
        <MobileNavDrawer />
        
        {/* Desktop: Sidebar navigation */}
        <Sidebar />
        
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}





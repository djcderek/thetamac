import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/sidebar-provider";
import { MainContent } from "@/components/main-content";
import { MobileTopBar } from "@/components/mobile-top-bar";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { MobileTopBarPinningProvider } from "@/components/mobile-top-bar-pinning";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <MobileTopBarPinningProvider>
        <div className="min-h-screen">
          {/* Mobile: Top bar + drawer navigation */}
          <MobileTopBar />
          <MobileNavDrawer />

          {/* Main app frame: sidebar + content */}
          <div className="flex min-h-screen">
            <Sidebar />
            <MainContent>{children}</MainContent>
          </div>
        </div>
      </MobileTopBarPinningProvider>
    </SidebarProvider>
  );
}





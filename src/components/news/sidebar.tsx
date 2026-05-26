"use client";

import { useAppStore, type ViewMode } from "@/store/app-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useArticles } from "@/hooks/use-articles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Library,
  PlusCircle,
  X,
  BookmarkCheck,
  Tag,
} from "lucide-react";

interface NavItem {
  view: ViewMode;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { view: "dashboard", label: "Panel", icon: <LayoutDashboard className="h-5 w-5" /> },
  { view: "library", label: "Biblioteca", icon: <Library className="h-5 w-5" /> },
  { view: "extract", label: "Extraer Noticia", icon: <PlusCircle className="h-5 w-5" /> },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const {
    currentView,
    setView,
    tags,
    totalArticles,
  } = useAppStore();

  const handleNav = (view: ViewMode) => {
    setView(view);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <BookmarkCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight">CleanNews</h1>
          <p className="text-xs text-muted-foreground">Vault</p>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.view}
              variant={currentView === item.view ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 px-3"
              onClick={() => handleNav(item.view)}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </Button>
          ))}
        </div>

        {/* Tags section */}
        {tags.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 px-3 mb-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Etiquetas
              </span>
            </div>
            <ScrollArea className="max-h-48">
              <div className="space-y-1 px-1">
                {tags.slice(0, 15).map((tag) => (
                  <Button
                    key={tag.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs"
                    onClick={() => {
                      useAppStore.getState().setSelectedTag(tag.name);
                      handleNav("library");
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate">{tag.name}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </nav>

      <Separator />

      {/* Stats footer */}
      <div className="px-6 py-4">
        <p className="text-xs text-muted-foreground">
          {totalArticles} {totalArticles === 1 ? "artículo" : "artículos"} guardados
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const isMobile = useIsMobile();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  if (isMobile) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={toggleSidebar}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SidebarContent onNavigate={toggleSidebar} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-30 h-screen border-r bg-card transition-all duration-300 ${
        sidebarOpen ? "w-64" : "w-0 overflow-hidden"
      }`}
    >
      <SidebarContent />
    </aside>
  );
}

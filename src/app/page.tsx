"use client";

import { useAppStore } from "@/store/app-store";
import { Sidebar } from "@/components/news/sidebar";
import { DashboardView } from "@/components/news/dashboard-view";
import { ExtractView } from "@/components/news/extract-view";
import { LibraryView } from "@/components/news/library-view";
import { ReaderView } from "@/components/news/reader-view";
import { EditView } from "@/components/news/edit-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Menu, PlusCircle, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useArticles } from "@/hooks/use-articles";
import { useEffect, useState } from "react";

function Header() {
  const { toggleSidebar, setView, currentView, setSearchQuery, searchQuery } =
    useAppStore();
  const isMobile = useIsMobile();
  const [searchValue, setSearchValue] = useState(searchQuery);

  useEffect(() => {
    setSearchValue(searchQuery);
  }, [searchQuery]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    // Debounce the search
    const timeout = setTimeout(() => {
      setSearchQuery(value);
      if (value && currentView !== "library") {
        setView("library");
      }
    }, 300);
    return () => clearTimeout(timeout);
  };

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* App name - visible on mobile */}
        <div className="flex items-center gap-2 shrink-0 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white">
            <PlusCircle className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">CleanNews Vault</span>
        </div>

        {/* Search bar */}
        {currentView !== "extract" && (
          <div className="relative hidden md:block flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar artículos..."
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        )}

        {/* Mobile search toggle */}
        {currentView !== "extract" && isMobile && (
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => setView("extract")}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 hidden sm:flex"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Extraer
          </Button>
          <Button
            onClick={() => setView("extract")}
            size="icon"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 sm:hidden"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function ViewRouter() {
  const { currentView, sidebarOpen } = useAppStore();
  const isMobile = useIsMobile();

  // The main content margin adjusts based on sidebar state
  const marginLeft = !isMobile && sidebarOpen ? "md:ml-64" : "";

  return (
    <div className={`flex min-h-screen flex-col transition-all duration-300 ${marginLeft}`}>
      <Header />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {currentView === "dashboard" && <DashboardView />}
        {currentView === "extract" && <ExtractView />}
        {currentView === "library" && <LibraryView />}
        {currentView === "reader" && <ReaderView />}
        {currentView === "edit" && <EditView />}
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Sidebar />
      <ViewRouter />
    </>
  );
}

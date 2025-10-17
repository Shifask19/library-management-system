
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";
import { LayoutDashboard, BookMarked, Users, Gift, History, Settings, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from 'react';

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/dashboard?tab=books", label: "Book Management", icon: BookMarked },
  { href: "/admin/dashboard?tab=issue-requests", label: "Issue Requests", icon: BellRing },
  { href: "/admin/dashboard?tab=donations", label: "Donations", icon: Gift },
  { href: "/admin/dashboard?tab=users", label: "User Management", icon: Users },
  { href: "/admin/dashboard?tab=transactions", label: "Transaction Log", icon: History },
  { href: "/admin/dashboard?tab=settings", label: "Settings", icon: Settings },
];

export function AdminSidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
      setIsMounted(true);
  }, []);

  const isActive = (itemHref: string) => {
    if (!isMounted) return false;

    const currentTab = searchParams.get('tab');
    const [linkPath, queryString] = itemHref.split('?');
    
    if (pathname !== linkPath) {
      return false; 
    }

    const defaultTabForDashboard = "books";

    if (!queryString) { 
      return !currentTab || currentTab === defaultTabForDashboard;
    }

    const linkQuery = new URLSearchParams(queryString);
    const linkTab = linkQuery.get('tab');

    if (linkTab === defaultTabForDashboard) {
        return currentTab === defaultTabForDashboard || !currentTab;
    }
    
    return currentTab === linkTab;
  };

  return (
    <ScrollArea className="h-full">
      <nav className="flex flex-col gap-1 p-4">
        {adminNavItems.map((item) => (
          <Button
            key={item.href + item.label} // Ensure unique key
            asChild
            variant={isActive(item.href) ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start h-10 text-sm",
              isActive(item.href) && "bg-primary/10 text-primary hover:bg-primary/20",
              item.disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={item.disabled}
          >
            <Link href={item.disabled ? "#" : item.href}>
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
    </ScrollArea>
  );
}

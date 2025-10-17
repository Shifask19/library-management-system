
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookManagementTab } from "./BookManagementTab";
import { UserManagementTab } from "./UserManagementTab";
import { DonationApprovalTab } from "./DonationApprovalTab";
import { TransactionLogTab } from "./TransactionLogTab";
import { IssueRequestsTab } from "./IssueRequestsTab"; // New Import
import { BookMarked, Users, Gift, History, Settings, BellRing } from 'lucide-react'; // New Icon
import { PageHeader } from "../shared/PageHeader";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function AdminDashboardClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('books');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const tabFromQuery = searchParams.get('tab') || 'books';
    setActiveTab(tabFromQuery);
  }, [searchParams]);

  const onTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`${pathname}?tab=${value}`, { scroll: false });
  };
  
  if (!isMounted) {
    return (
        <div className="space-y-8">
            <div className="mb-6 sm:mb-8">
                <div className="h-10 w-1/3 bg-muted rounded-md animate-pulse"></div>
                <div className="h-6 w-1/2 mt-2 bg-muted rounded-md animate-pulse"></div>
            </div>
            <div className="h-12 w-full bg-muted rounded-md animate-pulse"></div>
            <div className="mt-6 space-y-4">
                <div className="h-10 w-1/4 bg-muted rounded-md animate-pulse"></div>
                <div className="h-48 w-full bg-muted rounded-md animate-pulse"></div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Admin Dashboard"
        description="Oversee and manage all library operations."
      />
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 gap-2 h-auto p-1">
          <TabsTrigger value="books" className="flex-col sm:flex-row h-auto py-2 sm:py-1.5 gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BookMarked className="h-5 w-5" /> <span>Book Management</span>
          </TabsTrigger>
          <TabsTrigger value="issue-requests" className="flex-col sm:flex-row h-auto py-2 sm:py-1.5 gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BellRing className="h-5 w-5" /> <span>Issue Requests</span>
          </TabsTrigger>
          <TabsTrigger value="donations" className="flex-col sm:flex-row h-auto py-2 sm:py-1.5 gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Gift className="h-5 w-5" /> <span>Donation Approvals</span>
          </TabsTrigger>
           <TabsTrigger value="users" className="flex-col sm:flex-row h-auto py-2 sm:py-1.5 gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-5 w-5" /> <span>User Management</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex-col sm:flex-row h-auto py-2 sm:py-1.5 gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="h-5 w-5" /> <span>Transaction Log</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-col sm:flex-row h-auto py-2 sm:py-1.5 gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-5 w-5" /> <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="mt-6">
          <BookManagementTab />
        </TabsContent>
        <TabsContent value="issue-requests" className="mt-6">
          <IssueRequestsTab />
        </TabsContent>
        <TabsContent value="donations" className="mt-6">
          <DonationApprovalTab />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UserManagementTab />
        </TabsContent>
        <TabsContent value="transactions" className="mt-6">
          <TransactionLogTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <div className="text-center py-12">
            <Settings className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">Settings</h3>
            <p className="text-muted-foreground">This feature is coming soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IssuedBooksTab } from "./IssuedBooksTab";
import { DonateBookTab } from "./DonateBookTab";
import { DonationHistoryTab } from "./DonationHistoryTab";
import { BrowseBooksTab } from "./BrowseBooksTab"; // Added for the new tab
import { BookOpenCheck, Gift, History, Library } from 'lucide-react';
import { PageHeader } from "../shared/PageHeader";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from '@/types'; // Import User type
import { auth, db } from '@/lib/firebase'; // For real auth
import { doc, getDoc } from 'firebase/firestore'; // For real auth
import { onAuthStateChanged } from 'firebase/auth'; // For real auth

export function UserDashboardClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = searchParams.get('tab') || 'issued-books';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pageTitleUserName, setPageTitleUserName] = useState<string>("User");

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && db) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = { id: user.uid, ...userDoc.data() } as User;
          setCurrentUser(userData);
          setPageTitleUserName(userData.name || user.email || 'User');
        } else {
          // User exists in auth but not in firestore
           setCurrentUser(null);
           router.push('/login/user');
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        router.push('/login/user');
      }
      setAuthLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Handle tab changes from URL
    const tabFromQuery = searchParams.get('tab') || 'issued-books';
    if (tabFromQuery !== activeTab) {
      setActiveTab(tabFromQuery);
    }
  }, [searchParams, activeTab]);

  const onTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`${pathname}?tab=${value}`, { scroll: false });
  };
  
  if (authLoading || !currentUser) {
    return (
        <div className="space-y-8">
            <div className="mb-6 sm:mb-8">
                <div className="h-10 w-1/3 bg-muted rounded-md animate-pulse"></div>
                <div className="h-6 w-1/2 mt-2 bg-muted rounded-md animate-pulse"></div>
            </div>
            <div className="h-12 w-full bg-muted rounded-md animate-pulse"></div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-64 w-full bg-muted rounded-lg animate-pulse" />)}
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
       <PageHeader 
        title={`Welcome, ${pageTitleUserName}!`}
        description="Manage your library activities here."
      />
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 h-auto p-1">
          <TabsTrigger value="issued-books" className="flex-col sm:flex-row h-auto py-2 sm:py-1.5 gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BookOpenCheck className="h-5 w-5" /> <span>My Issued Books</span>
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex-col sm:flex-row h-auto py-2 sm:py-1.5 gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Library className="h-5 w-5" /> <span>Browse Library</span>
          </TabsTrigger>
          <TabsTrigger value="donate" className="flex-col sm:flex-row h-auto py-2 sm:py-1.5 gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Gift className="h-5 w-5" /> <span>Donate a Book</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-col sm:flex-row h-auto py-2 sm:py-1.5 gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="h-5 w-5" /> <span>Donation History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issued-books" className="mt-6">
          <IssuedBooksTab currentUser={currentUser} />
        </TabsContent>
        <TabsContent value="browse" className="mt-6">
          <BrowseBooksTab currentUser={currentUser} />
        </TabsContent>
        <TabsContent value="donate" className="mt-6">
          <DonateBookTab currentUser={currentUser} />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <DonationHistoryTab currentUser={currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
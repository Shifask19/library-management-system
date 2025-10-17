"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Book, User } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, HelpCircle, CheckCircle2, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase.ts';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const getDonationStatusDetails = (status: Book['status']) => {
  switch (status) {
    case 'donated_pending_approval':
      return { text: 'Pending Approval', icon: HelpCircle, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' };
    case 'available': // 'donated_approved' is treated as 'available' once approved
      return { text: 'Approved & Available', icon: CheckCircle2, className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
    // Add a 'donated_rejected' status if needed
    // case 'donated_rejected':
    //   return { text: 'Rejected', icon: XCircle, className: 'bg-red-100 text-red-700' };
    default:
      // This will catch other statuses like 'issued' if an approved donated book is later issued
      return { text: 'Approved (In Circulation)', icon: CheckCircle2, className: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' };
  }
};

interface DonationHistoryTabProps {
    currentUser: User | null;
}

export function DonationHistoryTab({ currentUser }: DonationHistoryTabProps) {
  const [donationHistory, setDonationHistory] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDonationHistory = useCallback(async () => {
    if (!currentUser) {
        setIsLoading(false);
        return;
    }
    if (!db) {
        toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const booksCollection = collection(db, "books");
        const q = query(
            booksCollection,
            where("donatedBy.userId", "==", currentUser.id),
            orderBy("donatedBy.date", "desc")
        );
        const querySnapshot = await getDocs(q);
        const historyList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        setDonationHistory(historyList);
    } catch (error: any) {
        console.error("Error fetching donation history:", error);
        toast({
            title: "Error Fetching History",
            description: error.message || "Could not load your donation history.",
            variant: "destructive"
        });
        if (error.code === 'failed-precondition') {
            toast({
                title: "Index Required",
                description: "This query requires a Firestore index. Please deploy indexes.",
                variant: "destructive",
                duration: 10000,
            });
        }
    } finally {
        setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchDonationHistory();
  }, [fetchDonationHistory]);

  if (isLoading) {
    return (
       <div className="space-y-6">
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                 {[1,2,3,4,5].map(i => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1,2,3].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-12 w-10 rounded" /></TableCell>
                  {[1,2,3,4].map(j => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {donationHistory.length > 0 ? (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Cover</TableHead>
                <TableHead>Book Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donationHistory.map(book => {
                const statusDetails = getDonationStatusDetails(book.status);
                const Icon = statusDetails.icon;
                const submissionDate = book.donatedBy?.date?.toDate ? format(book.donatedBy.date.toDate(), "PP") : 'N/A';
                
                return (
                  <TableRow key={book.id}>
                    <TableCell>
                      <Image
                        src={book.coverImageUrl || `https://placehold.co/50x75.png?text=${book.title.substring(0,1)}`}
                        alt={book.title}
                        data-ai-hint={book.dataAiHint || "book cover small"}
                        width={40}
                        height={60}
                        className="rounded object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>{submissionDate}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusDetails.className}`}>
                        <Icon className="mr-1 h-3.5 w-3.5" />
                        {statusDetails.text}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12">
          <History className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No Donation History</h3>
          <p className="text-muted-foreground">You haven't made any book donations yet.</p>
        </div>
      )}
    </div>
  );
}
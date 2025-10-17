
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Eye, BellRing as BellRingIcon } from 'lucide-react';
import type { Book } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { db } from '@/lib/firebase.ts';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { sampleAdmin } from '@/types';
import { format } from 'date-fns';

// Helper function to log transactions
async function logTransaction(transactionData: Omit<import('@/types').Transaction, 'id' | 'timestamp'>) {
  if (!db) return;
  try {
    await addDoc(collection(db, "transactions"), {
      ...transactionData,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging transaction:", error);
  }
}

export function IssueRequestsTab() {
  const [requests, setRequests] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingRequest, setViewingRequest] = useState<Book | null>(null);
  const { toast } = useToast();

  const fetchIssueRequests = useCallback(async () => {
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
        where("status", "==", "issue_requested"),
        orderBy("issueDetails.issueDate", "desc")
      );
      const requestsSnapshot = await getDocs(q);
      const requestsList = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
      setRequests(requestsList);
    } catch (error: any) {
      console.error("Error fetching issue requests:", error);
      toast({ 
        title: "Error Fetching Requests", 
        description: error.message || "Could not load issue requests.", 
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
  }, [toast]);

  useEffect(() => {
    fetchIssueRequests();
  }, [fetchIssueRequests]);

  const handleApproveRequest = async (book: Book) => {
    if (!db || !book.issueDetails) {
      toast({ title: "Error", description: "Book details are missing.", variant: "destructive" });
      return;
    }
    
    const issueDate = book.issueDetails.issueDate.toDate(); // Convert timestamp to Date
    const dueDate = new Date(issueDate);
    dueDate.setDate(issueDate.getDate() + 14);

    const bookRef = doc(db, "books", book.id);
    try {
      await updateDoc(bookRef, { 
        status: 'issued',
        "issueDetails.dueDate": dueDate.toISOString(),
        // issueDate is already set from the request, just ensuring dueDate is now concrete
      }); 
      
      await logTransaction({
        bookId: book.id,
        bookTitle: book.title,
        userId: book.issueDetails.userId,
        userName: book.issueDetails.userName,
        type: 'issue',
        dueDate: dueDate.toISOString(),
        notes: `Request approved by Admin: ${sampleAdmin.name || 'Admin'}`
      });

      toast({ title: "Request Approved", description: `"${book.title}" has been issued to ${book.issueDetails.userName}.` });
      fetchIssueRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({ title: "Error Approving Request", description: "Could not approve the request.", variant: "destructive" });
    }
  };

  const handleRejectRequest = async (book: Book) => {
    if (!db || !book.issueDetails) {
        toast({ title: "Error", description: "Book details are missing.", variant: "destructive" });
        return;
    }
    const bookRef = doc(db, "books", book.id);
    try {
      // Revert status to available and clear issue details
      await updateDoc(bookRef, {
        status: 'available',
        issueDetails: null
      });
      
      await logTransaction({
        bookId: book.id,
        bookTitle: book.title,
        userId: book.issueDetails.userId,
        userName: book.issueDetails.userName,
        type: 'issue_reject',
        notes: `Request rejected by Admin: ${sampleAdmin.name || 'Admin'}`
      });
      
      toast({ title: "Request Rejected", description: `The issue request for "${book.title}" has been rejected.`});
      fetchIssueRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({ title: "Error Rejecting Request", description: "Could not reject the request.", variant: "destructive" });
    }
  };

  if (isLoading) {
     return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
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
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <BellRingIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No Pending Issue Requests</h3>
          <p className="text-muted-foreground">There are currently no books awaiting issue approval.</p>
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Cover</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date Requested</TableHead>
                <TableHead className="text-right w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((book) => {
                const placeholderChar = encodeURIComponent(book.title?.charAt(0)?.toUpperCase() || 'R');
                let imageSrcTable = `https://placehold.co/50x75.png?text=${placeholderChar}`;
                if (book.coverImageUrl && (book.coverImageUrl.startsWith('http://') || book.coverImageUrl.startsWith('https://'))) {
                  imageSrcTable = book.coverImageUrl;
                }
                const requestDate = book.issueDetails?.issueDate?.toDate ? format(book.issueDetails.issueDate.toDate(), "PPpp") : 'N/A';

                return (
                  <TableRow key={book.id}>
                    <TableCell>
                      <Image
                        src={imageSrcTable}
                        alt={book.title || 'Book cover'}
                        data-ai-hint={book.dataAiHint || "book cover small"}
                        width={40}
                        height={60}
                        className="rounded object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.issueDetails?.userName || 'N/A'}</TableCell>
                    <TableCell>{requestDate}</TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => handleApproveRequest(book)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => handleRejectRequest(book)}>
                        <XCircle className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

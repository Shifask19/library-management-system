
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Undo as UndoIcon } from 'lucide-react';
import type { Book } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { db } from '@/lib/firebase.ts';
import { collection, getDocs, updateDoc, doc, query, where, orderBy, addDoc, serverTimestamp, deleteField } from "firebase/firestore";
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

export function ReturnRequestsTab() {
  const [requests, setRequests] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchReturnRequests = useCallback(async () => {
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
        where("status", "==", "return_requested"),
        orderBy("issueDetails.issueDate", "desc") // Order by when it was issued
      );
      const requestsSnapshot = await getDocs(q);
      const requestsList = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
      setRequests(requestsList);
    } catch (error: any) {
      console.error("Error fetching return requests:", error);
      toast({ 
        title: "Error Fetching Requests", 
        description: error.message || "Could not load return requests.", 
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
    fetchReturnRequests();
  }, [fetchReturnRequests]);

  const handleApproveReturn = async (book: Book) => {
    if (!db || !book.issueDetails) {
      toast({ title: "Error", description: "Book details are missing.", variant: "destructive" });
      return;
    }

    const bookRef = doc(db, "books", book.id);
    try {
      await updateDoc(bookRef, { 
        status: 'available',
        issueDetails: deleteField(),
      }); 
      
      await logTransaction({
        bookId: book.id,
        bookTitle: book.title,
        userId: book.issueDetails.userId,
        userName: book.issueDetails.userName,
        type: 'return',
        notes: `Return approved by Admin: ${sampleAdmin.name || 'Admin'}`
      });

      toast({ title: "Return Approved", description: `"${book.title}" is now available in the library.` });
      fetchReturnRequests();
    } catch (error) {
      console.error("Error approving return:", error);
      toast({ title: "Error Approving Return", description: "Could not approve the return.", variant: "destructive" });
    }
  };

  const handleRejectReturn = async (book: Book) => {
    if (!db || !book.issueDetails) {
        toast({ title: "Error", description: "Book details are missing.", variant: "destructive" });
        return;
    }
    const bookRef = doc(db, "books", book.id);
    try {
      // Revert status to 'issued'
      await updateDoc(bookRef, {
        status: 'issued',
      });
      
      await logTransaction({
        bookId: book.id,
        bookTitle: book.title,
        userId: book.issueDetails.userId,
        userName: book.issueDetails.userName,
        type: 'return_reject',
        notes: `Return request rejected by Admin: ${sampleAdmin.name || 'Admin'}`
      });
      
      toast({ title: "Return Rejected", description: `The return request for "${book.title}" has been rejected. The book remains issued.`});
      fetchReturnRequests();
    } catch (error) {
      console.error("Error rejecting return:", error);
      toast({ title: "Error Rejecting Return", description: "Could not reject the return request.", variant: "destructive" });
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
                 {["Cover", "Title", "Requested By", "Due Date", "Actions"].map(i => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
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
          <UndoIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No Pending Return Requests</h3>
          <p className="text-muted-foreground">There are currently no books awaiting return approval.</p>
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Cover</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Issued To</TableHead>
                <TableHead>Due Date</TableHead>
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
                const dueDate = book.issueDetails?.dueDate?.toDate ? format(book.issueDetails.dueDate.toDate(), "PP") : 'N/A';

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
                    <TableCell>{dueDate}</TableCell>
                    <TableCell className="text-right space-x-2">
                       <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => handleApproveReturn(book)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Approve Return
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => handleRejectReturn(book)}>
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

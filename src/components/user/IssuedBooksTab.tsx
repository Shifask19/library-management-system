
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Book, User } from '@/types';
import { BookCard } from '@/components/shared/BookCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpenCheck, Search, RefreshCcw, Loader2 as SpinnerIcon, Undo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase.ts';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { format } from 'date-fns';

const RENEWAL_PERIOD_DAYS = 7;

interface IssuedBooksTabProps {
  currentUser: User | null;
}

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

const isBookOverdue = (book: Book): boolean => {
  if (book.status === 'issued' && book.issueDetails?.dueDate) {
    const dueDate = book.issueDetails.dueDate.toDate ? book.issueDetails.dueDate.toDate() : new Date(book.issueDetails.dueDate);
    const now = new Date();
    // Compare date parts only
    const dueDateNormalized = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const nowNormalized = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return dueDateNormalized < nowNormalized;
  }
  return false;
};

export function IssuedBooksTab({ currentUser }: IssuedBooksTabProps) {
  const [userBooks, setUserBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'due_soon' | 'overdue' | 'return_requested'>('all');
  const { toast } = useToast();

  const fetchIssuedBooks = useCallback(async () => {
    if (!currentUser || !currentUser.id) {
      setIsLoading(false);
      return;
    }
    if (!db) {
      setTimeout(() => toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" }), 0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const booksCollection = collection(db, "books");
      const q = query(
        booksCollection, 
        where("issueDetails.userId", "==", currentUser.id),
        where("status", "in", ["issued", "return_requested"]),
        orderBy("issueDetails.dueDate", "asc")
      );
      const querySnapshot = await getDocs(q);
      const booksList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
      setUserBooks(booksList);
    } catch (error: any) {
      console.error("Error fetching issued books:", error);
      setTimeout(() => toast({ 
        title: "Error Fetching Your Books", 
        description: error.message || "Could not load your issued books.", 
        variant: "destructive" 
      }), 0);
      if (error.code === 'failed-precondition') {
        setTimeout(() => toast({
          title: "Index Required",
          description: "An index is required for this query. Please deploy Firestore indexes.",
          variant: "destructive",
          duration: 10000,
        }), 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchIssuedBooks();
  }, [fetchIssuedBooks]);

  const handleRenewBook = async (bookId: string, bookTitle: string) => {
     if (!currentUser || !db) {
      toast({ title: "Error", description: "Cannot renew book at this time.", variant: "destructive" });
      return;
    }
    
    const bookToRenew = userBooks.find(b => b.id === bookId);
    if (!bookToRenew || !bookToRenew.issueDetails?.dueDate) {
      toast({ title: "Renewal Failed", description: "Book or issue details not found.", variant: "destructive" });
      return;
    }

    if (isBookOverdue(bookToRenew)) {
        toast({ title: "Renewal Not Allowed", description: "Overdue books cannot be renewed. Please contact the library.", variant: "destructive" });
        return;
    }
    
    const currentDueDate = bookToRenew.issueDetails.dueDate.toDate ? bookToRenew.issueDetails.dueDate.toDate() : new Date(bookToRenew.issueDetails.dueDate);
    const newDueDate = new Date(currentDueDate);
    newDueDate.setDate(currentDueDate.getDate() + RENEWAL_PERIOD_DAYS);

    const bookRef = doc(db, "books", bookId);
    try {
      await updateDoc(bookRef, {
        "issueDetails.dueDate": serverTimestamp(),
      });

      await logTransaction({
        bookId: bookId,
        bookTitle: bookTitle,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email || 'User',
        type: 'renewal',
        dueDate: newDueDate.toISOString(),
        notes: `Renewed from ${currentDueDate.toLocaleDateString()} to ${newDueDate.toLocaleDateString()}`
      });

      toast({
        title: "Book Renewed",
        description: `"${bookTitle}" has been renewed. New due date: ${newDueDate.toLocaleDateString()}.`,
      });
      fetchIssuedBooks(); 
    } catch (error) {
      console.error("Error renewing book:", error);
      toast({ title: "Renewal Failed", description: "Could not renew the book. Please try again.", variant: "destructive" });
    }
  };
  
  const handleRequestReturn = async (bookId: string, bookTitle: string) => {
    if (!currentUser || !db) {
      toast({ title: "Error", description: "Cannot request return at this time.", variant: "destructive" });
      return;
    }

    const bookRef = doc(db, "books", bookId);
    try {
      await updateDoc(bookRef, {
        status: 'return_requested',
      });

      await logTransaction({
        bookId: bookId,
        bookTitle: bookTitle,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email || 'User',
        type: 'return_request',
        notes: `User requested to return '${bookTitle}'`
      });

      toast({
        title: "Return Requested",
        description: `Your request to return "${bookTitle}" has been sent. Please bring the book to the library desk for confirmation.`,
      });
      fetchIssuedBooks(); // Refresh the list of issued books
    } catch (error) {
      console.error("Error requesting book return:", error);
      toast({ title: "Request Failed", description: "Could not send your return request. Please try again.", variant: "destructive" });
    }
  };


  const filteredAndSortedBooks = userBooks
    .filter(book => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = book.title.toLowerCase().includes(lowerSearchTerm) ||
                            book.author.toLowerCase().includes(lowerSearchTerm);

      if (!matchesSearch) return false;

      if (filter === 'all') return true;
      if (filter === 'return_requested') return book.status === 'return_requested';
      
      if (!book.issueDetails?.dueDate) return false;
      const dueDate = book.issueDetails.dueDate.toDate ? book.issueDetails.dueDate.toDate() : new Date(book.issueDetails.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      const normalizedDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());


      const diffTime = normalizedDueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (filter === 'overdue') return diffDays < 0;
      if (filter === 'due_soon') return diffDays >= 0 && diffDays <= 3;
      return true;
    });

  if (isLoading && !userBooks.length) { 
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Skeleton className="h-10 w-full sm:max-w-sm" />
          <Skeleton className="h-10 w-full sm:w-[180px]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1 bg-muted/50 rounded-lg">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search your issued books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Issued</SelectItem>
            <SelectItem value="due_soon">Due Soon</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="return_requested">Return Requested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && userBooks.length > 0 && <SpinnerIcon className="mx-auto h-8 w-8 animate-spin text-primary my-4" />}

      {!isLoading && filteredAndSortedBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedBooks.map(book => (
            <BookCard 
              key={book.id} 
              book={book}
            >
              <div className="space-y-2 w-full">
                <ConfirmationDialog
                  triggerButton={
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={!currentUser || isBookOverdue(book) || book.status === 'return_requested'}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" /> Request Renewal
                    </Button>
                  }
                  title="Confirm Book Renewal"
                  description={`Are you sure you want to renew "${book.title}"? The due date will be extended by ${RENEWAL_PERIOD_DAYS} days.`}
                  onConfirm={() => handleRenewBook(book.id, book.title)}
                  confirmText="Yes, Renew"
                />
                 <ConfirmationDialog
                  triggerButton={
                    <Button
                      className="w-full"
                      variant="default"
                      disabled={!currentUser || book.status === 'return_requested'}
                    >
                      <Undo className="mr-2 h-4 w-4" /> Request Return
                    </Button>
                  }
                  title="Confirm Return Request"
                  description={`This will notify the librarian that you want to return "${book.title}". Please bring the physical book to the circulation desk to complete the return process.`}
                  onConfirm={() => handleRequestReturn(book.id, book.title)}
                  confirmText="Yes, Send Request"
                />
              </div>
            </BookCard>
          ))}
        </div>
      ) : (
        !isLoading && ( 
          <div className="text-center py-12 rounded-lg bg-card border">
            {searchTerm || filter !== 'all' ? (
              <>
                <Search className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No Books Found</h3>
                <p className="text-muted-foreground">No books match your current search or filter.</p>
              </>
            ) : (
              <>
                <BookOpenCheck className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">No Books Issued</h3>
                <p className="text-muted-foreground">You currently have no books issued from the library.</p>
                <Button variant="link" className="mt-4 text-primary" asChild>
                    <a href="/user/dashboard?tab=browse">Browse Library Catalog</a>
                </Button>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}

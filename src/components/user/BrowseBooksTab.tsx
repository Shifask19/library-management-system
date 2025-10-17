
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Book, User } from '@/types';
import { BookCard } from '@/components/shared/BookCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Library, Loader2 as SpinnerIcon, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase.ts';
import { collection, getDocs, doc, updateDoc, query, where, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';

interface BrowseBooksTabProps {
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

const bookCategories = ["All", "Computer Science", "Fiction", "Science", "History", "Mathematics", "Engineering", "Literature", "Thriller", "Physics", "Electronics", "Other"];

export function BrowseBooksTab({ currentUser }: BrowseBooksTabProps) {
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchAvailableBooks = useCallback(async () => {
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
        where("status", "in", ["available", "donated_approved"]),
        orderBy("title")
      );
      const booksSnapshot = await getDocs(q);
      const booksList = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
      setAllBooks(booksList);
    } catch (error: any) {
       setTimeout(() => toast({
        title: "Error Fetching Books",
        description: error.message || "Could not load available books.",
        variant: "destructive"
      }), 0);
       if (error.code === 'failed-precondition') {
        setTimeout(() => toast({
          title: "Index Required",
          description: "An index is required for this query. Please deploy firestore indexes.",
          variant: "destructive",
          duration: 10000,
        }), 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAvailableBooks();
  }, [fetchAvailableBooks]);

  const handleRequestIssue = async (bookId: string, bookTitle: string) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "You must be logged in to request a book.", variant: "destructive" });
      return;
    }
    if (!db) {
      toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" });
      return;
    }

    const bookRef = doc(db, "books", bookId);
    
    // This is a simplified `issueDetails` for the request phase.
    // The final `dueDate` will be set by the admin upon approval.
    const requestDetails = {
      userId: currentUser.id,
      userName: currentUser.name || currentUser.email || 'User',
      issueDate: serverTimestamp(), // Marks the request time
      dueDate: null, // To be set upon approval
    };

    try {
      await updateDoc(bookRef, { 
        status: 'issue_requested', 
        issueDetails: requestDetails 
      });

      await logTransaction({
        bookId: bookId,
        bookTitle: bookTitle,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email || 'User',
        type: 'issue_request',
      });

      toast({
        title: "Request Sent!",
        description: `Your request to issue "${bookTitle}" has been sent for admin approval.`,
      });
      fetchAvailableBooks(); // Refresh list to remove the requested book
    } catch (error) {
      console.error("Error requesting book issue:", error);
      toast({ title: "Error Sending Request", description: "Could not send your request. Please try again.", variant: "destructive" });
    }
  };

  const filteredBooks = allBooks
    .filter(book => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = book.title.toLowerCase().includes(lowerSearchTerm) ||
                            book.author.toLowerCase().includes(lowerSearchTerm) ||
                            (book.isbn && book.isbn.toLowerCase().includes(lowerSearchTerm));

      const matchesCategory = categoryFilter === 'all' || (book.category && book.category === categoryFilter);

      return matchesSearch && matchesCategory;
    });


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Skeleton className="h-10 w-full sm:max-w-sm" />
          <Skeleton className="h-10 w-full sm:w-[200px]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-96 w-full rounded-lg" />)}
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
            placeholder="Search by title, author, ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-background">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {bookCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map(book => (
            <BookCard
              key={book.id}
              book={book}
            >
              <ConfirmationDialog
                triggerButton={
                  <Button
                    className="w-full mt-2"
                    variant="default"
                    disabled={!currentUser || (book.status !== 'available' && book.status !== 'donated_approved')}
                  >
                    <BellRing className="mr-2 h-4 w-4" />
                    Request to Issue
                  </Button>
                }
                title="Confirm Issue Request"
                description={`Are you sure you want to request to issue "${book.title}"? An admin will need to approve it.`}
                onConfirm={() => handleRequestIssue(book.id, book.title)}
                confirmText="Yes, Send Request"
              />
            </BookCard>
          ))}
        </div>
      ) : (
         <div className="text-center py-12 rounded-lg bg-card border">
          <Library className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No Books Available</h3>
          <p className="text-muted-foreground">
            {searchTerm || categoryFilter !== 'all'
              ? "No books match your current search or filter criteria."
              : "No books are currently available for issue in the library system."}
          </p>
        </div>
      )}
    </div>
  );
}

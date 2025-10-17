
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, MoreHorizontal, Search, Edit2, Trash2, BookOpenCheck, Undo, Loader2 as SpinnerIcon } from 'lucide-react';
import type { Book } from '@/types';
import { StatusPill } from '@/components/shared/StatusPill';
import { BookFormModal } from './BookFormModal';
import { useToast } from '@/hooks/use-toast';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import Image from 'next/image';
import { db } from '@/lib/firebase.ts';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, writeBatch, getDoc, deleteField } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { sampleAdmin } from '@/types'; // For admin name in transactions

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
    // Optionally, inform admin if logging fails, but don't block main action
  }
}

export function BookManagementTab() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { toast } = useToast();
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issuingBook, setIssuingBook] = useState<Book | null>(null);
  const [issueToUserId, setIssueToUserId] = useState('');
  const [issueToUserName, setIssueToUserName] = useState(''); // Added for simpler name storage

  const fetchBooks = useCallback(async () => {
    if (!db) {
      toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const booksCollection = collection(db, "books");
      const q = query(booksCollection, orderBy("title"));
      const booksSnapshot = await getDocs(q);
      const booksList = booksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
      setBooks(booksList);
    } catch (error) {
      console.error("Error fetching books:", error);
      toast({ title: "Error Fetching Books", description: "Could not load books from the database.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleSaveBook = async (bookData: Omit<Book, 'id' | 'issueDetails' | 'donatedBy'> | Book) => {
    if (!db) {
      toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" });
      return;
    }
    
    try {
      if ('id' in bookData && bookData.id) {
        const bookRef = doc(db, "books", bookData.id);
        const { id, ...dataToUpdate } = bookData; 
        await updateDoc(bookRef, dataToUpdate);
        toast({ title: "Book Updated", description: `"${bookData.title}" has been successfully updated.` });
      } else {
        const { issueDetails, donatedBy, ...newBookData } = bookData as Omit<Book, 'id'>;
        await addDoc(collection(db, "books"), newBookData);
        toast({ title: "Book Added", description: `"${bookData.title}" has been successfully added.` });
      }
      fetchBooks();
      setEditingBook(null);
    } catch (error) {
      console.error("Error saving book:", error);
      toast({ title: "Error Saving Book", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!db) {
      toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, "books", bookId));
      toast({ title: "Book Deleted", description: `"${bookTitle}" has been removed from the library.` });
      fetchBooks(); 
    } catch (error) {
      console.error("Error deleting book:", error);
      toast({ title: "Error Deleting Book", description: "Could not remove the book.", variant: "destructive" });
    }
  };
  
  const handleConfirmIssueBook = async () => {
    if (!db || !issuingBook || !issueToUserId) {
      toast({ title: "Error", description: "Required information is missing to issue the book.", variant: "destructive" });
      return;
    }

    // Attempt to fetch user's name from 'users' collection
    let finalUserName = issueToUserName || 'Unknown User'; // Default if manual input is empty or not used
    if (!issueToUserName && issueToUserId) { // If name not manually entered, try fetching
        try {
            const userDocRef = doc(db, "users", issueToUserId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                finalUserName = userDocSnap.data().name || userDocSnap.data().email || 'User';
            } else {
                 toast({ title: "Warning", description: `User with ID ${issueToUserId} not found in users collection. Using provided/default name.`, variant: "default" });
            }
        } catch (userFetchError) {
            console.error("Error fetching user details:", userFetchError);
            toast({ title: "Warning", description: "Could not verify user details. Using provided/default name.", variant: "default" });
        }
    }


    const bookRef = doc(db, "books", issuingBook.id);
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(issueDate.getDate() + 14); // Due in 14 days

    const issueDetails = { 
      userId: issueToUserId,
      userName: finalUserName,
      issueDate: serverTimestamp(), 
      dueDate: dueDate.toISOString()
    };
    
    try {
      await updateDoc(bookRef, { status: 'issued', issueDetails });
      
      await logTransaction({
        bookId: issuingBook.id,
        bookTitle: issuingBook.title,
        userId: issueToUserId,
        userName: finalUserName, // Use the fetched/entered name
        type: 'issue',
        dueDate: dueDate.toISOString(),
        notes: `Issued by Admin: ${sampleAdmin.name || 'Admin'}`
      });

      toast({ title: "Book Issued", description: `"${issuingBook.title}" has been issued to ${finalUserName}.` });
      fetchBooks();
      setIsIssueModalOpen(false);
      setIssuingBook(null);
      setIssueToUserId('');
      setIssueToUserName('');
    } catch (error) {
      console.error("Error issuing book:", error);
      toast({ title: "Error Issuing Book", description: "Could not issue the book.", variant: "destructive" });
    }
  };


  const handleReturnBook = async (book: Book) => {
    if (!db) {
      toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" });
      return;
    }
    const bookRef = doc(db, "books", book.id);
    try {
      await updateDoc(bookRef, { status: 'available', issueDetails: deleteField() }); 
      
      await logTransaction({
        bookId: book.id,
        bookTitle: book.title,
        userId: book.issueDetails?.userId || 'unknown_user_return', // Log original user if available
        userName: book.issueDetails?.userName || 'Unknown User',
        type: 'return',
        notes: `Returned to Admin: ${sampleAdmin.name || 'Admin'}`
      });
      
      toast({ title: "Book Returned", description: `"${book.title}" has been marked as available.` });
      fetchBooks();
    } catch (error) {
      console.error("Error returning book:", error);
      toast({ title: "Error Returning Book", description: "Could not return the book.", variant: "destructive" });
    }
  };

  const filteredBooks = books.filter(book =>
    (book.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.author || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (book.isbn && book.isbn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {[1,2,3,4,5,6,7,8].map(i => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1,2,3,4,5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-12 w-10 rounded" /></TableCell>
                  {[1,2,3,4,5,6,7].map(j => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
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
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search books by title, author, ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <BookFormModal
          book={null}
          onSave={handleSaveBook}
          triggerButton={
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Book
            </Button>
          }
        />
      </div>

      <div className="rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Cover</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issued To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBooks.length > 0 ? (
              filteredBooks.map((book) => {
                const placeholderChar = encodeURIComponent(book.title?.charAt(0)?.toUpperCase() || 'B');
                let imageSrc = `https://placehold.co/40x60.png?text=${placeholderChar}`;
                if (book.coverImageUrl && (book.coverImageUrl.startsWith('http://') || book.coverImageUrl.startsWith('https://'))) {
                  imageSrc = book.coverImageUrl;
                }
                return (
                  <TableRow key={book.id}>
                    <TableCell>
                      <Image
                        src={imageSrc}
                        alt={book.title || 'Book cover'}
                        data-ai-hint={book.dataAiHint || "book cover small"}
                        width={40}
                        height={60}
                        className="rounded object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>{book.isbn}</TableCell>
                    <TableCell>
                      <StatusPill book={book} />
                    </TableCell>
                    <TableCell>
                      {book.status === 'issued' && book.issueDetails?.userName 
                        ? book.issueDetails.userName 
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {book.status === 'issued' && book.issueDetails?.dueDate 
                        ? new Date(book.issueDetails.dueDate).toLocaleDateString() 
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            setEditingBook(book);
                          }}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          {(book.status === 'available' || book.status === 'donated_approved') && (
                            <DropdownMenuItem onClick={() => {setIssuingBook(book); setIsIssueModalOpen(true);}}>
                              <BookOpenCheck className="mr-2 h-4 w-4" /> Issue Book
                            </DropdownMenuItem>
                          )}
                          {book.status === 'issued' && (
                            <DropdownMenuItem onClick={() => handleReturnBook(book)}>
                              <Undo className="mr-2 h-4 w-4" /> Return Book
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <ConfirmationDialog
                              triggerButton={
                                  <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-destructive hover:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </button>
                              }
                              title="Delete Book"
                              description={`Are you sure you want to delete "${book.title || 'this book'}"? This action cannot be undone.`}
                              onConfirm={() => handleDeleteBook(book.id, book.title || 'this book')}
                              variant="destructive"
                           />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No books found. {searchTerm && "Try a different search term."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {editingBook && (
        <BookFormModal
          book={editingBook}
          onSave={async (data) => {
            await handleSaveBook(data);
            setEditingBook(null); 
          }}
          triggerButton={<div style={{display: 'none'}} />} 
        />
      )}

      {isIssueModalOpen && issuingBook && (
        <Dialog open={isIssueModalOpen} onOpenChange={ (open) => {
            if (!open) {
                setIssuingBook(null);
                setIssueToUserId('');
                setIssueToUserName('');
            }
            setIsIssueModalOpen(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Book: {issuingBook.title}</DialogTitle>
              <DialogDescription>Enter user ID to issue this book to.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="userId" className="text-right">User ID</Label>
                <Input id="userId" value={issueToUserId} onChange={(e) => setIssueToUserId(e.target.value)} className="col-span-3" placeholder="Enter registered User ID" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="userName" className="text-right">User Name (Optional)</Label>
                <Input id="userName" value={issueToUserName} onChange={(e) => setIssueToUserName(e.target.value)} className="col-span-3" placeholder="Enter user name (if known)" />
              </div>
              <p className="text-sm text-muted-foreground col-span-4 px-1">If User Name is left blank, the system will attempt to fetch it using the User ID. Due date will be set to 14 days from today.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {setIsIssueModalOpen(false); setIssuingBook(null); setIssueToUserId(''); setIssueToUserName('');}}>Cancel</Button>
              <Button onClick={handleConfirmIssueBook} disabled={!issueToUserId}>Confirm Issue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

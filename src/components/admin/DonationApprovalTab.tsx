
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Eye, Gift as GiftIcon } from 'lucide-react';
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
import { collection, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { sampleAdmin } from '@/types';

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

export function DonationApprovalTab() {
  const [donations, setDonations] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDonation, setViewingDonation] = useState<Book | null>(null);
  const { toast } = useToast();

  const fetchPendingDonations = useCallback(async () => {
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
        where("status", "==", "donated_pending_approval"),
        orderBy("donatedBy.date", "desc")
      );
      const donationsSnapshot = await getDocs(q);
      const donationsList = donationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
      setDonations(donationsList);
    } catch (error: any) {
      console.error("Error fetching pending donations:", error);
      toast({ 
        title: "Error Fetching Donations", 
        description: error.message || "Could not load pending donations.", 
        variant: "destructive" 
      });
      if (error.code === 'failed-precondition') {
        toast({
          title: "Index Required",
          description: "The query for pending donations requires an index. Please deploy Firestore indexes.",
          variant: "destructive",
          duration: 10000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPendingDonations();
  }, [fetchPendingDonations]);

  const handleApproveDonation = async (book: Book) => {
    if (!db) {
      toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" });
      return;
    }
    const bookRef = doc(db, "books", book.id);
    try {
      await updateDoc(bookRef, { status: 'available' }); 
      
      await logTransaction({
        bookId: book.id,
        bookTitle: book.title,
        userId: book.donatedBy?.userId || 'unknown_donor',
        userName: book.donatedBy?.userName || 'Unknown Donor',
        type: 'donate_approve',
        notes: `Donation approved by Admin: ${sampleAdmin.name || 'Admin'}`
      });

      toast({ title: "Donation Approved", description: `"${book.title}" has been approved and added to the library as available.` });
      fetchPendingDonations();
    } catch (error) {
      console.error("Error approving donation:", error);
      toast({ title: "Error Approving Donation", description: "Could not approve the donation.", variant: "destructive" });
    }
  };

  const handleRejectDonation = async (book: Book) => {
    if (!db) {
      toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" });
      return;
    }
    try {
      // It's better to update status to 'donated_rejected' or similar if you want a record,
      // but for now, we'll delete as per original logic.
      await deleteDoc(doc(db, "books", book.id));
      
      await logTransaction({
        bookId: book.id, // The ID is still available before deletion
        bookTitle: book.title,
        userId: book.donatedBy?.userId || 'unknown_donor',
        userName: book.donatedBy?.userName || 'Unknown Donor',
        type: 'donate_reject',
        notes: `Donation rejected by Admin: ${sampleAdmin.name || 'Admin'}`
      });
      
      toast({ title: "Donation Rejected", description: `The donation request for "${book.title}" has been rejected and removed.`});
      fetchPendingDonations();
    } catch (error) {
      console.error("Error rejecting donation:", error);
      toast({ title: "Error Rejecting Donation", description: "Could not reject the donation.", variant: "destructive" });
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
                 {[1,2,3,4,5,6].map(i => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1,2,3].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-12 w-10 rounded" /></TableCell>
                  {[1,2,3,4,5].map(j => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
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
      {donations.length === 0 ? (
        <div className="text-center py-12">
          <GiftIcon className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No Pending Donations</h3>
          <p className="text-muted-foreground">There are currently no books awaiting donation approval.</p>
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Cover</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Donated By</TableHead>
                <TableHead>Date Donated</TableHead>
                <TableHead className="text-right w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((book) => {
                const placeholderChar = encodeURIComponent(book.title?.charAt(0)?.toUpperCase() || 'D');
                let imageSrcTable = `https://placehold.co/50x75.png?text=${placeholderChar}`;
                if (book.coverImageUrl && (book.coverImageUrl.startsWith('http://') || book.coverImageUrl.startsWith('https://'))) {
                  imageSrcTable = book.coverImageUrl;
                }
                const donationDate = book.donatedBy?.date?.toDate ? book.donatedBy.date.toDate().toLocaleDateString() : 'N/A';
                
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
                    <TableCell>{book.author}</TableCell>
                    <TableCell>{book.donatedBy?.userName || 'N/A'}</TableCell>
                    <TableCell>{donationDate}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Dialog onOpenChange={(open) => !open && setViewingDonation(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setViewingDonation(book)}>
                            <Eye className="mr-1 h-4 w-4" /> View
                          </Button>
                        </DialogTrigger>
                        {viewingDonation && viewingDonation.id === book.id && (
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>{viewingDonation.title || "Book Details"}</DialogTitle>
                              <DialogDescription>By {viewingDonation.author || "Unknown Author"}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 text-sm max-h-[60vh] overflow-y-auto py-4">
                              <p><strong>ISBN:</strong> {viewingDonation.isbn}</p>
                              <p><strong>Category:</strong> {viewingDonation.category}</p>
                              <p><strong>Published:</strong> {viewingDonation.publishedDate}</p>
                              <p><strong>Donated By:</strong> {viewingDonation.donatedBy?.userName} on {viewingDonation.donatedBy?.date?.toDate ? viewingDonation.donatedBy.date.toDate().toLocaleDateString() : 'N/A'}</p>
                              <p><strong>Description:</strong> {viewingDonation.description || "No description provided."}</p>
                              {(() => {
                                let imageToDisplayDialog = null;
                                const dialogPlaceholderText = encodeURIComponent(viewingDonation.title || 'Book Preview');
                                let defaultDialogImageSrc = `https://placehold.co/150x225.png?text=${dialogPlaceholderText}`;

                                if (viewingDonation.coverImageUrl && (viewingDonation.coverImageUrl.startsWith('http://') || viewingDonation.coverImageUrl.startsWith('https://'))) {
                                  imageToDisplayDialog = viewingDonation.coverImageUrl;
                                } else {
                                  imageToDisplayDialog = defaultDialogImageSrc; // Always show a placeholder if actual image is invalid/missing
                                }
                                
                                return (
                                  <Image 
                                    src={imageToDisplayDialog} 
                                    alt={viewingDonation.title || 'Book cover'} 
                                    width={150} 
                                    height={225} 
                                    className="rounded mt-2 object-contain" 
                                    data-ai-hint={viewingDonation.dataAiHint || "book cover"} 
                                  />
                                );
                              })()}
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                      <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => handleApproveDonation(book)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-100" onClick={() => handleRejectDonation(book)}>
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

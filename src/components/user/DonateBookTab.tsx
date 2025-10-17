
"use client";

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { db } from '@/lib/firebase.ts';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { User, Book } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface DonateBookTabProps {
  currentUser: User | null;
}

const bookCategories = ["Computer Science", "Fiction", "Science", "History", "Mathematics", "Engineering", "Literature", "Thriller", "Physics", "Electronics", "Other"];

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

export function DonateBookTab({ currentUser }: DonateBookTabProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState("");
  const [publishedDate, setPublishedDate] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) {
      toast({ title: "Login Required", description: "You must be logged in to donate a book.", variant: "destructive" });
      return;
    }
    if (!db) {
      toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const newBookData: Omit<Book, 'id'> = {
      title,
      author,
      isbn,
      category,
      publishedDate,
      description,
      coverImageUrl: coverImageUrl || `https://placehold.co/300x450.png?text=${encodeURIComponent(title)}`,
      status: 'donated_pending_approval',
      donatedBy: {
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email || 'Anonymous User',
        date: serverTimestamp(),
      },
    };

    try {
      const docRef = await addDoc(collection(db, "books"), newBookData);
      
      await logTransaction({
        bookId: docRef.id,
        bookTitle: title,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email || 'Anonymous User',
        type: 'donate_request',
        notes: `User submitted donation for '${title}'`
      });

      toast({
        title: "Donation Submitted",
        description: `Thank you for donating "${title}"! Your request is pending approval.`,
      });
      // Reset form
      setTitle('');
      setAuthor('');
      setIsbn('');
      setCategory('');
      setPublishedDate('');
      setDescription('');
      setCoverImageUrl('');
    } catch (error) {
      console.error("Donation submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Could not submit your donation request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="items-center text-center">
          <Gift className="h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-2xl font-headline">Donate a Book</CardTitle>
          <CardDescription>Share your books with the PES community. Fill out the form below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title-donate">Book Title</Label>
                <Input id="title-donate" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author-donate">Author(s)</Label>
                <Input id="author-donate" value={author} onChange={(e) => setAuthor(e.target.value)} required disabled={isLoading} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="isbn-donate">ISBN</Label>
                <Input id="isbn-donate" value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="e.g., 978-3-16-148410-0" required disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publishedDate-donate">Published Year</Label>
                <Input id="publishedDate-donate" type="text" value={publishedDate} onChange={(e) => setPublishedDate(e.target.value)} placeholder="e.g., 2021" required disabled={isLoading} />
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="category-donate">Category</Label>
                 <Select value={category} onValueChange={setCategory} disabled={isLoading}>
                    <SelectTrigger id="category-donate">
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                        {bookCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
                <Label htmlFor="coverImageUrl-donate">Cover Image URL (Optional)</Label>
                <Input id="coverImageUrl-donate" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://example.com/cover.jpg" disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description-donate">Description / Condition Notes</Label>
              <Textarea id="description-donate" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the book and its condition." rows={3} required disabled={isLoading} />
            </div>
             <CardFooter className="p-0 pt-4">
                <Button type="submit" className="w-full text-base" disabled={isLoading || !currentUser}>
                {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <Gift className="mr-2 h-5 w-5" />
                )}
                Submit Donation Request
                </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
       <div className="mt-8 text-center">
          <Image 
            src="https://placehold.co/400x250.png" 
            alt="Books donation illustration"
            data-ai-hint="books donation"
            width={400} 
            height={250} 
            className="rounded-lg shadow-md mx-auto"
          />
          <p className="text-muted-foreground mt-4 text-sm">
            Your contributions help enrich our library and support fellow students and faculty.
          </p>
        </div>
    </div>
  );
}

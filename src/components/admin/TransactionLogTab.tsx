
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Transaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase.ts';
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { History, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const getTransactionTypeVariant = (type: Transaction['type']) => {
  switch (type) {
    case 'issue': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'issue_request': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'issue_reject': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'return': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'return_request': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300';
    case 'return_reject': return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
    case 'renewal': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'donate_request': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'donate_approve': return 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300';
    case 'donate_reject': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
};

export function TransactionLogTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    if (!db) {
      toast({ title: "Error", description: "Firestore is not initialized.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const transactionsCollection = collection(db, "transactions");
      const q = query(transactionsCollection, orderBy("timestamp", "desc"), limit(100)); // Get latest 100 transactions
      const transactionsSnapshot = await getDocs(q);
      const transactionsList = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(transactionsList);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      toast({ 
        title: "Error Fetching Transactions", 
        description: error.message || "Could not load transactions from the database.", 
        variant: "destructive" 
      });
      if (error.code === 'failed-precondition') {
        toast({
          title: "Index Required",
          description: "The query for transactions requires an index. Please deploy Firestore indexes.",
          variant: "destructive",
          duration: 10000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {['Date', 'User', 'Book Title', 'Type', 'Due Date'].map(i => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5].map(j => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  
  if (!isLoading && transactions.length === 0) {
     return (
      <div className="text-center py-12">
        <History className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">No Transactions Found</h3>
        <p className="text-muted-foreground">There are no transaction records in the system yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Transaction History</h2>
        {/* Add filters or search here in the future */}
      </div>
      <div className="rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Book Title</TableHead>
              <TableHead className="w-[180px]">Type</TableHead>
              <TableHead className="w-[120px]">Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const timestamp = transaction.timestamp?.toDate ? format(transaction.timestamp.toDate(), "PPpp") : 'Processing...';
              return (
                <TableRow key={transaction.id}>
                  <TableCell>{timestamp}</TableCell>
                  <TableCell>{transaction.userName || 'N/A'}</TableCell>
                  <TableCell className="font-medium">{transaction.bookTitle || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${getTransactionTypeVariant(transaction.type)}`}>
                      {transaction.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.type === 'issue' || transaction.type === 'renewal' ? 
                      (transaction.dueDate ? format(new Date(transaction.dueDate), "P") : 'N/A') 
                      : 'N/A'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

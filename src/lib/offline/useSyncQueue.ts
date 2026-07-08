"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { peekSyncQueue, removeFromSyncQueue } from "./db";
import { toast } from "sonner";
import { logActivityAction, saveWorkoutSessionAction } from "@/app/actions";
import { useRouter } from "next/navigation";

export function useSyncQueue() {
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const router = useRouter();

  const syncQueue = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return;
    
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const queue = await peekSyncQueue();
      if (queue.length === 0) {
        isSyncingRef.current = false;
        setIsSyncing(false);
        return;
      }

      toast.info(`Syncing ${queue.length} offline actions...`);
      let successCount = 0;

      for (const item of queue) {
        try {
          // Add offlineId to payload to ensure backend idempotency
          if (item.actionName === "logActivity") {
            const formData = new FormData();
            for (const [key, value] of Object.entries(item.payload)) {
              formData.append(key, value as string);
            }
            formData.append("offlineId", item.id);
            await logActivityAction(formData);
          } else if (item.actionName === "saveWorkoutSession") {
            const payload = { ...item.payload, offlineId: item.id };
            await saveWorkoutSessionAction(payload);
          } else {
            console.warn("Unknown action in sync queue:", item.actionName);
          }
          
          await removeFromSyncQueue(item.id);
          successCount++;
        } catch (error) {
          console.error("Failed to sync item", item, error);
          // Stop syncing if one fails due to server error (so we don't drop it or cause subsequent ones to fail contextually)
          break; 
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully synced ${successCount} actions! XP and Levels updated.`);
        router.refresh();
      }

    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    const handleOnline = () => {
      console.log("Back online! Triggering sync queue...");
      syncQueue();
    };

    window.addEventListener("online", handleOnline);
    // Try to sync on mount if online
    if (navigator.onLine) {
      syncQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [syncQueue]);



  return { isSyncing, syncQueue };
}

"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { disconnectSocialAccount, syncSocialAccountNow } from "@/features/social/actions";

export function SyncNowButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await syncSocialAccountNow(accountId);
          if (!result.ok) toast.error(result.error.message);
          else
            toast.success(`Synced ${result.data.posts} ${result.data.posts === 1 ? "post" : "posts"} from Instagram`);
          router.refresh();
        })
      }
    >
      <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden="true" />
      {pending ? "Syncing…" : "Sync now"}
    </Button>
  );
}

export function DisconnectButton({ accountId, handle }: { accountId: string; handle: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" disabled={pending}>
          Disconnect
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect @{handle}?</AlertDialogTitle>
          <AlertDialogDescription>
            The OS forgets its access and stops syncing. Figures already synced stay. To remove the app from Instagram
            too, open Instagram → Settings → Apps and websites.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep connected</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() =>
              startTransition(async () => {
                const result = await disconnectSocialAccount(accountId);
                if (!result.ok) toast.error(result.error.message);
                else toast.success("Instagram disconnected");
                router.refresh();
              })
            }
          >
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

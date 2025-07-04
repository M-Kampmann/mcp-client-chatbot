"use client";

import { SidebarGroupLabel, SidebarMenuSub } from "ui/sidebar";
import Link from "next/link";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuSkeleton,
  SidebarMenuSubItem,
} from "ui/sidebar";
import { SidebarGroupContent, SidebarMenu, SidebarMenuItem } from "ui/sidebar";
import { SidebarGroup } from "ui/sidebar";
import { ThreadDropdown } from "../thread-dropdown";
import { MoreHorizontal, Trash } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { appStore } from "@/app/store";
import { Button } from "ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import {
  deleteThreadsAction,
  selectThreadListByUserIdAction,
} from "@/app/api/chat/actions";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { handleErrorWithToast } from "ui/shared-toast";
import { useEffect, useMemo } from "react";
import { authClient } from "auth/client";
import { useTranslations } from "next-intl";

type ThreadGroup = {
  label: string;
  threads: any[];
};

export function AppSidebarThreads() {
  const mounted = useMounted();
  const router = useRouter();
  const t = useTranslations("Layout");
  const [storeMutate, currentThreadId] = appStore(
    useShallow((state) => [state.mutate, state.currentThreadId]),
  );

  const {
    data: threadList,
    isLoading,
    error,
  } = useSWR("threads", selectThreadListByUserIdAction, {
    onError: handleErrorWithToast,
    fallbackData: [],
    onSuccess: (data) => storeMutate({ threadList: data }),
  });

  const threadGroupByDate = useMemo(() => {
    if (!threadList || threadList.length === 0) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: ThreadGroup[] = [
      { label: t("today"), threads: [] },
      { label: t("yesterday"), threads: [] },
      { label: t("lastWeek"), threads: [] },
      { label: t("older"), threads: [] },
    ];

    threadList.forEach((thread) => {
      const threadDate = new Date(thread.lastMessageAt);
      threadDate.setHours(0, 0, 0, 0);

      if (threadDate.getTime() === today.getTime()) {
        groups[0].threads.push(thread);
      } else if (threadDate.getTime() === yesterday.getTime()) {
        groups[1].threads.push(thread);
      } else if (threadDate.getTime() >= lastWeek.getTime()) {
        groups[2].threads.push(thread);
      } else {
        groups[3].threads.push(thread);
      }
    });

    // Filter out empty groups
    return groups.filter((group) => group.threads.length > 0);
  }, [threadList, t]);

  const handleDeleteAllThreads = async () => {
    await toast.promise(deleteThreadsAction(), {
      loading: t("deletingAllChats"),
      success: () => {
        mutate("threads");
        router.push("/");
        return t("allChatsDeleted");
      },
      error: t("failedToDeleteAllChats"),
    });
  };

  useEffect(() => {
    if (error) {
      authClient.signOut().finally(() => {
        window.location.reload();
      });
    }
  }, [error]);

  if (isLoading || threadList?.length === 0)
    return (
      <SidebarGroup>
        <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/threads">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarGroupLabel className="">
                <h4 className="text-xs text-muted-foreground">
                  {t("recentChats")}
                </h4>
                <div className="flex-1" />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover/threads:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleDeleteAllThreads}
                    >
                      <Trash />
                      {t("deleteAllChats")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarGroupLabel>

              {isLoading ? (
                Array.from({ length: 12 }).map(
                  (_, index) => mounted && <SidebarMenuSkeleton key={index} />,
                )
              ) : (
                <div className="px-2 py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("noConversationsYet")}
                  </p>
                </div>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );

  return threadGroupByDate.map((group, index) => {
    const isFirst = index === 0;
    return (
      <SidebarGroup key={group.label}>
        <SidebarGroupContent className="group-data-[collapsible=icon]:hidden group/threads">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarGroupLabel className="">
                <h4 className="text-xs text-muted-foreground">{group.label}</h4>
                <div className="flex-1" />
                {isFirst && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover/threads:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={handleDeleteAllThreads}
                      >
                        <Trash />
                        {t("deleteAllChats")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </SidebarGroupLabel>

              {group.threads.map((thread) => (
                <SidebarMenuSub key={thread.id} className={"group/thread mr-0"}>
                  <SidebarMenuSubItem>
                    <SidebarMenuButton
                      asChild
                      isActive={currentThreadId === thread.id}
                    >
                      <Link
                        href={`/chat/${thread.id}`}
                        className="flex items-center"
                      >
                        <p className="truncate ">{thread.title}</p>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuAction className="opacity-0 group-hover/thread:opacity-100">
                      <ThreadDropdown
                        side="right"
                        threadId={thread.id}
                        beforeTitle={thread.title}
                      >
                        <MoreHorizontal />
                      </ThreadDropdown>
                    </SidebarMenuAction>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              ))}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  });
}

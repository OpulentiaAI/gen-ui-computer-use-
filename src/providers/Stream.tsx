"use client";

import { v4 as uuidv4 } from "uuid";
import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message } from "@langchain/langgraph-sdk";
import {
  uiMessageReducer,
  type UIMessage,
  type RemoveUIMessage,
} from "@langchain/langgraph-sdk/react-ui";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useThreads } from "./Thread";
import { getItem, setItem, USER_ID_KEY } from "@/lib/local-storage";
import { createClient } from "./client";

export type StateType = {
  messages: Message[];
  ui?: UIMessage[];
  streamUrl?: string;
  instanceId?: string;
  environment?: string;
};

const useTypedStream = useStream<
  StateType,
  {
    UpdateType: {
      messages?: Message[] | Message | string;
      ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
      streamUrl?: string;
      instanceId?: string;
      environment?: string;
    };
    CustomEventType: UIMessage | RemoveUIMessage;
  }
>;

type StreamContextType = ReturnType<typeof useTypedStream>;
const StreamContext = createContext<StreamContextType | undefined>(undefined);

async function sleep(ms = 4000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const StreamSession = ({
  children,
  apiUrl,
  assistantId,
}: {
  children: ReactNode;
  apiUrl: string;
  assistantId: string;
}) => {
  const [threadId, setThreadId] = useQueryState("threadId");
  const client = createClient(apiUrl);
  const { getThreads, setThreads } = useThreads();
  const [userId, setUserId] = useState<string>();
  const [_isShowingInstanceFrame, setIsShowingInstanceFrame] = useQueryState(
    "isShowingInstanceFrame",
    parseAsBoolean,
  );
  const streamValue = useTypedStream({
    apiUrl,
    assistantId,
    threadId: threadId ?? null,
    onCustomEvent: (event, options) => {
      options.mutate((prev) => {
        const ui = uiMessageReducer(prev.ui ?? [], event);
        return { ...prev, ui };
      });
    },
    onThreadId: (id) => {
      setThreadId(id);
      setIsShowingInstanceFrame(null);
      // Refetch threads list when thread ID changes.
      // Wait for some seconds before fetching so we're able to get the new thread that was created.
      if (userId) {
        client.threads
          .update(id, {
            metadata: {
              user_id: userId,
            },
          })
          .then(() => {
            // After updating, re-fetch threads so the title is up to date.
            sleep().then(() =>
              getThreads(userId).then(setThreads).catch(console.error),
            );
          })
          .catch(console.error);
      }
    },
  });

  useEffect(() => {
    if (typeof window === "undefined" || userId) return;
    const storedUserId = getItem(USER_ID_KEY);
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = uuidv4();
      setUserId(newUserId);
      setItem(USER_ID_KEY, newUserId);
    }
  }, []);

  return (
    <StreamContext.Provider value={streamValue}>
      {children}
    </StreamContext.Provider>
  );
};

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";
  const assistantId = "agent";

  return (
    <StreamSession apiUrl={apiUrl} assistantId={assistantId}>
      {children}
    </StreamSession>
  );
};

// Create a custom hook to use the context
export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};

export default StreamContext;

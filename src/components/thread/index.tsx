"use client";
import * as nuqs from "nuqs";
import * as nuqsAdapters from "nuqs/adapters/next/app";

import { v4 as uuidv4 } from "uuid";
import { ReactNode, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { useState, FormEvent } from "react";
import { Button } from "../ui/button";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import { DO_NOT_RENDER_ID_PREFIX } from "@/lib/constants";
import { LangGraphLogoSVG } from "../icons/langgraph";
import { TooltipIconButton } from "./tooltip-icon-button";
import {
  ArrowDown,
  LoaderCircle,
  PanelRightOpen,
  PanelRightClose,
  SquarePen,
} from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import ThreadHistory from "./history";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  experimental_loadShare,
  LoadExternalComponent,
} from "@langchain/langgraph-sdk/react-ui";
import * as Toaster from "@/components/ui/sonner";
import * as sonner from "sonner";

experimental_loadShare("nuqs", nuqs);
experimental_loadShare("nuqs/adapters/next/app", nuqsAdapters);
experimental_loadShare("@/components/ui/sonner", Toaster);
experimental_loadShare("sonner", sonner);

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={props.className}
    >
      <div ref={context.contentRef} className={props.contentClassName}>
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={props.className}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="w-4 h-4" />
      <span>Scroll to bottom</span>
    </Button>
  );
}

interface ChatViewProps {
  chatStarted: boolean;
  isShowingInstance: boolean;
  firstTokenReceived: boolean;
  handleSubmit: (e: FormEvent) => void;
  input: string;
  setInput: (input: string) => void;
  handleRegenerate: (parentCheckpoint: Checkpoint | null | undefined) => void;
}

function ChatView({
  chatStarted,
  isShowingInstance,
  firstTokenReceived,
  handleSubmit,
  input,
  setInput,
  handleRegenerate,
}: ChatViewProps) {
  const stream = useStreamContext();
  const { scrollToBottom, isAtBottom } = useStickToBottomContext();

  // Ensure we scroll after submitting and when new content is appended
  const handleFormSubmit = (e: FormEvent) => {
    handleSubmit(e);
    // Defer to after DOM updates
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  };

  // If we're already at the bottom, keep following when messages update
  useEffect(() => {
    if (isAtBottom) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [stream.messages.length, isAtBottom, scrollToBottom]);

  // When loading starts (and before first token), make sure the typing bubble stays in view
  useEffect(() => {
    if (stream.isLoading && !firstTokenReceived) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [stream.isLoading, firstTokenReceived, scrollToBottom]);

  return (
    <StickToBottom
      className={cn(
        "relative overflow-hidden",
        chatStarted && isShowingInstance ? "flex-1" : "flex-1",
      )}
    >
      <StickyToBottomContent
        className={cn(
          "absolute inset-0 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent",
          !chatStarted && "flex flex-col items-stretch mt-[25vh]",
          chatStarted && "grid grid-rows-[1fr_auto]",
        )}
        contentClassName={cn(
          "flex flex-col md:max-w-3xl w-full pt-8 pb-16 mx-auto gap-4",
          chatStarted && "px-5",
        )}
        content={
          <>
            {stream.messages
              .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
              .map((message, index) =>
                message.type === "human" ? (
                  <HumanMessage
                    key={message.id || `${message.type}-${index}`}
                    message={message}
                    isLoading={stream.isLoading}
                  />
                ) : (
                  <AssistantMessage
                    key={message.id || `${message.type}-${index}`}
                    message={message}
                    isLoading={stream.isLoading}
                    handleRegenerate={handleRegenerate}
                  />
                ),
              )}
            {stream.isLoading && !firstTokenReceived && (
              <AssistantMessageLoading />
            )}
          </>
        }
        footer={
          <div className="sticky flex flex-col items-center gap-8 bottom-0 px-4 bg-white">
            {!chatStarted && (
              <div className="flex gap-3 items-center">
                <LangGraphLogoSVG className="flex-shrink-0 h-8" />
                <h1 className="text-2xl font-semibold tracking-tight">
                  Generative UI Computer Use
                </h1>
              </div>
            )}

            <ScrollToBottom className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 animate-in fade-in-0 zoom-in-95" />

            <div className="bg-muted rounded-2xl border shadow-xs mx-auto mb-8 w-full max-w-3xl relative z-10">
              <form
                onSubmit={handleFormSubmit}
                className="grid grid-rows-[1fr_auto] gap-2 max-w-3xl mx-auto"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
                      e.preventDefault();
                      const el = e.target as HTMLElement | undefined;
                      const form = el?.closest("form");
                      form?.requestSubmit();
                    }
                  }}
                  placeholder="Type your message..."
                  className="p-3.5 pb-0 border-none bg-transparent field-sizing-content shadow-none ring-0 outline-none focus:outline-none focus:ring-0 resize-none"
                />

                <div className="flex items-center justify-end p-2 pt-4">
                  {stream.isLoading ? (
                    <Button key="stop" onClick={() => stream.stop()}>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="transition-all shadow-md"
                      disabled={stream.isLoading || !input.trim()}
                    >
                      Send
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        }
      />
    </StickToBottom>
  );
}

export function Thread() {
  const { toast } = sonner;
  const [threadId, setThreadId] = useQueryState("threadId");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );
  const [input, setInput] = useState("");
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const [isShowingInstanceFrame, setIsShowingInstanceFrame] = useQueryState(
    "isShowingInstanceFrame",
    parseAsBoolean,
  );
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;

  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as any).message;
      if (!message || lastError.current === message) {
        // Message has already been logged. do not modify ref, return early.
        return;
      }

      // Message is defined, and it has not been logged yet. Save it, and send the error
      lastError.current = message;
      toast.error("An error occurred. Please try again.", {
        description: (
          <p>
            <strong>Error:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch {
      // no-op
    }
  }, [stream.error]);

  // TODO: this should be part of the useStream hook
  const prevMessageLength = useRef(0);
  useEffect(() => {
    if (
      messages.length !== prevMessageLength.current &&
      messages?.length &&
      messages[messages.length - 1].type === "ai"
    ) {
      setFirstTokenReceived(true);
    }

    prevMessageLength.current = messages.length;
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setFirstTokenReceived(false);

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: input,
    };

    stream.submit(
      { messages: [newHumanMessage] },
      {
        streamMode: ["values"],
        config: {
          recursion_limit: 150,
          configurable: {
            timeoutHours: 0.1,
          },
        },
        optimisticValues: (prev) => ({
          ...prev,
          messages: [...(prev.messages ?? []), newHumanMessage],
        }),
      },
    );

    setInput("");
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    // Do this so the loading state is correct
    prevMessageLength.current = prevMessageLength.current - 1;
    setFirstTokenReceived(false);
    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
    });
  };

  const chatStarted = !!threadId || !!messages.length;

  const newThread = () => {
    setThreadId(null);
    setIsShowingInstanceFrame(null);
  };

  const customInstanceViewComponent = stream.values.ui?.find(
    (ui) => ui.name === "instance",
  );
  const isShowingInstance = !!(
    isShowingInstanceFrame && customInstanceViewComponent
  );

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <div className="relative lg:flex hidden">
        <motion.div
          className="absolute h-full border-r bg-white overflow-hidden z-20"
          style={{ width: 300 }}
          animate={
            isLargeScreen
              ? { x: chatHistoryOpen ? 0 : -300 }
              : { x: chatHistoryOpen ? 0 : -300 }
          }
          initial={{ x: -300 }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          <div className="relative h-full" style={{ width: 300 }}>
            <ThreadHistory />
          </div>
        </motion.div>
      </div>
      <motion.div
        className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden relative",
          !chatStarted && "grid-rows-[1fr]",
        )}
        layout={isLargeScreen}
        animate={{
          marginLeft: chatHistoryOpen ? (isLargeScreen ? 300 : 0) : 0,
          width: chatHistoryOpen
            ? isLargeScreen
              ? "calc(100% - 300px)"
              : "100%"
            : "100%",
        }}
        transition={
          isLargeScreen
            ? { type: "spring", stiffness: 300, damping: 30 }
            : { duration: 0 }
        }
      >
        {!chatStarted && (
          <div className="absolute top-0 left-0 w-full flex items-center justify-between gap-3 p-2 pl-4 z-10">
            {(!chatHistoryOpen || !isLargeScreen) && (
              <Button
                className="hover:bg-gray-100"
                variant="ghost"
                onClick={() => setChatHistoryOpen((p) => !p)}
              >
                {chatHistoryOpen ? (
                  <PanelRightOpen className="size-5" />
                ) : (
                  <PanelRightClose className="size-5" />
                )}
              </Button>
            )}
          </div>
        )}
        {chatStarted && (
          <div className="flex items-center justify-between gap-3 p-2 pl-4 z-10 relative">
            <div className="flex items-center justify-start gap-2 relative">
              <div className="absolute left-0 z-10">
                {(!chatHistoryOpen || !isLargeScreen) && (
                  <Button
                    className="hover:bg-gray-100"
                    variant="ghost"
                    onClick={() => setChatHistoryOpen((p) => !p)}
                  >
                    {chatHistoryOpen ? (
                      <PanelRightOpen className="size-5" />
                    ) : (
                      <PanelRightClose className="size-5" />
                    )}
                  </Button>
                )}
              </div>
              <motion.button
                className="flex gap-2 items-center cursor-pointer"
                onClick={() => newThread()}
                animate={{
                  marginLeft: !chatHistoryOpen ? 48 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              >
                <LangGraphLogoSVG width={32} height={32} />
                <span className="text-xl font-semibold tracking-tight">
                  Generative UI Computer Use
                </span>
              </motion.button>
            </div>

            <TooltipIconButton
              size="lg"
              className="p-4"
              tooltip="New thread"
              variant="ghost"
              onClick={() => newThread()}
            >
              <SquarePen className="size-5" />
            </TooltipIconButton>

            <div className="absolute inset-x-0 top-full h-5 bg-gradient-to-b from-background to-background/0" />
          </div>
        )}

        <div
          className={cn(
            "flex items-center justify-center my-4 lg:hidden",
            !chatStarted && "hidden",
          )}
        >
          <motion.div
            className="relative flex items-center p-1 rounded-lg bg-gray-200 shadow-inner border-[1px] border-slate-300"
            style={{ width: "280px" }} // Fixed width to make it a bit wider
          >
            <motion.div
              className="absolute inset-1 rounded-md shadow-sm z-0 bg-white h-[36px]"
              animate={{
                x: isShowingInstance ? "95%" : "0%",
              }}
              style={{ width: "50%" }} // Fixed width at 50%
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              layout
            />
            <Button
              variant="ghost"
              className={cn(
                "relative z-10 transition-colors flex-1 justify-center",
                !isShowingInstance ? "text-black" : "text-muted-foreground",
              )}
              onClick={() => setIsShowingInstanceFrame(false)}
              style={{ width: "50%" }} // Fixed width at 50%
            >
              Chat
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "relative z-10 transition-colors flex-1 justify-center",
                isShowingInstance ? "text-black" : "text-muted-foreground",
              )}
              onClick={() => setIsShowingInstanceFrame(true)}
              style={{ width: "50%" }} // Fixed width at 50%
            >
              Computer
            </Button>
          </motion.div>
        </div>

        {/* Create a flex row container when both chatStarted and streamUrl are truthy */}
        <div
          className={cn(
            "flex flex-1 overflow-hidden",
            chatStarted && isShowingInstance ? "flex-row" : "flex-col",
            isShowingInstance && "lg:flex hidden",
          )}
        >
          <ChatView
            chatStarted={chatStarted}
            isShowingInstance={isShowingInstance}
            firstTokenReceived={firstTokenReceived}
            handleSubmit={handleSubmit}
            input={input}
            setInput={setInput}
            handleRegenerate={handleRegenerate}
          />

          {/* Render InstanceFrame inside the flex container when conditions are met */}
          {chatStarted && customInstanceViewComponent && (
            <div
              className={cn(
                "overflow-hidden flex-1 my-auto",
                !isShowingInstance && "hidden",
              )}
            >
              <LoadExternalComponent
                key={customInstanceViewComponent?.id}
                stream={stream}
                message={customInstanceViewComponent}
                meta={{ ui: customInstanceViewComponent }}
              />
            </div>
          )}
        </div>
        {chatStarted && isShowingInstance && (
          <div className={cn("overflow-hidden lg:hidden mx-auto my-auto")}>
            <LoadExternalComponent
              key={customInstanceViewComponent?.id}
              stream={stream}
              message={customInstanceViewComponent}
              meta={{ ui: customInstanceViewComponent }}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}

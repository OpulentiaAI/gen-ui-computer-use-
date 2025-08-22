"use client";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstanceActions } from "./useInstanceActions";
import { InstanceView } from "./instance-view";
import { useStreamContext } from "@langchain/langgraph-sdk/react-ui";
import { useQueryState, parseAsBoolean } from "nuqs";

interface InstanceFrameProps {
  streamUrl: string;
  instanceId: string;
}

export function InstanceFrame({ streamUrl, instanceId }: InstanceFrameProps) {
  const [isShowingInstanceFrame, setIsShowingInstanceFrame] = useQueryState(
    "isShowingInstanceFrame",
    parseAsBoolean,
  );
  const [_threadId, setThreadId] = useQueryState("threadId");
  const stream = useStreamContext();
  const {
    handleStop,
    handlePause,
    handleResume,
    handleExpand,
    isStopping,
    setIsStopped,
    isStopped,
    setStatus,
    status,
    setScreenshot,
    screenshot,
    setIsScreenshotHovered,
    isScreenshotHovered,
    setIsLoading,
    isLoading,
    isExpanded,
  } = useInstanceActions({ instanceId });

  const isCheckingStatus = useRef(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !instanceId ||
      !stream.messages?.length ||
      !isShowingInstanceFrame
    ) {
      return;
    }

    const findAndSetScreenshot = () => {
      const lastScreenshot = stream.messages.findLast(
        (m) =>
          m.type === "tool" &&
          m.additional_kwargs?.type === "computer_call_output",
      );
      if (lastScreenshot) {
        setScreenshot(lastScreenshot.content as string);
      }
    };

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/instance/status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ instanceId }),
        });
        const data = await response.json();
        if (["terminated", "paused", "running"].includes(data.status)) {
          setStatus(data.status);
        }

        if (data.status === "terminated") {
          setIsStopped(true);
        }

        if (["paused", "terminated"].includes(data.status)) {
          findAndSetScreenshot();
        }
      } catch (error) {
        console.error("Failed to check instance status:", error);
      }
    };

    if (status === "unknown" && !isCheckingStatus.current) {
      isCheckingStatus.current = true;
      checkStatus().finally(() => setIsLoading(false));
    }

    if (["paused", "terminated"].includes(status)) {
      findAndSetScreenshot();
      setIsLoading(false);
    }
  }, [instanceId, status, stream.messages, isShowingInstanceFrame]);

  useEffect(() => {
    if (isShowingInstanceFrame) return;
    // Set to true on the first page load.
    setIsShowingInstanceFrame(true);
  }, []);

  if (!isShowingInstanceFrame) {
    return null;
  }

  if (isLoading) {
    return (
      <InstanceView
        handleStop={handleStop}
        handlePause={handlePause}
        handleExpand={handleExpand}
        isStopping={isStopping}
        isStopped={isStopped}
        allDisabled={false}
        isExpanded={isExpanded}
      >
        <div className="w-[630px] h-[420px] lg:w-[830px] lg:h-[620px] flex items-center justify-center p-4 my-auto">
          <LoaderCircle className="w-8 h-8 animate-spin" />
        </div>
      </InstanceView>
    );
  }

  if (status === "terminated" && screenshot) {
    return (
      <InstanceView
        handleStop={handleStop}
        handlePause={handlePause}
        handleExpand={handleExpand}
        isStopping={isStopping}
        isStopped={isStopped}
        allDisabled={true}
        isExpanded={isExpanded}
      >
        <img
          src={screenshot}
          alt="Terminated instance screenshot"
          className="w-full object-contain opacity-70"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
          <div className="bg-card/90 p-6 rounded-lg shadow-lg text-center max-w-xs">
            <h3 className="text-lg font-semibold mb-2">Instance Terminated</h3>
            <p className="text-muted-foreground text-sm mb-4">
              All progress has been lost.
            </p>
            <Button
              onClick={() => {
                setIsShowingInstanceFrame(null);
                setScreenshot(undefined);
                setStatus("unknown");
                setThreadId(null);
              }}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-all duration-200 ease-in-out w-full"
            >
              Create New Chat
            </Button>
          </div>
        </div>
      </InstanceView>
    );
  }

  if (status === "paused" && screenshot) {
    return (
      <InstanceView
        handleStop={handleStop}
        handlePause={handlePause}
        handleExpand={handleExpand}
        isStopping={isStopping}
        isStopped={isStopped}
        allDisabled={true}
        isExpanded={isExpanded}
      >
        <div
          onMouseEnter={() => setIsScreenshotHovered(true)}
          onMouseLeave={() => setIsScreenshotHovered(false)}
        >
          <img
            src={screenshot}
            alt="Paused instance screenshot"
            className="w-full object-contain"
          />
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out gap-3",
              isScreenshotHovered
                ? "bg-black/40 opacity-100"
                : "bg-black/0 opacity-0",
            )}
          >
            <Button onClick={handleStop} variant="destructive">
              Terminate
            </Button>
            <Button onClick={handleResume}>Resume</Button>
          </div>
        </div>
      </InstanceView>
    );
  }

  return (
    <InstanceView
      handleStop={handleStop}
      handlePause={handlePause}
      handleExpand={handleExpand}
      isStopping={isStopping}
      isStopped={isStopped}
      allDisabled={false}
      isExpanded={isExpanded}
    >
      {isStopping && <div className="absolute inset-0 bg-black/20 z-10" />}
      <iframe
        src={streamUrl}
        className={cn(
          "w-full h-full",
          isExpanded ? "aspect-[4/3]" : "min-h-[400px] md:min-h-[632px]",
        )}
        title="Instance Frame"
        allow="clipboard-write"
      />
    </InstanceView>
  );
}

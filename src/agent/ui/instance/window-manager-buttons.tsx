"use client";
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
import { cn } from "@/lib/utils";
import { Maximize, Minus, X } from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { useState } from "react";

function StopInstanceDialog({
  isHovered,
  isStopping,
  isStopped,
  onCancel,
  disabled,
}: {
  isHovered: boolean;
  isStopping: boolean;
  isStopped: boolean;
  onCancel: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (disabled) {
    return (
      <div className="w-[14px] h-[14px] rounded-full flex items-center justify-center relative bg-destructive/80" />
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <div
          className={cn(
            "w-[14px] h-[14px] rounded-full flex items-center justify-center relative",
            "bg-destructive/80",
            isStopping || isStopped ? "cursor-not-allowed" : "cursor-pointer",
          )}
          onClick={isStopping || isStopped ? undefined : () => setOpen(true)}
          role="button"
          aria-label="Stop instance"
        >
          {isHovered && (
            <X
              className={cn(
                "absolute text-black",
                "w-[10px] h-[10px]",
                isStopping || isStopped ? "opacity-50" : "opacity-100",
              )}
            />
          )}
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stop Instance</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to stop this instance? All progress will be
            lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-muted-foreground text-sm">
          You may pause the instance instead to save progress.
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onCancel}
            className="bg-destructive hover:bg-destructive/80 transition-colors duration-200 ease-in-out"
          >
            Stop
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface WindowManagerButtonsProps {
  onCancel: () => void;
  onMinimize: () => void;
  onExpand: () => void;
  isStopping: boolean;
  isStopped: boolean;
  allDisabled: boolean;
}

export function WindowManagerButtons({
  onCancel,
  onMinimize,
  onExpand,
  isStopping,
  isStopped,
  allDisabled,
}: WindowManagerButtonsProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [_isShowingInstanceFrame, setIsShowingInstanceFrame] = useQueryState(
    "isShowingInstanceFrame",
    parseAsBoolean,
  );

  return (
    <div
      className="flex space-x-1.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <StopInstanceDialog
        disabled={allDisabled}
        isHovered={isHovered}
        isStopping={isStopping}
        isStopped={isStopped}
        onCancel={onCancel}
      />
      <div
        className="w-[14px] h-[14px] rounded-full bg-yellow-500/80 flex items-center justify-center relative cursor-pointer"
        onClick={() => {
          if (allDisabled) {
            setIsShowingInstanceFrame(null);
            return;
          }
          if (isStopping || isStopped) {
            return;
          }
          onMinimize();
        }}
        role="button"
        aria-label="Minimize instance"
      >
        {isHovered && (
          <Minus
            className={cn(
              "absolute text-black w-[10px] h-[10px]",
              isStopping || isStopped ? "opacity-50" : "opacity-100",
            )}
          />
        )}
      </div>
      <div
        className="w-[14px] h-[14px] rounded-full bg-green-500/80 flex items-center justify-center relative cursor-pointer"
        onClick={onExpand}
        role="button"
        aria-label="Expand instance"
      >
        {isHovered && (
          <Maximize
            className={cn(
              "absolute text-black w-[10px] h-[10px]",
              isStopping || isStopped ? "opacity-50" : "opacity-100",
            )}
          />
        )}
      </div>
    </div>
  );
}

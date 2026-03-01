"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortlistButtonProps {
  condoId: number;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function ShortlistButton({ condoId, className, size = "default" }: ShortlistButtonProps) {
  const [isShortlisted, setIsShortlisted] = useState(false);

  useEffect(() => {
    const shortlist = JSON.parse(localStorage.getItem("shortlist") || "[]");
    setIsShortlisted(shortlist.includes(condoId));
  }, [condoId]);

  const toggleShortlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shortlist = JSON.parse(localStorage.getItem("shortlist") || "[]");
    let newShortlist: number[];
    
    if (shortlist.includes(condoId)) {
      newShortlist = shortlist.filter((id: number) => id !== condoId);
    } else {
      newShortlist = [...shortlist, condoId];
    }
    
    localStorage.setItem("shortlist", JSON.stringify(newShortlist));
    setIsShortlisted(!isShortlisted);
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent("shortlistUpdate", { detail: newShortlist }));
  };

  return (
    <Button
      variant={isShortlisted ? "default" : "outline"}
      size={size}
      onClick={toggleShortlist}
      className={cn(
        isShortlisted && "bg-red-500 hover:bg-red-600 border-red-500",
        className
      )}
    >
      <Heart className={cn("h-4 w-4", isShortlisted && "fill-current")} />
      {size !== "icon" && (
        <span className="ml-2">{isShortlisted ? "Shortlisted" : "Shortlist"}</span>
      )}
    </Button>
  );
}

export function useShortlist() {
  const [shortlist, setShortlist] = useState<number[]>([]);

  useEffect(() => {
    const loadShortlist = () => {
      const stored = JSON.parse(localStorage.getItem("shortlist") || "[]");
      setShortlist(stored);
    };

    loadShortlist();

    const handleUpdate = (e: CustomEvent<number[]>) => {
      setShortlist(e.detail);
    };

    window.addEventListener("shortlistUpdate", handleUpdate as EventListener);
    return () => {
      window.removeEventListener("shortlistUpdate", handleUpdate as EventListener);
    };
  }, []);

  return shortlist;
}

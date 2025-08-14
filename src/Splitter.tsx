import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";

interface SplitterProps {
  children: React.ReactNode[];
  direction?: "horizontal" | "vertical";
  initialSplit?: number; // percentage (0-100)
  className?: string;
}

export const Splitter: React.FC<SplitterProps> = ({
  children,
  direction = "horizontal",
  initialSplit = 50,
  className = "",
}) => {
  const [splitPercentage, setSplitPercentage] = useState(initialSplit);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      let percentage: number;
      if (direction === "horizontal") {
        percentage = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        percentage = ((e.clientY - rect.top) / rect.height) * 100;
      }

      // Clamp between 10% and 90%
      percentage = Math.max(10, Math.min(90, percentage));
      setSplitPercentage(percentage);
    },
    [isDragging, direction],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setSplitPercentage(initialSplit);
  }, [initialSplit]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor =
        direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  // Filter out falsy children (null, undefined, false, etc.)
  const validChildren = React.Children.toArray(children).filter(Boolean);

  // If only one child, render it directly
  if (validChildren.length === 1) {
    return <div className={className}>{validChildren[0]}</div>;
  }

  // If no children or more than 2, render children in a simple container
  if (validChildren.length !== 2) {
    return <div className={className}>{validChildren}</div>;
  }

  const [firstChild, secondChild] = validChildren;

  const isHorizontal = direction === "horizontal";
  const firstPanelStyle = {
    [isHorizontal ? "width" : "height"]: `${splitPercentage}%`,
  };
  const secondPanelStyle = {
    [isHorizontal ? "width" : "height"]: `${100 - splitPercentage}%`,
  };

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? "flex-row" : "flex-col"} h-full w-full ${className}`}
    >
      {/* First Panel */}
      <div style={firstPanelStyle} className="overflow-hidden">
        {firstChild}
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className={`
          ${isHorizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize"}
          bg-gray-300 hover:bg-blue-400 transition-all duration-150 flex-shrink-0
          ${isDragging ? (isHorizontal ? "w-2 bg-blue-500" : "h-2 bg-blue-500") : ""}
        `}
      />

      {/* Second Panel */}
      <div style={secondPanelStyle} className="overflow-hidden">
        {secondChild}
      </div>
    </div>
  );
};

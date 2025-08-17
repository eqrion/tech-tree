import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import type { TechTree, TechNode, TechNodeId } from "./TechTree.js";
import mermaid from "mermaid";

function mermaidGraph(tree: TechTree, topDown: boolean): string {
  let mermaid = `graph ${topDown ? "TD" : "LR"}\n`;

  // Check if any nodes have external dependencies
  const nodeIds = new Set(tree.nodes.map((node) => node.id));

  // Add nodes with their titles as labels and click events
  for (const node of tree.nodes) {
    const sanitizedId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const sanitizedTitle = node.title.replace(/"/g, "&quot;");
    mermaid += `    ${sanitizedId}["${sanitizedTitle}"]\n`;
    mermaid += `    click ${sanitizedId} handleNodeClick\n`;
  }

  // Add dependencies as edges
  for (const node of tree.nodes) {
    const sanitizedNodeId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
    for (const dep of node.dependsOn) {
      const sanitizedDepId = dep.replace(/[^a-zA-Z0-9_]/g, "_");
      mermaid += `    ${sanitizedNodeId} --> ${sanitizedDepId}\n`;
    }
  }

  // Style nodes with external dependents differently
  for (const node of tree.nodes) {
    if (
      node.dependedOnBy &&
      node.dependedOnBy.some((depId) => !nodeIds.has(depId))
    ) {
      const sanitizedId = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
      mermaid += `    style ${sanitizedId} fill:#e0f2fe,stroke:#0277bd,stroke-width:3px,stroke-dasharray: 5 5\n`;
    }
  }

  return mermaid;
}

interface GraphProps {
  tree: TechTree;
  selectedNodeId: TechNodeId | null;
  onNodeSelect: (nodeId: TechNodeId | null) => void;
}

export function Graph(props: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [topDown, setTopDown] = useState(false);
  const [graphId] = useState(
    () => `graph-${Math.random().toString(36).substr(2, 9)}`,
  );
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
      },
    });
  }, []);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      // Convert sanitized ID back to original ID
      const originalNodeId = nodeId.replace(/_/g, "-");
      const node = props.tree.nodes.find(
        (n) =>
          n.id === originalNodeId ||
          n.id.replace(/[^a-zA-Z0-9_]/g, "_") === nodeId,
      );
      if (node) {
        props.onNodeSelect(node.id);
      }
    },
    [props.tree, props.onNodeSelect],
  );

  // Function to highlight the selected node
  const highlightSelectedNode = useCallback(() => {
    if (!containerRef.current || !props.selectedNodeId) return;

    const selectedNode = props.tree.nodes.find(
      (n) => n.id === props.selectedNodeId,
    );
    if (!selectedNode) return;

    const sanitizedSelectedId = selectedNode.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const nodes = containerRef.current.querySelectorAll('[id^="flowchart-"]');

    nodes.forEach((node: Element) => {
      if (node instanceof SVGElement) {
        const nodeId = node.id.replace("flowchart-", "").replace(/-\d+$/, "");
        const rect = node.querySelector("rect");

        if (rect) {
          if (nodeId === sanitizedSelectedId) {
            // Highlight selected node
            rect.style.fill = "#fef3c7"; // yellow background
            rect.style.stroke = "#f59e0b"; // orange border
            rect.style.strokeWidth = "3px";
            rect.style.filter = "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))";
          } else {
            // Reset other nodes to default
            rect.style.fill = "";
            rect.style.stroke = "";
            rect.style.strokeWidth = "";
            rect.style.filter = "";
          }
        }
      }
    });
  }, [props.selectedNodeId, props.tree]);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderGraph = async () => {
      try {
        const mermaidSyntax = mermaidGraph(props.tree, topDown);
        const { svg } = await mermaid.render(graphId, mermaidSyntax);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;

          // Add click handlers and hover styles to all nodes
          const nodes =
            containerRef.current.querySelectorAll('[id^="flowchart-"]');
          nodes.forEach((node: Element) => {
            if (node instanceof SVGElement) {
              const nodeId = node.id
                .replace("flowchart-", "")
                .replace(/-\d+$/, "");
              node.style.cursor = "pointer";
              node.style.transition = "all 0.2s ease";

              // Add hover effects
              node.addEventListener("mouseenter", () => {
                const rect = node.querySelector("rect");
                if (
                  rect &&
                  (!props.selectedNodeId ||
                    !props.tree.nodes
                      .find((n) => n.id === props.selectedNodeId)
                      ?.id.replace(/[^a-zA-Z0-9_]/g, "_") ||
                    props.tree.nodes
                      .find((n) => n.id === props.selectedNodeId)
                      ?.id.replace(/[^a-zA-Z0-9_]/g, "_") !== nodeId)
                ) {
                  rect.style.fill = "#dbeafe"; // light blue
                  rect.style.stroke = "#3b82f6"; // blue border
                  rect.style.strokeWidth = "2px";
                }
              });

              node.addEventListener("mouseleave", () => {
                const rect = node.querySelector("rect");
                if (
                  rect &&
                  (!props.selectedNodeId ||
                    !props.tree.nodes
                      .find((n) => n.id === props.selectedNodeId)
                      ?.id.replace(/[^a-zA-Z0-9_]/g, "_") ||
                    props.tree.nodes
                      .find((n) => n.id === props.selectedNodeId)
                      ?.id.replace(/[^a-zA-Z0-9_]/g, "_") !== nodeId)
                ) {
                  rect.style.fill = ""; // reset to default
                  rect.style.stroke = ""; // reset to default
                  rect.style.strokeWidth = ""; // reset to default
                }
              });

              node.addEventListener("click", () => handleNodeClick(nodeId));
            }
          });

          // Apply highlighting after rendering
          highlightSelectedNode();
        }
      } catch (error) {
        console.error("Error rendering Mermaid graph:", error);
        if (containerRef.current) {
          containerRef.current.innerHTML =
            '<div class="text-red-500 p-4">Error rendering graph</div>';
        }
      }
    };

    renderGraph();
  }, [
    props.tree,
    graphId,
    handleNodeClick,
    props.selectedNodeId,
    highlightSelectedNode,
    topDown,
  ]);

  // Update highlighting when selected node changes
  useEffect(() => {
    highlightSelectedNode();
  }, [highlightSelectedNode]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.max(0.1, Math.min(3, prev * delta)));
  }, []);

  // Add wheel event listener with ref
  useEffect(() => {
    const element = graphContainerRef.current;
    if (!element) return;

    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const toggleTopDown = useCallback(() => {
    setTopDown(!topDown);
  }, [topDown]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-50">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setScale((prev) => Math.min(3, prev * 1.2))}
          className="px-3 py-2 bg-white border rounded shadow hover:bg-gray-50"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setScale((prev) => Math.max(0.1, prev * 0.8))}
          className="px-3 py-2 bg-white border rounded shadow hover:bg-gray-50"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={resetView}
          className="px-3 py-2 bg-white border rounded shadow hover:bg-gray-50"
          title="Reset View"
        >
          Reset
        </button>
        <button
          onClick={toggleTopDown}
          className="px-3 py-2 bg-white border rounded shadow hover:bg-gray-50"
          title="Toggle Layout"
        >
          {topDown ? "TD" : "LR"}
        </button>
      </div>

      {/* Graph Container */}
      <div
        ref={graphContainerRef}
        className={`w-full h-full cursor-grab active:cursor-grabbing ${props.selectedNodeId ? "pr-80" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
        />
      </div>
    </div>
  );
}

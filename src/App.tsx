import * as React from "react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  type TechTree,
  type TechNode,
  validate,
  type TechNodeId,
  rootNodes,
  subgraph,
} from "./TechTree.js";
import mermaid from "mermaid";

function LoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred while loading the application.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function App() {
  return (
    <div className="w-screen h-screen">
      <ErrorBoundary>
        <React.Suspense fallback={<LoadingSpinner />}>
          <AppInner />
        </React.Suspense>
      </ErrorBoundary>
    </div>
  );
}

let initialTreeRaw = {
  nodes: [
    // Root 1: Quantum Flux Capacitor Systems
    {
      id: "quantum-flux-capacitor",
      title: "Quantum Flux Capacitor",
      description:
        "Primary temporal displacement mechanism utilizing quantum entanglement principles for chronodynamic stabilization",
      dependsOn: [],
    },
    {
      id: "temporal-phase-discriminator",
      title: "Temporal Phase Discriminator",
      description:
        "Advanced chronometric filtering system that isolates temporal anomalies through phase-locked loop mechanisms",
      dependsOn: ["quantum-flux-capacitor"],
    },
    {
      id: "chronodynamic-stabilizer",
      title: "Chronodynamic Stabilizer",
      description:
        "Maintains temporal coherence by modulating quantum decoherence rates via parametric amplification",
      dependsOn: [
        "temporal-phase-discriminator",
        "quantum-entanglement-matrix",
      ],
    },
    {
      id: "temporal-feedback-suppressor",
      title: "Temporal Feedback Suppressor",
      description:
        "Prevents causality loop formation through predictive temporal echo cancellation algorithms",
      dependsOn: ["chronodynamic-stabilizer"],
    },
    {
      id: "quantum-resonance-chamber",
      title: "Quantum Resonance Chamber",
      description:
        "Amplifies quantum field oscillations using standing wave interference patterns in hyperdimensional space",
      dependsOn: ["quantum-flux-capacitor"],
    },
    {
      id: "temporal-displacement-array",
      title: "Temporal Displacement Array",
      description:
        "Multi-dimensional projection system enabling controlled temporal trajectory modifications",
      dependsOn: ["temporal-feedback-suppressor", "quantum-resonance-chamber"],
    },

    // Root 2: Turbo Encabulator Matrix
    {
      id: "turbo-encabulator",
      title: "Turbo Encabulator",
      description:
        "The original automated cardinal grammeters for effectively preventing side fumbling in mechanical systems",
      dependsOn: [],
    },
    {
      id: "panendermic-semiboloid",
      title: "Panendermic Semiboloid",
      description:
        "Essential slots for the winding of the rotor, configured in a panendermic arrangement for optimal sinusoidal depleneration",
      dependsOn: ["turbo-encabulator"],
    },
    {
      id: "ambifacient-lunar-waneshaft",
      title: "Ambifacient Lunar Waneshaft",
      description:
        "Couples directly to the differential girdlespring on the up-end of the grammeters for maximum torque transmission",
      dependsOn: ["panendermic-semiboloid", "quantum-entanglement-matrix"],
    },
    {
      id: "malleable-logarithmic-casing",
      title: "Malleable Logarithmic Casing",
      description:
        "Houses the cardinal grammeters in a logarithmic spiral configuration to prevent exponential decay of the flux coefficients",
      dependsOn: ["turbo-encabulator"],
    },
    {
      id: "spurving-bearings",
      title: "Spurving Bearings",
      description:
        "Specialized bearing assemblies that maintain proper alignment of the panendermic semiboloid slots during high-speed operation",
      dependsOn: [
        "ambifacient-lunar-waneshaft",
        "malleable-logarithmic-casing",
      ],
    },
    {
      id: "differential-girdlespring",
      title: "Differential Girdlespring",
      description:
        "Provides reactive torque compensation and prevents side fumbling through advanced spring-loaded differential mechanisms",
      dependsOn: ["spurving-bearings"],
    },

    // Root 3: Hyperbolic Metamagnetic Engine
    {
      id: "hyperbolic-metamagnetic-engine",
      title: "Hyperbolic Metamagnetic Engine",
      description:
        "Revolutionary propulsion system utilizing metamagnetic field inversion for hyperbolic trajectory optimization",
      dependsOn: [],
    },
    {
      id: "metamagnetic-field-inverter",
      title: "Metamagnetic Field Inverter",
      description:
        "Reverses polarity of metamagnetic domains through controlled ferromagnetic hysteresis manipulation",
      dependsOn: ["hyperbolic-metamagnetic-engine"],
    },
    {
      id: "hyperbolic-trajectory-calculator",
      title: "Hyperbolic Trajectory Calculator",
      description:
        "Computes optimal flight paths using non-Euclidean geometry and metamagnetic field strength calculations",
      dependsOn: ["metamagnetic-field-inverter", "quantum-entanglement-matrix"],
    },
    {
      id: "ferromagnetic-oscillation-dampener",
      title: "Ferromagnetic Oscillation Dampener",
      description:
        "Suppresses unwanted magnetic harmonics through parametric feedback control of ferromagnetic domains",
      dependsOn: ["hyperbolic-metamagnetic-engine"],
    },
    {
      id: "metamagnetic-flux-regulator",
      title: "Metamagnetic Flux Regulator",
      description:
        "Maintains constant metamagnetic field density through adaptive flux compensation algorithms",
      dependsOn: [
        "ferromagnetic-oscillation-dampener",
        "hyperbolic-trajectory-calculator",
      ],
    },
    {
      id: "hyperbolic-propulsion-array",
      title: "Hyperbolic Propulsion Array",
      description:
        "Multi-vector thrust generation system utilizing synchronized metamagnetic field manipulation for omnidirectional acceleration",
      dependsOn: ["metamagnetic-flux-regulator"],
    },

    // Shared dependency node
    {
      id: "quantum-entanglement-matrix",
      title: "Quantum Entanglement Matrix",
      description:
        "Fundamental quantum substrate enabling instantaneous information transfer across space-time via entangled particle pairs",
      dependsOn: [],
    },
  ],
};
let initialTree = validate(initialTreeRaw);

function AppInner() {
  let [tree, setTree] = useState<TechTree>(initialTree);
  let [rootNodeId, setRootNodeId] = useState<TechNodeId | null>(null);
  const subtree = useMemo(() => {
    if (rootNodeId === null) {
      return null;
    }
    return subgraph(tree, rootNodeId);
  }, [tree, rootNodeId]);

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

  if (!rootNodeId) {
    return <RootNodePicker tree={tree} onPickRoot={setRootNodeId} />;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-white shadow-sm border-b p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Technology Tree</h1>
        <button
          onClick={() => setRootNodeId(null)}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Back to Tree Selection
        </button>
      </div>
      <div className="flex-1">
        <Graph tree={subtree as TechTree} />
      </div>
    </div>
  );
}

interface RootNodePickerProps {
  tree: TechTree;
  onPickRoot: (id: TechNodeId) => void;
}

function RootNodePicker(props: RootNodePickerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const roots = useMemo(() => rootNodes(props.tree), [props.tree]);

  const filteredRoots = useMemo(() => {
    if (!searchTerm.trim()) return roots;
    const term = searchTerm.toLowerCase();
    return roots.filter(
      (node) =>
        node.title.toLowerCase().includes(term) ||
        node.description.toLowerCase().includes(term),
    );
  }, [roots, searchTerm]);

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Choose a Technology Tree
        </h1>

        {/* Search Box */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search technology trees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          />
        </div>

        {/* Root Nodes List */}
        <div className="space-y-4">
          {filteredRoots.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {searchTerm
                  ? "No technology trees match your search."
                  : "No technology trees available."}
              </p>
            </div>
          ) : (
            filteredRoots.map((node) => (
              <div
                key={node.id}
                onClick={() => props.onPickRoot(node.id)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {node.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {node.description}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface GraphProps {
  tree: TechTree;
}

function mermaidGraph(tree: TechTree): string {
  let mermaid = "graph TD\n";

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

interface SidePanelProps {
  node: TechNode;
  tree: TechTree;
  onClose: () => void;
  onNodeSelect: (node: TechNode) => void;
}

function SidePanel({ node, tree, onClose, onNodeSelect }: SidePanelProps) {
  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-lg border-l border-gray-200 z-20 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Node Details</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
          title="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-3">{node.title}</h3>
        <p className="text-gray-700 leading-relaxed mb-4">{node.description}</p>

        {node.dependsOn.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">Dependencies:</h4>
            <ul className="list-disc list-inside space-y-1">
              {node.dependsOn.map((depId) => {
                const depNode = tree.nodes.find((n) => n.id === depId);
                return (
                  <li key={depId} className="text-gray-600 text-sm">
                    {depNode ? (
                      <button
                        onClick={() => onNodeSelect(depNode)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {depNode.title}
                      </button>
                    ) : (
                      depId
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {node.dependedOnBy && node.dependedOnBy.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Blocks:</h4>
            <ul className="list-disc list-inside space-y-1">
              {node.dependedOnBy.map((depId) => {
                const depNode = tree.nodes.find((n) => n.id === depId);
                return (
                  <li key={depId} className="text-gray-600 text-sm">
                    {depNode ? (
                      <button
                        onClick={() => onNodeSelect(depNode)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {depNode.title}
                      </button>
                    ) : (
                      depId
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Graph(props: GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [graphId] = useState(
    () => `graph-${Math.random().toString(36).substr(2, 9)}`,
  );
  const [selectedNode, setSelectedNode] = useState<TechNode | null>(null);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      // Convert sanitized ID back to original ID
      const originalNodeId = nodeId.replace(/_/g, "-");
      const node = props.tree.nodes.find(
        (n) =>
          n.id === originalNodeId ||
          n.id.replace(/[^a-zA-Z0-9_]/g, "_") === nodeId,
      );
      console.log(`click ${originalNodeId}`);
      if (node) {
        setSelectedNode(node);
      }
    },
    [props.tree],
  );

  // Function to highlight the selected node
  const highlightSelectedNode = useCallback(() => {
    if (!containerRef.current || !selectedNode) return;

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
  }, [selectedNode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderGraph = async () => {
      try {
        const mermaidSyntax = mermaidGraph(props.tree);
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
                  (!selectedNode ||
                    selectedNode.id.replace(/[^a-zA-Z0-9_]/g, "_") !== nodeId)
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
                  (!selectedNode ||
                    selectedNode.id.replace(/[^a-zA-Z0-9_]/g, "_") !== nodeId)
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
    selectedNode,
    highlightSelectedNode,
  ]);

  // Update highlighting when selected node changes
  useEffect(() => {
    highlightSelectedNode();
  }, [highlightSelectedNode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.max(0.1, Math.min(3, prev * delta)));
  }, []);

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
      </div>

      {/* Graph Container */}
      <div
        className={`w-full h-full cursor-grab active:cursor-grabbing ${selectedNode ? "pr-80" : ""}`}
        onWheel={handleWheel}
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

      {/* Side Panel */}
      {selectedNode && (
        <SidePanel
          node={selectedNode}
          tree={props.tree}
          onClose={() => setSelectedNode(null)}
          onNodeSelect={setSelectedNode}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root") as Element).render(<App />);

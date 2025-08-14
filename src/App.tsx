import * as React from "react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  type TechTree,
  type TechNode,
  validate,
  type TechNodeId,
  rootNodes,
  subgraph,
  clone,
  canonicalize,
  updateRefsToId,
  deleteRefsToId,
  findRootNodeOf,
} from "./TechTree.js";
import { Splitter } from "./Splitter.js";
import mermaid from "mermaid";
import markdownit from "markdown-it";

const md = markdownit();

function LoadingSpinner() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

function Markdown(props: { text: string }) {
  const htmlContent = useMemo(() => md.render(props.text), [props.text]);
  return (
    <div
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      className="prose prose-sm max-w-none"
    />
  );
}

interface ModalProps {
  onClose?: () => void;
  children: React.ReactNode;
  allowDismiss?: boolean;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  onClose,
  children,
  allowDismiss = true,
  className = "",
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && allowDismiss && onClose) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (allowDismiss && onClose && overlayRef.current === e.target) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [allowDismiss, onClose]);

  const modalContent = (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        allowDismiss ? "bg-black/50" : "bg-black/70 backdrop-blur-sm"
      }`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white rounded-lg shadow-xl overflow-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "info",
}) => {
  const [focusedButton, setFocusedButton] = useState<"confirm" | "cancel">(
    "cancel",
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (focusedButton === "confirm") {
          onConfirm();
        } else {
          onCancel();
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedButton((prev) => (prev === "confirm" ? "cancel" : "confirm"));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedButton, onConfirm, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: "🗑️",
          confirmClass: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
          iconColor: "text-red-500",
        };
      case "warning":
        return {
          icon: "⚠️",
          confirmClass:
            "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
          iconColor: "text-yellow-500",
        };
      default:
        return {
          icon: "ℹ️",
          confirmClass: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
          iconColor: "text-blue-500",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Modal onClose={onCancel} allowDismiss={true} className="max-w-md">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className={`text-2xl mr-3 ${styles.iconColor}`}>
            {styles.icon}
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>

        <p className="text-gray-700 mb-6 leading-relaxed">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className={`px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 ${
              focusedButton === "cancel" ? "ring-2 ring-gray-500" : ""
            }`}
            onFocus={() => setFocusedButton("cancel")}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded transition-colors focus:outline-none focus:ring-2 ${styles.confirmClass} ${
              focusedButton === "confirm" ? "ring-2" : ""
            }`}
            onFocus={() => setFocusedButton("confirm")}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

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
          <LoadedApp />
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
let initialTreeHistory = [initialTree];

// Add helper functions for URL handling
function getUrlParameter(name: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

async function fetchTreeFromUrl(url: string): Promise<TechTree> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return validate(data);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load from URL: ${error.message}`);
    }
    throw new Error(`Failed to load from URL: Unknown error`);
  }
}

function LoadedApp() {
  let [treeHistory, setTreeHistory] = useState<TechTree[]>(initialTreeHistory);
  let [treeIndex, setTreeIndex] = useState<number>(0);
  let tree = treeHistory[treeIndex];
  let [rootNodeId, setRootNodeId] = useState<TechNodeId | null>(null);
  let [showAddNodeModal, setShowAddNodeModal] = useState(false);
  let [error, setError] = useState<string | null>(null);
  let [selectedNodeId, setSelectedNodeId] = useState<TechNodeId | null>(null);
  let fileInputRef = useRef<HTMLInputElement>(null);
  let [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Check for URL parameter on mount
  useEffect(() => {
    const urlParam = getUrlParameter("url");
    if (urlParam) {
      setIsLoadingUrl(true);
      fetchTreeFromUrl(urlParam)
        .then((validatedTree) => {
          // Successfully loaded and validated - add to history
          setTreeHistory([validatedTree]);
          setTreeIndex(0);

          // Reset UI state
          setRootNodeId(null);
          setSelectedNodeId(null);
          setError(null);
        })
        .catch((err) => {
          console.error("Error loading from URL:", err);
          setError(
            err instanceof Error ? err.message : "Failed to load from URL",
          );
        })
        .finally(() => {
          setIsLoadingUrl(false);
        });
    }
  }, []); // Empty dependency array - only run on mount

  const subtree = useMemo(() => {
    if (rootNodeId === null) {
      return null;
    }
    if (!tree.nodes.find((x) => x.id === rootNodeId)) {
      setRootNodeId(null);
      setSelectedNodeId(null);
    }
    return subgraph(tree, rootNodeId);
  }, [tree, rootNodeId]);

  if (!tree.nodes.find((x) => x.id === rootNodeId)) {
    rootNodeId = null;
  }
  if (!tree.nodes.find((x) => x.id === selectedNodeId)) {
    selectedNodeId = null;
  }

  useEffect(() => {
    if (!selectedNodeId || !subtree) {
      return;
    }
    if (!tree.nodes.find((x) => x.id === selectedNodeId)) {
      setSelectedNodeId(null);
    } else if (!subtree.nodes.find((x) => x.id === selectedNodeId)) {
      let rootNodeId = findRootNodeOf(tree, selectedNodeId);
      setRootNodeId(rootNodeId);
    }
  }, [selectedNodeId, subtree]);

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

  const updateNode = (previousId: TechNodeId, newNode: TechNode) => {
    try {
      let newTree = clone(tree);
      let newIndex = newTree.nodes.findIndex((v) => v.id === newNode.id);
      if (newIndex === -1) {
        newTree.nodes.push(newNode);
      } else {
        newTree.nodes[newIndex] = newNode;
      }
      updateRefsToId(newTree, previousId, newNode.id);
      newTree = validate(newTree);
      let newTreeHistory = [...treeHistory.slice(0, treeIndex + 1)];
      let newTreeIndex = newTreeHistory.length;
      setTreeHistory([...newTreeHistory, newTree]);
      setTreeIndex(newTreeIndex);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update node");
      return;
    }
  };

  const deleteNode = (id: TechNodeId) => {
    try {
      let newTree = clone(tree);
      let oldIndex = newTree.nodes.findIndex((x) => x.id === id);
      newTree.nodes.splice(oldIndex, 1);
      deleteRefsToId(newTree, id);
      newTree = validate(newTree);
      let newTreeHistory = [...treeHistory.slice(0, treeIndex + 1)];
      let newTreeIndex = newTreeHistory.length;
      setTreeHistory([...newTreeHistory, newTree]);
      setTreeIndex(newTreeIndex);
      if (rootNodeId === id) {
        setRootNodeId(null);
      }
      if (selectedNodeId === id) {
        setSelectedNodeId(null);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to update node");
      return;
    }
  };

  const addNode = (title: string, description: string) => {
    let blocking: null | TechNodeId = null;
    if (selectedNodeId) {
      blocking = selectedNodeId;
    } else if (rootNodeId) {
      blocking = rootNodeId;
    }

    try {
      let newTree = clone(tree);
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Check if node with this ID already exists
      if (newTree.nodes.find((node) => node.id === id)) {
        setError(
          `A node with the ID "${id}" already exists. Please choose a different title.`,
        );
        return;
      }

      const newNode: TechNode = {
        id,
        title,
        description,
        dependsOn: [],
        dependedOnBy: [],
      };
      newTree.nodes.push(newNode);
      if (blocking !== null) {
        newTree.nodes.find((x) => x.id === blocking)?.dependsOn.push(id);
        newNode.dependedOnBy.push(blocking);
      }
      newTree = validate(newTree);

      let newTreeHistory = [...treeHistory.slice(0, treeIndex + 1)];
      let newTreeIndex = newTreeHistory.length;
      setTreeHistory([...newTreeHistory, newTree]);
      setTreeIndex(newTreeIndex);
      if (!rootNodeId) {
        setRootNodeId(newNode.id);
      } else if (!selectedNodeId) {
        setSelectedNodeId(newNode.id);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to add node");
    }
  };

  const saveToFile = () => {
    const dataStr = JSON.stringify(canonicalize(tree), null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = `tech-tree-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleUndo = () => {
    if (treeIndex > 0) {
      setTreeIndex(treeIndex - 1);
    }
  };

  const handleRedo = () => {
    if (treeIndex < treeHistory.length - 1) {
      setTreeIndex(treeIndex + 1);
    }
  };

  const handleUndoAll = () => {
    setTreeIndex(0);
  };

  const canUndo = treeIndex > 0;
  const canRedo = treeIndex < treeHistory.length - 1;

  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        const validatedTree = validate(parsed);

        // Successfully loaded and validated - add to history
        setTreeHistory([validatedTree]);
        setTreeIndex(0);

        // Reset UI state
        setRootNodeId(null);
        setSelectedNodeId(null);
        setError(null);
      } catch (err) {
        console.error("Error loading file:", err);
        setError(
          err instanceof Error
            ? `Failed to load file: ${err.message}`
            : "Failed to load file: Invalid JSON or tree structure",
        );
      }
    };

    reader.onerror = () => {
      setError("Failed to read file");
    };

    reader.readAsText(file);

    // Reset the input so the same file can be loaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-white shadow-sm border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="./favicon.svg" alt="Tech Tree" className="w-6 h-6" />
          <h1 className="text-xl font-semibold">Tech Tree</h1>
          {isLoadingUrl && (
            <div className="ml-4 flex items-center gap-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Loading from URL...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {rootNodeId && (
            <button
              onClick={() => {
                setRootNodeId(null);
                setSelectedNodeId(null);
              }}
              className="mx-6 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              ← Back to Tree Selection
            </button>
          )}
          {/* History controls */}
          <div className="flex items-center gap-1 mr-2">
            {treeIndex !== 0 && (
              <div className="px-3 py-1 text-xs bg-orange-100 text-orange-700 border border-orange-200 rounded mr-2 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                Unsaved changes
              </div>
            )}
            <button
              onClick={handleUndoAll}
              disabled={!canUndo}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              title="Undo all changes"
            >
              Undo All
            </button>
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              title="Undo last change"
            >
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              title="Redo last undone change"
            >
              Redo
            </button>
          </div>

          <button
            onClick={() => setShowAddNodeModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Add Node
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileLoad}
            className="hidden"
          />

          <button
            onClick={openFileDialog}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            title="Open tree from JSON file"
          >
            Open
          </button>

          <button
            onClick={saveToFile}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            title="Download current tree as JSON"
          >
            Download
          </button>
        </div>
      </div>
      <Splitter direction="horizontal" initialSplit={66} className="flex-1">
        <div className="bg-gray-50 w-full h-full">
          {!rootNodeId && (
            <NodePicker fullTree={tree} onPickNode={setRootNodeId} />
          )}
          {rootNodeId && (
            <Subgraph
              fullTree={tree}
              subTree={subtree as TechTree}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onUpdateNode={updateNode}
              onDeleteNode={deleteNode}
            />
          )}
        </div>
        {/* Side Panel */}
        {selectedNodeId !== null && (
          <NodeViewer
            nodeId={selectedNodeId}
            fullTree={tree}
            onClose={() => setSelectedNodeId(null)}
            onNodeSelect={setSelectedNodeId}
            onUpdateNode={updateNode}
            onDeleteNode={deleteNode}
          />
        )}
      </Splitter>
      {showAddNodeModal && (
        <AddNodeModal
          onClose={() => setShowAddNodeModal(false)}
          onAdd={(title, description) => addNode(title, description)}
        />
      )}
      {error && <ErrorPopup error={error} onClose={() => setError(null)} />}
    </div>
  );
}

interface NodePickerProps {
  fullTree: TechTree;
  onPickNode: (id: TechNodeId) => void;
}

function NodePicker(props: NodePickerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const roots = useMemo(() => rootNodes(props.fullTree), [props.fullTree]);

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
    <div className="w-full h-full p-6">
      <div className="max-w-4xl mx-auto">
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
            placeholder="Search tech trees..."
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
                  ? "No tech trees match your search."
                  : "No tech trees available."}
              </p>
            </div>
          ) : (
            filteredRoots.map((node) => (
              <div
                key={node.id}
                onClick={() => props.onPickNode(node.id)}
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

interface NodePickerModalProps {
  fullTree: TechTree;
  onPickNode: (id: TechNodeId) => void;
  onClose: () => void;
}

function NodePickerModal({
  fullTree,
  onPickNode,
  onClose,
}: NodePickerModalProps) {
  const handlePickNode = (id: TechNodeId) => {
    onPickNode(id);
    onClose();
  };

  return (
    <Modal onClose={onClose} className="max-w-[80vh] max-h-[80vh]">
      <div className="p-6">
        <div className="overflow-y-auto">
          <NodePicker fullTree={fullTree} onPickNode={handlePickNode} />
        </div>
      </div>
    </Modal>
  );
}

interface NodeViewerProps {
  nodeId: TechNodeId;
  fullTree: TechTree;
  onClose: () => void;
  onNodeSelect: (nodeId: TechNodeId) => void;
  onUpdateNode: (previousId: TechNodeId, newNode: TechNode) => void;
  onDeleteNode: (id: TechNodeId) => void;
}

function NodeViewer({
  nodeId,
  fullTree,
  onClose,
  onNodeSelect,
  onUpdateNode,
  onDeleteNode,
}: NodeViewerProps) {
  const node = fullTree.nodes.find((n) => n.id === nodeId) as TechNode;
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(node.title);
  const [editedDescription, setEditedDescription] = useState(node.description);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const updateTimeoutRef = useRef<number | null>(null);

  // Reset edited values when node changes
  useEffect(() => {
    setEditedTitle(node.title);
    setEditedDescription(node.description);
  }, [node]);

  // Debounced update function
  const debouncedUpdate = useCallback(
    (title: string, description: string) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        // Generate new ID from title
        const newId = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const updatedNode = {
          ...node,
          id: newId,
          title: title,
          description: description,
        };

        onUpdateNode(node.id, updatedNode);
      }, 500); // 500ms debounce
    },
    [node, onUpdateNode],
  );

  // Handle title changes
  const handleTitleChange = (newTitle: string) => {
    setEditedTitle(newTitle);
    if (isEditing && newTitle.trim()) {
      debouncedUpdate(newTitle.trim(), editedDescription);
    }
  };

  // Handle description changes
  const handleDescriptionChange = (newDescription: string) => {
    setEditedDescription(newDescription);
    if (isEditing) {
      debouncedUpdate(editedTitle, newDescription);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleEdit = () => {
    if (isEditing) {
      // Save any pending changes when exiting edit mode
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        const newId = editedTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const updatedNode = {
          ...node,
          id: newId,
          title: editedTitle,
          description: editedDescription,
        };

        onUpdateNode(node.id, updatedNode);
      }
    }
    setIsEditing(!isEditing);
  };

  const handleAddDependency = (dependencyId: TechNodeId) => {
    const updatedNode = {
      ...node,
      dependsOn: [...node.dependsOn, dependencyId],
    };
    onUpdateNode(node.id, updatedNode);
  };

  const handleRemoveDependency = (dependencyId: TechNodeId) => {
    const updatedNode = {
      ...node,
      dependsOn: node.dependsOn.filter((id) => id !== dependencyId),
    };
    onUpdateNode(node.id, updatedNode);
  };

  const handleDelete = () => {
    onDeleteNode(node.id);
  };

  // Simple cycle detection helper
  const wouldCreateCycle = (
    tree: TechTree,
    fromId: TechNodeId,
    toId: TechNodeId,
  ): boolean => {
    const visited = new Set<TechNodeId>();

    const hasPath = (currentId: TechNodeId, targetId: TechNodeId): boolean => {
      if (currentId === targetId) return true;
      if (visited.has(currentId)) return false;

      visited.add(currentId);
      const currentNode = tree.nodes.find((n) => n.id === currentId);
      if (!currentNode) return false;

      return currentNode.dependsOn.some((depId) => hasPath(depId, targetId));
    };

    return hasPath(toId, fromId);
  };

  // Filter out nodes that are already dependencies or would create cycles
  const availableNodes = fullTree.nodes.filter(
    (n) =>
      n.id !== node.id &&
      !node.dependsOn.includes(n.id) &&
      // Prevent cycles by not allowing nodes that depend on this node
      !wouldCreateCycle(fullTree, node.id, n.id),
  );

  return (
    <div className="w-full h-full bg-white shadow-lg border-l border-gray-200 z-20 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none mr-2"
            placeholder="Node title..."
          />
        ) : (
          <h2 className="text-lg font-semibold text-gray-900">{node.title}</h2>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-gray-100 rounded"
            title="Delete node"
          >
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>

          <button
            onClick={handleToggleEdit}
            className="p-1 hover:bg-gray-100 rounded"
            title={isEditing ? "Save changes" : "Edit node"}
          >
            {isEditing ? (
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            )}
          </button>
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
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {isEditing && (
          <div className="mb-4 p-3 bg-blue-50 text-xs text-blue-600 rounded-md">
            Changes are saved automatically as you type.
          </div>
        )}

        <div className="mb-12">
          {isEditing ? (
            <textarea
              value={editedDescription}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
              placeholder="Node description (markdown supported)..."
            />
          ) : (
            <Markdown text={node.description} />
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Dependencies:</h4>
          </div>

          {node.dependsOn.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {node.dependsOn.map((depId) => {
                const depNode = fullTree.nodes.find((n) => n.id === depId);
                return (
                  <li
                    key={depId}
                    className="text-gray-600 text-sm flex items-center justify-between"
                  >
                    <div className="flex-1">
                      {depNode ? (
                        <button
                          onClick={() => onNodeSelect(depNode.id)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {depNode.title}
                        </button>
                      ) : (
                        <span className="text-gray-500">
                          {depId} (not found)
                        </span>
                      )}
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveDependency(depId)}
                        className="ml-2 text-red-500 hover:text-red-700"
                        title="Remove dependency"
                      >
                        <svg
                          className="w-4 h-4"
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
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No dependencies</p>
          )}

          {isEditing && (
            <button
              onClick={() => setShowNodePicker(true)}
              className="mt-8 w-full px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
              disabled={availableNodes.length === 0}
            >
              {availableNodes.length === 0
                ? "No nodes available"
                : "Add Dependency"}
            </button>
          )}
        </div>

        {node.dependedOnBy && node.dependedOnBy.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Blocks:</h4>
            <ul className="list-disc list-inside space-y-1">
              {node.dependedOnBy.map((depId) => {
                const depNode = fullTree.nodes.find((n) => n.id === depId);
                return (
                  <li key={depId} className="text-gray-600 text-sm">
                    {depNode ? (
                      <button
                        onClick={() => onNodeSelect(depNode.id)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {depNode.title}
                      </button>
                    ) : (
                      <span className="text-gray-500">
                        {depId} (not in current view)
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {showNodePicker && (
        <NodePickerModal
          fullTree={{ nodes: availableNodes }}
          onPickNode={handleAddDependency}
          onClose={() => setShowNodePicker(false)}
        />
      )}
    </div>
  );
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

interface SubgraphProps {
  subTree: TechTree;
  fullTree: TechTree;
  selectedNodeId: TechNodeId | null;
  onNodeSelect: (nodeId: TechNodeId | null) => void;
  onUpdateNode: (previousId: TechNodeId, newNode: TechNode) => void;
  onDeleteNode: (nodeId: TechNodeId) => void;
}

function Subgraph(props: SubgraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [graphId] = useState(
    () => `graph-${Math.random().toString(36).substr(2, 9)}`,
  );
  const previousWidthRef = useRef<number>(0);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      // Convert sanitized ID back to original ID
      const originalNodeId = nodeId.replace(/_/g, "-");
      const node = props.subTree.nodes.find(
        (n) =>
          n.id === originalNodeId ||
          n.id.replace(/[^a-zA-Z0-9_]/g, "_") === nodeId,
      );
      if (node) {
        props.onNodeSelect(node.id);
      }
    },
    [props.subTree, props.onNodeSelect],
  );

  // Function to highlight the selected node
  const highlightSelectedNode = useCallback(() => {
    if (!containerRef.current || !props.selectedNodeId) return;

    const selectedNode = props.subTree.nodes.find(
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
  }, [props.selectedNodeId, props.subTree]);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderGraph = async () => {
      try {
        const mermaidSyntax = mermaidGraph(props.subTree);
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
                    !props.subTree.nodes
                      .find((n) => n.id === props.selectedNodeId)
                      ?.id.replace(/[^a-zA-Z0-9_]/g, "_") ||
                    props.subTree.nodes
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
                    !props.subTree.nodes
                      .find((n) => n.id === props.selectedNodeId)
                      ?.id.replace(/[^a-zA-Z0-9_]/g, "_") ||
                    props.subTree.nodes
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
    props.subTree,
    graphId,
    handleNodeClick,
    props.selectedNodeId,
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
        className={`w-full h-full cursor-grab active:cursor-grabbing ${props.selectedNodeId ? "pr-80" : ""}`}
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
    </div>
  );
}

interface AddNodeModalProps {
  onClose: () => void;
  onAdd: (title: string, description: string) => void;
}

function AddNodeModal({ onClose, onAdd }: AddNodeModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim()) {
      onAdd(title.trim(), description.trim());
      onClose();
    }
  };

  return (
    <Modal onClose={onClose} className="w-[80vh] h-[80vh]">
      <form onSubmit={handleSubmit} className="p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Node</h2>

        <div className="mb-4">
          <label
            htmlFor="node-title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Title
          </label>
          <input
            id="node-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter title..."
            required
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="node-description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description
          </label>
          <textarea
            id="node-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
            placeholder="Enter markdown description..."
            required
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !description.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Add Node
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ErrorPopupProps {
  error: string;
  onClose: () => void;
}

function ErrorPopup({ error, onClose }: ErrorPopupProps) {
  return (
    <Modal onClose={onClose} className="max-w-md">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="text-red-500 text-2xl mr-3">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900">Error</h2>
        </div>

        <p className="text-gray-700 mb-6 leading-relaxed">{error}</p>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

createRoot(document.getElementById("root") as Element).render(<App />);

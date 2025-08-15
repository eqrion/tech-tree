import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
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
  generateId,
  generateTitle,
} from "./TechTree.js";
import { Splitter } from "./Splitter.js";
import Hamburger from "./Hamburger.js";
import { NodePicker } from "./NodePicker.js";
import { NodeViewer } from "./NodeViewer.js";
import { Subgraph } from "./Subgraph.js";
import { ErrorPopup } from "./ErrorPopup.js";

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
          <LoadedApp />
        </React.Suspense>
      </ErrorBoundary>
    </div>
  );
}

let initialTreeRaw = {
  nodes: [],
};
let initialTree = validate(initialTreeRaw);
let initialTreeHistory = [initialTree];

// Add helper functions for URL handling
function getUrlParameter(name: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function updateUrlParameters(params: Record<string, string | null>) {
  const url = new URL(window.location.href);

  Object.entries(params).forEach(([key, value]) => {
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });

  // Only push state if the URL actually changed
  if (url.toString() !== window.location.href) {
    window.history.pushState({}, "", url.toString());
  }
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
  let [editing, setEditing] = useState(false);
  let [error, setError] = useState<string | null>(null);
  let [selectedNodeId, setSelectedNodeId] = useState<TechNodeId | null>(null);
  let fileInputRef = useRef<HTMLInputElement>(null);
  let [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Initialize state from URL parameters
  useEffect(() => {
    const initialRootNodeId = getUrlParameter("root");
    const initialSelectedNodeId = getUrlParameter("selected");

    if (initialRootNodeId) {
      setRootNodeId(initialRootNodeId);
    }
    if (initialSelectedNodeId) {
      setSelectedNodeId(initialSelectedNodeId);
    }
  }, []);

  // Listen for browser navigation (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const urlRootNodeId = getUrlParameter("root");
      const urlSelectedNodeId = getUrlParameter("selected");

      setRootNodeId(urlRootNodeId);
      setSelectedNodeId(urlSelectedNodeId);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Update URL when rootNodeId changes
  useEffect(() => {
    updateUrlParameters({
      root: rootNodeId,
      selected: rootNodeId ? selectedNodeId : null,
    });
  }, [rootNodeId, selectedNodeId]);

  // Load the default tree
  useEffect(() => {
    const urlParam = getUrlParameter("url") || "./trees/default.json";

    setIsLoadingUrl(true);
    fetchTreeFromUrl(urlParam)
      .then((validatedTree) => {
        // Successfully loaded and validated - add to history
        setTreeHistory([validatedTree]);
        setTreeIndex(0);

        // Reset UI state but preserve URL parameters
        const urlRootNodeId = getUrlParameter("root");
        const urlSelectedNodeId = getUrlParameter("selected");

        // Only reset if the URL doesn't specify nodes
        if (!urlRootNodeId) {
          setRootNodeId(null);
        }
        if (!urlSelectedNodeId) {
          setSelectedNodeId(null);
        }

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
  }, []);

  const subtree = useMemo(() => {
    if (rootNodeId === null) {
      return null;
    }
    if (!tree.nodes.find((x) => x.id === rootNodeId)) {
      setRootNodeId(null);
      setSelectedNodeId(null);
      return null;
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

  const updateNode = (previousId: TechNodeId, newNode: TechNode) => {
    try {
      let newTree = clone(tree);
      let existingIndex = newTree.nodes.findIndex((v) => v.id === previousId);
      if (existingIndex === -1) {
        newTree.nodes.push(newNode);
      } else {
        newTree.nodes[existingIndex] = newNode;
      }
      updateRefsToId(newTree, previousId, newNode.id);
      newTree = validate(newTree);
      let newTreeHistory = [...treeHistory.slice(0, treeIndex + 1)];
      let newTreeIndex = newTreeHistory.length;
      if (selectedNodeId === previousId) {
        setSelectedNodeId(newNode.id);
      }
      if (rootNodeId === previousId) {
        setRootNodeId(newNode.id);
      }
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

  const addNode = () => {
    let blocking: null | TechNodeId = null;
    if (selectedNodeId) {
      blocking = selectedNodeId;
    } else if (rootNodeId) {
      blocking = rootNodeId;
    }
    let title = generateTitle(tree, blocking);
    let id = generateId(title);

    // Check if node with this ID already exists
    if (tree.nodes.find((node) => node.id === id)) {
      setError(
        `A node with the ID "${id}" already exists. Please choose a different title.`,
      );
      return null;
    }

    try {
      let newTree = clone(tree);

      const newNode: TechNode = {
        id,
        title,
        description: "",
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
      }
      setSelectedNodeId(newNode.id);

      return newNode;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to add node");
    }
    return null;
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

  const newTree = () => {
    setTreeHistory([{ nodes: [] }]);
    setTreeIndex(0);
    setSelectedNodeId(null);
    setRootNodeId(null);
    setEditing(true);
    // Clear URL parameters when creating new tree
    updateUrlParameters({ root: null, selected: null });
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const menuItems = [
    {
      label: "New",
      onClick: newTree,
    },
    {
      label: "Open",
      onClick: openFileDialog,
    },
    {
      label: "Download",
      onClick: saveToFile,
    },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-white shadow-sm border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="./favicon.svg" alt="Tech Tree" className="w-6 h-6" />
          <a
            href="https://github.com/eqrion/tech-tree"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl font-semibold text-gray-900 hover:text-blue-900 transition-colors hover:underline"
          >
            Tech Tree
          </a>
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
          {(editing || treeIndex !== 0) && (
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
          )}

          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {editing ? "View" : "Edit"}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileLoad}
            className="hidden"
          />

          <Hamburger menuItems={menuItems} />
        </div>
      </div>
      <Splitter direction="horizontal" initialSplit={66} className="flex-1">
        <div className="bg-gray-50 w-full h-full">
          {!rootNodeId && (
            <NodePicker
              editing={editing}
              nodes={rootNodes(tree)}
              onPickNode={setRootNodeId}
              onAddNode={addNode}
            />
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
            editing={editing}
            nodeId={selectedNodeId}
            fullTree={tree}
            onClose={() => setSelectedNodeId(null)}
            onRootSelect={setRootNodeId}
            onNodeSelect={setSelectedNodeId}
            onAddNewDependsOn={addNode}
            onUpdateNode={updateNode}
            onDeleteNode={deleteNode}
          />
        )}
      </Splitter>
      {error && <ErrorPopup error={error} onClose={() => setError(null)} />}
    </div>
  );
}

createRoot(document.getElementById("root") as Element).render(<App />);

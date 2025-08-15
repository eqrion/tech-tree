import * as React from "react";
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { type TechTree, validate, KnownTrees } from "./TechTree.js";
import { getUrlParameter, updateUrlParameters } from "./UrlParams.js";
import { TechTreeViewer } from "./TechTreeViewer.js";
import { ErrorPopup } from "./ErrorPopup.js";
import Home from "./Home.js";

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
        <AppInner />
      </ErrorBoundary>
    </div>
  );
}

export function AppInner() {
  let [tree, setTree] = useState<TechTree | null>(null);
  let [error, setError] = useState<string | null>(null);
  let [loading, setLoading] = useState<boolean>(false);

  let loadKnown = (knownTree: string) => {
    const knownTreeUrl = KnownTrees[knownTree as keyof typeof KnownTrees];
    if (!knownTreeUrl) {
      console.error("Unknown tech tree:", knownTree);
      setError(`Unknown tech tree: ${knownTree}`);
      return;
    }

    setLoading(true);
    updateUrlParameters({ tree: knownTree });
    fetchTreeFromUrl(knownTreeUrl)
      .then((tree) => {
        setTree(tree);
        setError(null);
      })
      .catch((error) => {
        console.error("Failed to load known tree:", error);
        setError(error.message || "Failed to load tech tree");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  let loadUrl = (url: string) => {
    setLoading(true);
    updateUrlParameters({ url: url });
    fetchTreeFromUrl(url)
      .then((tree) => {
        setTree(tree);
        setError(null);
      })
      .catch((error) => {
        console.error("Failed to load tree from URL:", error);
        setError(error.message || "Failed to load tech tree from URL");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let updateForURL = () => {
      const knownTree = getUrlParameter("tree");
      if (knownTree) {
        loadKnown(knownTree);
        return;
      }

      const url = getUrlParameter("url");
      if (url) {
        loadUrl(url);
      }

      setTree(null);
    };
    updateForURL();

    window.addEventListener("popstate", updateForURL);
    return () => {
      window.removeEventListener("popstate", updateForURL);
    };
  }, []);

  let newTree = () => {
    setTree({ nodes: [] });
    setError(null);
    setLoading(false);
    updateUrlParameters({ tree: null, url: null, root: null, selected: null });
  };
  let back = () => {
    setTree(null);
    setError(null);
    setLoading(false);
    updateUrlParameters({ tree: null, url: null, root: null, selected: null });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!tree) {
    return (
      <>
        <Home onNew={newTree} onOpen={setTree} onKnown={loadKnown} />
        {error && <ErrorPopup error={error} onClose={() => setError(null)} />}
      </>
    );
  }
  return <TechTreeViewer tree={tree} onNewTree={newTree} onBack={back} />;
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

createRoot(document.getElementById("root") as Element).render(<App />);

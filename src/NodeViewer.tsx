import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  type TechTree,
  type TechNode,
  type TechNodeId,
  generateId,
} from "./TechTree.js";
import { Modal } from "./Modal.js";
import { Markdown } from "./Markdown.js";
import { NodePickerModal } from "./NodePicker.js";

interface AddNodeModalProps {
  onClose: () => void;
  onAdd: (title: string, description: string) => void;
}

function AddNodeModal({ onClose, onAdd }: AddNodeModalProps) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim(), "");
      onClose();
    }
  };

  return (
    <Modal onClose={onClose} className="w-[80vh]">
      <form onSubmit={handleSubmit} className="p-6">
        <h2 className="text-xl font-semibold mb-4">Add Node</h2>

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
            autoFocus={true}
            autoComplete="off"
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter title..."
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
            disabled={!title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface NodeViewerProps {
  nodeId: TechNodeId;
  editing: boolean;
  fullTree: TechTree;
  onClose: () => void;
  onRootSelect: (nodeId: TechNodeId) => void;
  onNodeSelect: (nodeId: TechNodeId) => void;
  onAddNewDependsOn: () => void;
  onUpdateNode: (
    previousId: TechNodeId,
    newNode: TechNode,
    updateKind: string,
    allowMerge: boolean,
  ) => void;
  onDeleteNode: (id: TechNodeId) => void;
}

export function NodeViewer({
  nodeId,
  editing,
  fullTree,
  onClose,
  onRootSelect,
  onNodeSelect,
  onAddNewDependsOn,
  onUpdateNode,
  onDeleteNode,
}: NodeViewerProps) {
  const node = fullTree.nodes.find((n) => n.id === nodeId) as TechNode;
  const [showNodePicker, setShowNodePicker] = useState(false);

  const handleSetTitle = (title: string) => {
    const updatedNode = {
      ...node,
      id: generateId(title),
      title: title,
    };
    onUpdateNode(node.id, updatedNode, "set-title", true);
  };

  const handleSetDescription = (description: string) => {
    const updatedNode = {
      ...node,
      description: description,
    };
    onUpdateNode(node.id, updatedNode, "set-description", true);
  };

  const handleAddDependency = (dependencyId: TechNodeId) => {
    const updatedNode = {
      ...node,
      dependsOn: [...node.dependsOn, dependencyId],
    };
    onUpdateNode(node.id, updatedNode, "add-dependency", false);
  };

  const handleRemoveDependency = (dependencyId: TechNodeId) => {
    const updatedNode = {
      ...node,
      dependsOn: node.dependsOn.filter((id) => id !== dependencyId),
    };
    onUpdateNode(node.id, updatedNode, "remove-dependency", false);
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
        {editing ? (
          <input
            type="text"
            value={node.title}
            autoComplete="off"
            autoFocus={true}
            onChange={(e) => handleSetTitle(e.target.value)}
            className="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none mr-2"
            placeholder="Node title..."
          />
        ) : (
          <h2 className="text-lg font-semibold text-gray-900">{node.title}</h2>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onRootSelect(nodeId)}
            className="p-1 hover:bg-gray-100 text-xs text-gray-800 underline hover:text-gray-900 rounded"
            title="Focus as root"
          >
            Focus
          </button>
          {editing && (
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
          )}
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
        {editing && (
          <div className="mb-4 p-3 bg-blue-50 text-xs text-blue-600 rounded-md">
            Changes are saved automatically as you type.
          </div>
        )}

        <div className="mb-12">
          {editing ? (
            <textarea
              value={node.description}
              onChange={(e) => handleSetDescription(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
              placeholder="Node markdown description..."
            />
          ) : (
            <Markdown text={node.description} />
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Depends On:</h4>
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
                    {editing && (
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

          {editing && (
            <div className="mt-8 flex gap-2">
              <button
                onClick={() => {
                  if (availableNodes.length === 0) {
                    onAddNewDependsOn();
                  } else {
                    setShowNodePicker(true);
                  }
                }}
                className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
              >
                {"Add Existing"}
              </button>
              <button
                onClick={onAddNewDependsOn}
                className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
              >
                {"Add New"}
              </button>
            </div>
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
          nodes={availableNodes}
          editing={editing}
          onPickNode={handleAddDependency}
          onAddNode={onAddNewDependsOn}
          onClose={() => setShowNodePicker(false)}
        />
      )}
    </div>
  );
}

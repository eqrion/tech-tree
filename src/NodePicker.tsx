import * as React from "react";
import { useState, useMemo } from "react";
import { type TechNode, type TechNodeId } from "./TechTree.js";
import { Modal } from "./Modal.js";

interface NodePickerProps {
  nodes: TechNode[];
  editing: boolean;
  onPickNode: (id: TechNodeId) => void;
  onAddNode: (title: string, description: string) => TechNode | null;
}

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

export function NodePicker(props: NodePickerProps) {
  let [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  let nodes = props.nodes;

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return nodes;
    const term = searchTerm.toLowerCase();
    return nodes.filter(
      (node) =>
        node.title.toLowerCase().includes(term) ||
        node.description.toLowerCase().includes(term),
    );
  }, [nodes, searchTerm]);

  return (
    <div className="w-full h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          {/* Search Box */}
          <div className="flex-grow relative">
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
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
          {props.editing && (
            <button
              onClick={() => setShowAddNodeModal(true)}
              className="ml-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          )}
        </div>

        {/* Root Nodes List */}
        <div className="space-y-4">
          {filteredNodes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {searchTerm
                  ? "No nodes match your search."
                  : "Add a node to get started."}
              </p>
            </div>
          ) : (
            filteredNodes.map((node) => (
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
      {showAddNodeModal && (
        <AddNodeModal
          onClose={() => setShowAddNodeModal(false)}
          onAdd={props.onAddNode}
        />
      )}
    </div>
  );
}

interface NodePickerModalProps {
  nodes: TechNode[];
  editing: boolean;
  onPickNode: (id: TechNodeId) => void;
  onAddNode: (title: string, description: string) => TechNode | null;
  onClose: () => void;
}

export function NodePickerModal({
  nodes,
  editing,
  onPickNode,
  onAddNode,
  onClose,
}: NodePickerModalProps) {
  const handlePickNode = (id: TechNodeId) => {
    onPickNode(id);
    onClose();
  };
  const handleAddNode = (title: string, description: string) => {
    var result = onAddNode(title, description);
    onClose();
    return result;
  };

  return (
    <Modal onClose={onClose} className="max-w-[80vh] max-h-[80vh]">
      <div className="p-6">
        <div className="overflow-y-auto">
          <NodePicker
            editing={editing}
            nodes={nodes}
            onAddNode={handleAddNode}
            onPickNode={handlePickNode}
          />
        </div>
      </div>
    </Modal>
  );
}

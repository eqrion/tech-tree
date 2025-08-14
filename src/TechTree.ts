export interface TechTree {
  nodes: TechNode[];
}

export type TechNodeId = string;

// A node in the tech tree. Represents a single project or work item.
export interface TechNode {
  // Internal id used for cross-references
  id: TechNodeId;

  // The user-friendly title to display
  title: string;

  // Markdown encoded string rendered when node is focused
  description: string;

  // All the other nodes that must be finished to unblock or complete this
  // node.
  dependsOn: TechNodeId[];
}

// Validate an object matches the tech tree schema. Throws an error
// if it does not.
export function validate(tree: object): TechTree {
  if (!tree || typeof tree !== "object") {
    throw new Error("TechTree must be an object");
  }

  const candidate = tree as any;

  if (!Array.isArray(candidate.nodes)) {
    throw new Error("TechTree.nodes must be an array");
  }

  const nodeIds = new Set<string>();

  // First pass: validate node structure and collect IDs
  for (let i = 0; i < candidate.nodes.length; i++) {
    const node = candidate.nodes[i];

    if (!node || typeof node !== "object") {
      throw new Error(`Node at index ${i} must be an object`);
    }

    if (typeof node.id !== "string" || node.id.trim() === "") {
      throw new Error(`Node at index ${i} must have a non-empty string id`);
    }

    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);

    if (typeof node.title !== "string") {
      throw new Error(`Node ${node.id} must have a string title`);
    }

    if (typeof node.description !== "string") {
      throw new Error(`Node ${node.id} must have a string description`);
    }

    if (!Array.isArray(node.dependsOn)) {
      throw new Error(`Node ${node.id} dependsOn must be an array`);
    }

    for (const dep of node.dependsOn) {
      if (typeof dep !== "string") {
        throw new Error(`Node ${node.id} dependsOn must contain only strings`);
      }
    }
  }

  // Second pass: validate dependency references
  for (const node of candidate.nodes) {
    for (const dep of node.dependsOn) {
      if (!nodeIds.has(dep)) {
        throw new Error(`Node ${node.id} depends on non-existent node: ${dep}`);
      }
    }
  }

  return candidate as TechTree;
}

// All nodes which are not depended on by another node
export function rootNodes(tree: TechTree): TechNode[] {
  const dependedOnIds = new Set<TechNodeId>();

  // Collect all node IDs that are dependencies
  for (const node of tree.nodes) {
    for (const dep of node.dependsOn) {
      dependedOnIds.add(dep);
    }
  }

  // Return nodes that are not depended on by any other node
  return tree.nodes.filter((node) => !dependedOnIds.has(node.id));
}

// Filter `tree` to only include nodes that are transitively depended on by root.
export function subgraph(tree: TechTree, root: TechNodeId): TechTree {
  const nodeMap = new Map<TechNodeId, TechNode>();

  // Create a map for quick node lookup
  for (const node of tree.nodes) {
    nodeMap.set(node.id, node);
  }

  // Check if root node exists
  if (!nodeMap.has(root)) {
    throw new Error(`Root node ${root} does not exist in the tree`);
  }

  const includedNodes = new Set<TechNodeId>();

  // Recursive function to collect all transitively depended nodes
  function collectDependencies(nodeId: TechNodeId): void {
    if (includedNodes.has(nodeId)) {
      return; // Already visited
    }

    const node = nodeMap.get(nodeId);
    if (!node) {
      return; // Node doesn't exist (shouldn't happen after validation)
    }

    includedNodes.add(nodeId);

    // Recursively collect dependencies
    for (const dep of node.dependsOn) {
      collectDependencies(dep);
    }
  }

  // Start collection from root
  collectDependencies(root);

  // Filter nodes to only include collected ones
  const filteredNodes = tree.nodes.filter((node) => includedNodes.has(node.id));

  return {
    nodes: filteredNodes,
  };
}

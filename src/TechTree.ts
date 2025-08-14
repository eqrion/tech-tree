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

  // All the nodes that depend on this node.
  dependedOnBy: TechNodeId[];
}

// Validate an object matches the tech tree schema. Throws an error
// if it does not.
//
// This mutates the object in place to compute the 'dependedOnBy' nodes.
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

    // We manually compute the dependedOnBy array next
  }

  // Second pass: validate dependency references
  for (const node of candidate.nodes) {
    for (const dep of node.dependsOn) {
      if (!nodeIds.has(dep)) {
        throw new Error(`Node ${node.id} depends on non-existent node: ${dep}`);
      }
    }
  }

  // Final pass: compute the dependedOnBy arrays
  for (const node of candidate.nodes) {
    node.dependedOnBy = [];
  }

  for (const node of candidate.nodes) {
    for (const dep of node.dependsOn) {
      const depNode = candidate.nodes.find((n: TechNode) => n.id === dep);
      if (depNode) {
        depNode.dependedOnBy.push(node.id);
      }
    }
  }

  return candidate as TechTree;
}

export function clone(tree: TechTree): TechTree {
  return {
    nodes: tree.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      description: node.description,
      dependsOn: [...node.dependsOn],
      dependedOnBy: [...node.dependedOnBy],
    })),
  };
}

export function canonicalize(tree: TechTree): TechTree {
  tree = clone(tree);
  tree.nodes.sort((a, b) => a.id.localeCompare(b.id));
  // Sort dependency arrays by id
  for (const node of tree.nodes) {
    node.dependsOn.sort();
    node.dependedOnBy.sort();
  }
  return tree;
}

export function updateRefsToId(
  tree: TechTree,
  previousId: TechNodeId,
  newId: TechNodeId,
) {
  for (const node of tree.nodes) {
    // Update dependsOn array
    for (let i = 0; i < node.dependsOn.length; i++) {
      if (node.dependsOn[i] === previousId) {
        node.dependsOn[i] = newId;
      }
    }

    // Update dependedOnBy array
    for (let i = 0; i < node.dependedOnBy.length; i++) {
      if (node.dependedOnBy[i] === previousId) {
        node.dependedOnBy[i] = newId;
      }
    }
  }
}

export function deleteRefsToId(tree: TechTree, id: TechNodeId) {
  for (const node of tree.nodes) {
    // Remove from dependsOn array
    node.dependsOn = node.dependsOn.filter((dep) => dep !== id);

    // Remove from dependedOnBy array
    node.dependedOnBy = node.dependedOnBy.filter((dep) => dep !== id);
  }
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

// Try to find a root node of `node`
export function findRootNodeOf(
  tree: TechTree,
  node: TechNodeId,
): TechNodeId | null {
  const visited = new Set<TechNodeId>();
  const stack: TechNodeId[] = [node];

  while (stack.length > 0) {
    const currentId = stack.pop()!;

    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    const currentNode = tree.nodes.find((n) => n.id === currentId);
    if (!currentNode) {
      continue;
    }

    // If this node isn't depended on by anyone, it's a root
    if (currentNode.dependedOnBy.length === 0) {
      return currentId;
    }

    // Add dependencies to stack to continue searching
    for (const dep of currentNode.dependedOnBy) {
      if (!visited.has(dep)) {
        stack.push(dep);
      }
    }
  }

  return null;
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

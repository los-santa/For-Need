export interface DirectedGraphEdge {
  from: string;
  to: string;
}

/**
 * Calculates the longest-path level after collapsing strongly connected
 * components. Nodes in a cycle share a level, so cyclic relations cannot keep
 * increasing each other's level indefinitely.
 */
export function calculateGraphLevels(
  nodeIds: string[],
  edges: DirectedGraphEdge[],
): Map<string, number> {
  const nodes = Array.from(new Set(nodeIds));
  const nodeSet = new Set(nodes);
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  nodes.forEach((nodeId) => {
    adjacency.set(nodeId, []);
    reverseAdjacency.set(nodeId, []);
  });

  const uniqueEdges = new Set<string>();
  edges.forEach(({ from, to }) => {
    if (!nodeSet.has(from) || !nodeSet.has(to)) return;

    const edgeKey = `${from}\u0000${to}`;
    if (uniqueEdges.has(edgeKey)) return;

    uniqueEdges.add(edgeKey);
    adjacency.get(from)!.push(to);
    reverseAdjacency.get(to)!.push(from);
  });

  // First Kosaraju pass: compute nodes in finishing order without recursion.
  const visited = new Set<string>();
  const finishingOrder: string[] = [];

  nodes.forEach((startNode) => {
    if (visited.has(startNode)) return;

    visited.add(startNode);
    const stack: Array<{ nodeId: string; nextIndex: number }> = [
      { nodeId: startNode, nextIndex: 0 },
    ];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const neighbors = adjacency.get(frame.nodeId)!;

      if (frame.nextIndex < neighbors.length) {
        const nextNode = neighbors[frame.nextIndex];
        frame.nextIndex += 1;

        if (!visited.has(nextNode)) {
          visited.add(nextNode);
          stack.push({ nodeId: nextNode, nextIndex: 0 });
        }
      } else {
        finishingOrder.push(frame.nodeId);
        stack.pop();
      }
    }
  });

  // Second pass: assign one component to every cycle (or individual node).
  const componentByNode = new Map<string, number>();
  let componentCount = 0;

  for (let index = finishingOrder.length - 1; index >= 0; index -= 1) {
    const startNode = finishingOrder[index];
    if (componentByNode.has(startNode)) continue;

    componentByNode.set(startNode, componentCount);
    const stack = [startNode];

    while (stack.length > 0) {
      const currentNode = stack.pop()!;
      reverseAdjacency.get(currentNode)!.forEach((nextNode) => {
        if (!componentByNode.has(nextNode)) {
          componentByNode.set(nextNode, componentCount);
          stack.push(nextNode);
        }
      });
    }

    componentCount += 1;
  }

  // The component graph is a DAG, so longest levels terminate deterministically.
  const componentEdges = Array.from(
    { length: componentCount },
    () => new Set<number>(),
  );
  const indegrees = Array(componentCount).fill(0) as number[];

  uniqueEdges.forEach((edgeKey) => {
    const separatorIndex = edgeKey.indexOf('\u0000');
    const from = edgeKey.slice(0, separatorIndex);
    const to = edgeKey.slice(separatorIndex + 1);
    const fromComponent = componentByNode.get(from)!;
    const toComponent = componentByNode.get(to)!;

    if (
      fromComponent !== toComponent &&
      !componentEdges[fromComponent].has(toComponent)
    ) {
      componentEdges[fromComponent].add(toComponent);
      indegrees[toComponent] += 1;
    }
  });

  const componentLevels = Array(componentCount).fill(0) as number[];
  const queue: number[] = [];
  let queueIndex = 0;

  indegrees.forEach((indegree, component) => {
    if (indegree === 0) queue.push(component);
  });

  while (queueIndex < queue.length) {
    const component = queue[queueIndex];
    queueIndex += 1;

    componentEdges[component].forEach((targetComponent) => {
      componentLevels[targetComponent] = Math.max(
        componentLevels[targetComponent],
        componentLevels[component] + 1,
      );
      indegrees[targetComponent] -= 1;

      if (indegrees[targetComponent] === 0) {
        queue.push(targetComponent);
      }
    });
  }

  return new Map(
    nodes.map((nodeId) => [
      nodeId,
      componentLevels[componentByNode.get(nodeId)!],
    ]),
  );
}

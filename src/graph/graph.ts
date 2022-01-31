import { getGraphImageUrl, saveGraphImage } from "./graphics";
import { Project } from '../projects/project'

export class Graph{
  nodes: Map<string, GraphNode>;
  edges: Array<GraphEdge>;

  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  /**
   * Adds a node to the graph. If the node alread exists,
   * the graph will not be modified.
   *
   * @param id Node ID
   * @param value Node value
   * @returns The added node
   */
  addNode(id: string, value?: Project): GraphNode {
    const node = new GraphNode(id, value);

    if (!this.hasNode(node)) {
      this.nodes.set(id, node);
    }
    return this.nodes.get(id)!;
  }

  /**
   * Adds an edge to the graph. If the edge already exists,
   * the graph will not be modified.
   *
   * @param source Source node
   * @param target Target node
   * @param value Edge value
   * @returns The added node
   */
  addEdge(
    source: string,
    target: string,
    value?: string
  ): GraphEdge {
    const sourceNode = this.addNode(source);
    const targetNode = this.addNode(target);
    const edge = new GraphEdge(sourceNode, targetNode, value);
    if (this.hasEdge(edge)) {
      return this.edges.find((e) => e.equals(edge))!;
    }
    sourceNode.addEdge(edge);
    targetNode.addEdge(edge);
    this.edges.push(edge);
    return edge;
  }

  /**
   * Checks if the graph has a node with the given ID.
   * @param id Node ID
   * @returns True if the graph has a node with the given ID, false otherwise
   */
  hasNode(id: string): boolean;

  /**
   * Checks if the graph has a given node.
   * @param node The node to check
   * @returns True if the graph has the given node, false otherwise
   */
  hasNode(node: GraphNode): boolean;

  hasNode(node: string | GraphNode): boolean {
    if (node instanceof GraphNode) {
      return !!this.nodes.get(node.id);
    }
    return !!this.nodes.get(node);
  }

  /**
   * Get the node with the given ID.
   * @param id Node ID
   * @returns True if the graph has a node with the given ID, false otherwise
   */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Checks if the graph has a given edge.
   * @param edge The edge to check
   * @returns True if the graph has the given edge, false otherwise
   */
  hasEdge(edge: GraphEdge): boolean;

  /**
   * Checks if the graph has a given edge.
   * @param source Source node
   * @param target Target node
   * @param value Edge value
   * @returns True if the graph has the given edge, false otherwise
   */
  hasEdge(
    source: string | GraphNode,
    target: string | GraphNode,
    value?: string
  ): boolean;

  hasEdge(
    arg1: string | GraphNode | GraphEdge,
    arg2?: string | GraphNode,
    arg3?: string
  ): boolean {
    if (arg1 instanceof GraphEdge) {
      return this.edges.some((e) => e.equals(arg1));
    }

    const source = arg1 instanceof GraphNode ? arg1 : this.nodes.get(arg1);
    const target = arg2 instanceof GraphNode ? arg2 : this.nodes.get(arg2!);

    if (source && target) {
      const edge = new GraphEdge(source, target, arg3);
      return this.edges.some((e) => e.equals(edge));
    }

    return false;
  }

  /**
   * Print a mermaid graph representation of the graph.
   *
   * @returns A string containing the mermaid graph representation
   */
  toString(): string {
    const nodeIdentifiers = new Map<GraphNode, number>();
    let identifier = 0;

    const getIdentifier = (node: GraphNode): string => {
      if (!nodeIdentifiers.has(node)) {
        nodeIdentifiers.set(node, ++identifier);
        return `${identifier}([${node.id}])`;
      }
      return String(nodeIdentifiers.get(node)!);
    };

    let graphStr = "graph TD\n";

    // List all the edges
    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i];
      const source = edge.source;
      const target = edge.target;
      graphStr += `  ${getIdentifier(source)}--->${getIdentifier(target)};\n`;
    }

    // List any nodes that have no edges
    const nodes = Array.from(this.nodes.values());
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!nodeIdentifiers.has(node)) {
        graphStr += `  ${getIdentifier(node)};\n`;
      }
    }

    return graphStr;
  }

  async saveImage(filePath: string): Promise<void> {
    await saveGraphImage(this.toString(), filePath);
  }

  getImageLink(): string {
    return getGraphImageUrl(this.toString())
  }
}

export class GraphNode {
  id: string;
  value?: Project;
  edges: Array<GraphEdge>;

  constructor(
    id: string,
    value?: Project,
    edges?: Array<GraphEdge>
  ) {
    this.id = id;
    this.value = value;
    this.edges = edges || [];
  }

  /**
   * Check if other node is considered equal to this instance.
   * @param other Other node instance to compare
   * @returns True if the nodes are considered equal, false otherwise
   */
  equals(other: GraphNode): boolean {
    if (!(other instanceof GraphNode)) {
      return false;
    }
    return this.id === other?.id;
  }

  /**
   * Checks if the node has a given edge.
   * @param edge The edge to check
   * @returns True if the node has the given edge, false otherwise
   */
  hasEdge(edge: GraphEdge): boolean {
    if (!(edge instanceof GraphEdge)) {
      return false;
    }
    for (let i = 0; i < this.edges.length; i++) {
      if (this.edges[i].equals(edge)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Adds an edge to the node. If the edge already exists,
   * the node will not be modified.
   *
   * @param edge The edge to add
   */
  addEdge(edge: GraphEdge): void {
    if (!(edge instanceof GraphEdge)) {
      throw new Error("edge must be an instance of GraphEdge");
    }

    if (!this.hasEdge(edge)) {
      this.edges.push(edge);
    }
  }

  /**
   * Get the list of nodes that this instance points to.
   */
  dependencies(): Array<GraphNode> {
    const dependencies = new Set<GraphNode>();
    for (let i = 0; i < this.edges.length; i++) {
      if (this.edges[i].source.equals(this)) {
        dependencies.add(this.edges[i].target);
      }
    }
    return Array.from(dependencies);
  }

  /**
   * Get the list of nodes that points to this instance.
   */
  dependees(): Array<GraphNode> {
    const dependees = new Set<GraphNode>();
    for (let i = 0; i < this.edges.length; i++) {
      if (this.edges[i].target.equals(this)) {
        dependees.add(this.edges[i].source);
      }
    }
    return Array.from(dependees);
  }

  /**
   * Get the list of nodes connected to this instance.
   */
  neighbors(): Array<GraphNode> {
    const neighbors = new Set<GraphNode>();
    for (let i = 0; i < this.edges.length; i++) {
      if (!this.edges[i].target.equals(this)) {
        neighbors.add(this.edges[i].source);
      }
    }
    return Array.from(neighbors);
  }

  transitiveDependencies(): Array<GraphNode> {
    const dependencies = new Set<GraphNode>();
    const queue = this.dependencies();
    const visited = new Set<string>();
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (!visited.has(node.id)) {
        visited.add(node.id);
        dependencies.add(node);
        queue.push(...node.dependencies());
      }
    }
    return Array.from(dependencies);
  }

}

export class GraphEdge {
  source: GraphNode;
  target: GraphNode;
  value?: string;

  constructor(source: GraphNode, target: GraphNode, value?: string) {
    this.source = source;
    this.target = target;
    this.value = value;
  }

  /**
   * Check if other edge is considered equal to this instance.
   * @param other Other edge instance to compare
   * @returns True if the edges are considered equal, false otherwise
   */
  equals(other: GraphEdge): boolean {
    if (!(other instanceof GraphEdge)) {
      return false;
    }
    return this.source.equals(other.source) && this.target.equals(other.target);
  }
}

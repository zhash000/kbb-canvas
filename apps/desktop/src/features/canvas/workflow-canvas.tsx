import React from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { NODE_LABELS, type DesktopNodeType } from "./node-types.js";

const initialNodes: Node[] = [
  { id: "n1", position: { x: 80, y: 80 }, data: { label: NODE_LABELS.script }, type: "default" },
  { id: "n2", position: { x: 340, y: 80 }, data: { label: NODE_LABELS.image }, type: "default" },
  { id: "n3", position: { x: 600, y: 80 }, data: { label: NODE_LABELS.video }, type: "default" },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "n1", target: "n2" },
  { id: "e2-3", source: "n2", target: "n3" },
];

export function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = React.useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 480, background: "#0f172a" }}>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}

export function defaultNodeTypeForCanvas(index: number): DesktopNodeType {
  const order: DesktopNodeType[] = ["script", "image", "video"];
  return order[index % order.length];
}

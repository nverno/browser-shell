
export function evaluateXpath(expr: string, node: Document | Element = document): Node[] {
  const xpe = new XPathEvaluator();
  const nsResolver = xpe.createNSResolver(
    node.ownerDocument === null
      ? (node as Document).documentElement
      : node.ownerDocument.documentElement
  );
  const result = xpe.evaluate(
    expr,
    node,
    nsResolver,
    /*rtype=*/XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  const nodes = [];
  let cur;
  while (cur = result.iterateNext())
    nodes.push(cur);
  return nodes;
}

// export function evaluateXpath(expr: string, contextNode: Node = document): Node[] {
//   const res = document.evaluate(
//     expr,
//     contextNode,
//     null,
//     XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
//     null
//   );
//   const nodes: Node[] = [];
//   for (let i = 0; i < res.snapshotLength; i++) 
//     nodes.push(res.snapshotItem(i));
//   return nodes;
// }

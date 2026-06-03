import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { StepPayload, HuffmanTreeNode } from '../../types';

interface Props { payload: StepPayload; theme: 'dark' | 'light'; }

type HNode = d3.HierarchyNode<HuffmanTreeNode>;

function buildBits(node: HuffmanTreeNode, current = '', result: Record<string, string> = {}): Record<string, string> {
  if (!node) return result;
  if (node.symbol !== undefined && node.symbol !== null && !node.left && !node.right) {
    result[node.symbol] = current || '0';
    return result;
  }
  if (node.left) buildBits(node.left, current + '0', result);
  if (node.right) buildBits(node.right, current + '1', result);
  return result;
}

export default function Step6Huffman({ payload, theme }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [hoveredBits, setHoveredBits] = useState<string | null>(null);
  const dark = theme === 'dark';

  const treeData = payload.step6_huffman_tree;
  const bits = buildBits(treeData);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svgRef.current!.parentElement!;
    const W = container.clientWidth || 640;
    const H = container.clientHeight || 420;
    const margin = { top: 30, right: 60, bottom: 20, left: 60 };

    svg.attr('width', W).attr('height', H);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const root = d3.hierarchy<HuffmanTreeNode>(treeData, (d) => {
      const children = [];
      if (d.left) children.push(d.left);
      if (d.right) children.push(d.right);
      return children.length > 0 ? children : null;
    });

    const treeLayout = d3.tree<HuffmanTreeNode>()
      .size([W - margin.left - margin.right, H - margin.top - margin.bottom]);

    treeLayout(root);

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (e) => g.attr('transform', e.transform as any));
    (svg as any).call(zoom);

    // Links
    const linkGen = d3.linkVertical<d3.HierarchyLink<HuffmanTreeNode>, d3.HierarchyPointNode<HuffmanTreeNode>>()
      .x((d: any) => d.x)
      .y((d: any) => d.y);

    g.selectAll('path.huffman-edge')
      .data(root.links())
      .join('path')
      .attr('class', 'huffman-edge')
      .attr('d', linkGen as any)
      .attr('fill', 'none')
      .attr('stroke', dark ? '#3f3f46' : '#d4d4d8')
      .attr('stroke-width', 1.5);

    // Edge labels (0/1)
    g.selectAll('text.edge-label')
      .data(root.links())
      .join('text')
      .attr('class', 'edge-label')
      .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
      .attr('y', (d: any) => (d.source.y + d.target.y) / 2 - 3)
      .attr('text-anchor', 'middle')
      .attr('font-family', '"JetBrains Mono", monospace')
      .attr('font-size', 9)
      .attr('fill', dark ? '#52525b' : '#a1a1aa')
      .text((d: any) => {
        const isLeft = d.source.data.left === d.target.data;
        return isLeft ? '0' : '1';
      });

    // Nodes
    const nodes = g.selectAll('g.huffman-node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'huffman-node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    nodes.append('circle')
      .attr('r', (d) => d.data.symbol !== undefined && !d.children ? 14 : 10)
      .attr('fill', (d) => {
        if (d.data.symbol !== undefined && !d.children) return dark ? '#1e3a5f' : '#dbeafe';
        return dark ? '#18181b' : '#ffffff';
      })
      .attr('stroke', (d) => {
        if (d.data.symbol !== undefined && !d.children) return '#3b82f6';
        return dark ? '#3f3f46' : '#d4d4d8';
      })
      .attr('stroke-width', (d) => (d.data.symbol !== undefined && !d.children ? 1.5 : 1));

    // Leaf labels (symbol)
    nodes.filter((d) => d.data.symbol !== undefined && !d.children)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-family', '"JetBrains Mono", monospace')
      .attr('font-size', 9)
      .attr('font-weight', 600)
      .attr('fill', '#60a5fa')
      .text((d) => d.data.symbol ?? '');

    // Internal node freq labels
    nodes.filter((d) => !d.data.symbol || !!d.children)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-family', '"JetBrains Mono", monospace')
      .attr('font-size', 8)
      .attr('fill', dark ? '#71717a' : '#a1a1aa')
      .text((d) => d.data.freq);

    // Hover interaction
    nodes.style('cursor', (d) => (!d.children ? 'pointer' : 'default'))
      .on('mouseenter', function (_, d) {
        if (d.data.symbol === undefined || d.children) return;
        setHoveredSymbol(d.data.symbol ?? null);
        setHoveredBits(bits[d.data.symbol ?? ''] ?? null);

        // Trace path to root
        const ancestors = new Set<HuffmanTreeNode>();
        let cur: HNode | null = d;
        while (cur) { ancestors.add(cur.data); cur = cur.parent; }

        g.selectAll('path.huffman-edge')
          .attr('stroke', (link: any) => {
            return ancestors.has(link.source.data) && ancestors.has(link.target.data)
              ? '#3b82f6'
              : (dark ? '#3f3f46' : '#d4d4d8');
          })
          .attr('stroke-width', (link: any) =>
            ancestors.has(link.source.data) && ancestors.has(link.target.data) ? 2.5 : 1.5
          );

        g.selectAll('text.edge-label')
          .attr('fill', (link: any) =>
            ancestors.has(link.source.data) && ancestors.has(link.target.data)
              ? '#60a5fa'
              : (dark ? '#52525b' : '#a1a1aa')
          )
          .attr('font-size', (link: any) =>
            ancestors.has(link.source.data) && ancestors.has(link.target.data) ? 11 : 9
          );

        d3.select(this).select('circle')
          .attr('stroke', '#f59e0b')
          .attr('fill', dark ? '#2d1f00' : '#fffbeb');
      })
      .on('mouseleave', function () {
        setHoveredSymbol(null);
        setHoveredBits(null);
        g.selectAll('path.huffman-edge')
          .attr('stroke', dark ? '#3f3f46' : '#d4d4d8')
          .attr('stroke-width', 1.5);
        g.selectAll('text.edge-label')
          .attr('fill', dark ? '#52525b' : '#a1a1aa')
          .attr('font-size', 9);
        nodes.selectAll('circle')
          .attr('stroke', (d: any) =>
            d.data.symbol !== undefined && !d.children ? '#3b82f6' : (dark ? '#3f3f46' : '#d4d4d8')
          )
          .attr('fill', (d: any) =>
            d.data.symbol !== undefined && !d.children
              ? (dark ? '#1e3a5f' : '#dbeafe')
              : (dark ? '#18181b' : '#ffffff')
          );
      });

  }, [treeData, dark, bits]);

  const bd = dark ? '#27272a' : '#e4e4e7';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%', overflow: 'hidden' }}>
      {/* Info bar */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${bd}`,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexShrink: 0,
        background: dark ? '#0d0d0f' : '#f8f8f8',
      }}>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: dark ? '#a1a1aa' : '#71717a' }}>
          Huffman Tree — {Object.keys(bits).length} symbols — hover leaf to trace
        </span>
        {hoveredSymbol !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
              padding: '2px 10px',
              background: dark ? '#2d1f00' : '#fffbeb',
              border: `1px solid #f59e0b`,
              borderRadius: 3, color: '#f59e0b',
            }}>
              sym: {hoveredSymbol}
            </span>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
              padding: '2px 10px',
              background: dark ? '#0a1929' : '#eff6ff',
              border: `1px solid #3b82f6`,
              borderRadius: 3, color: '#60a5fa',
              letterSpacing: '0.15em',
            }}>
              {hoveredBits}
            </span>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
              color: dark ? '#52525b' : '#a1a1aa',
            }}>
              {hoveredBits?.length} bits
            </span>
          </div>
        )}
        <span style={{
          marginLeft: 'auto',
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          color: dark ? '#3f3f46' : '#c4c4c8',
        }}>
          scroll: zoom · drag: pan
        </span>
      </div>

      {/* SVG tree */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <svg
          ref={svgRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>
    </div>
  );
}

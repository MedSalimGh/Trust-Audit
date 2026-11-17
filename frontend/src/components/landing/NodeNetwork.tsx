/**
 * NodeNetwork — Interactive 3D blockchain node network for the hero section.
 *
 * Uses @react-three/fiber + drei + postprocessing.
 * ~24 nodes connected by glowing edges, mouse-responsive parallax,
 * subtle bloom post-processing.
 *
 * Performance: instanced spheres, limited geometry, requestAnimationFrame
 * tied to R3F's internal loop (no extra rAFs).
 */
import { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CanvasErrorBoundary, CSSFallbackHero } from './CanvasErrorBoundary';

// ─── Types ──────────────────────────────────────────────────────────────────
interface NodeData {
  position: THREE.Vector3;
  speed: number;
  phase: number;
  radius: number;
}

interface EdgeData {
  from: number;
  to: number;
}

// ─── Generate network topology ──────────────────────────────────────────────
function generateNetwork(count: number, spread: number) {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = spread * (0.5 + Math.random() * 0.5);

    nodes.push({
      position: new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta) * 0.6, // flatten Y
        r * Math.cos(phi) * 0.5,
      ),
      speed: 0.2 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      radius: 0.04 + Math.random() * 0.06,
    });
  }

  // Connect nearby nodes (max 2 edges per node to keep it clean)
  const edgeCounts = new Array(count).fill(0);
  const maxEdgesPerNode = 3;

  for (let i = 0; i < count; i++) {
    // Sort other nodes by distance
    const distances = nodes
      .map((n, j) => ({ j, dist: nodes[i].position.distanceTo(n.position) }))
      .filter((d) => d.j !== i && d.dist < spread * 0.9)
      .sort((a, b) => a.dist - b.dist);

    for (const d of distances) {
      if (edgeCounts[i] >= maxEdgesPerNode || edgeCounts[d.j] >= maxEdgesPerNode) continue;
      // Avoid duplicate edges
      if (!edges.some((e) => (e.from === i && e.to === d.j) || (e.from === d.j && e.to === i))) {
        edges.push({ from: i, to: d.j });
        edgeCounts[i]++;
        edgeCounts[d.j]++;
      }
    }
  }

  return { nodes, edges };
}

// ─── Nodes (instanced spheres) ──────────────────────────────────────────────
function NetworkNodes({ nodes, time }: { nodes: NodeData[]; time: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const cyanColor = useMemo(() => new THREE.Color('#22d3ee'), []);
  const goldColor = useMemo(() => new THREE.Color('#facc15'), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const t = time.current;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const float = Math.sin(t * node.speed + node.phase) * 0.15;

      tempObj.position.set(
        node.position.x,
        node.position.y + float,
        node.position.z,
      );

      // Pulse scale
      const pulse = 1 + Math.sin(t * 1.5 + node.phase) * 0.2;
      const s = node.radius * pulse * 10;
      tempObj.scale.set(s, s, s);
      tempObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObj.matrix);

      // Color: mostly cyan, some gold
      const mix = i % 5 === 0 ? 0.8 : 0;
      tempColor.copy(cyanColor).lerp(goldColor, mix);
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, nodes.length]}>
      <sphereGeometry args={[0.1, 12, 12]} />
      <meshStandardMaterial
        emissive="#22d3ee"
        emissiveIntensity={2}
        toneMapped={false}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  );
}

// ─── Edges (animated lines) ─────────────────────────────────────────────────
function NetworkEdges({
  nodes,
  edges,
  time,
}: {
  nodes: NodeData[];
  edges: EdgeData[];
  time: React.MutableRefObject<number>;
}) {
  const lineRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(edges.length * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [edges.length]);

  useFrame(() => {
    if (!lineRef.current) return;
    const t = time.current;
    const posAttr = lineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const from = nodes[edge.from];
      const to = nodes[edge.to];

      const floatFrom = Math.sin(t * from.speed + from.phase) * 0.15;
      const floatTo = Math.sin(t * to.speed + to.phase) * 0.15;

      const idx = i * 6;
      arr[idx] = from.position.x;
      arr[idx + 1] = from.position.y + floatFrom;
      arr[idx + 2] = from.position.z;
      arr[idx + 3] = to.position.x;
      arr[idx + 4] = to.position.y + floatTo;
      arr[idx + 5] = to.position.z;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color="#22d3ee"
        transparent
        opacity={0.15}
        linewidth={1}
      />
    </lineSegments>
  );
}

// ─── Central glowing core ───────────────────────────────────────────────────
function CoreOrb() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const scale = 1 + Math.sin(t * 0.8) * 0.1;
    meshRef.current.scale.set(scale, scale, scale);
    meshRef.current.rotation.y = t * 0.15;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.4}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.35, 2]} />
        <meshStandardMaterial
          color="#111d3a"
          emissive="#06b6d4"
          emissiveIntensity={1.5}
          wireframe
          transparent
          opacity={0.6}
          toneMapped={false}
        />
      </mesh>
    </Float>
  );
}

// ─── Mouse-tracking camera rig ──────────────────────────────────────────────
function CameraRig() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  const handlePointerMove = useCallback((e: PointerEvent) => {
    mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  // Attach listener once
  useMemo(() => {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    // Subtle camera movement following mouse
    camera.position.x += (mouse.current.x * 0.6 - camera.position.x) * 0.02;
    camera.position.y += (mouse.current.y * 0.4 + 0.5 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── Scene ──────────────────────────────────────────────────────────────────
function Scene() {
  const timeRef = useRef(0);
  const { nodes, edges } = useMemo(() => generateNetwork(24, 3.5), []);

  useFrame((_, delta) => {
    timeRef.current += delta;
  });

  return (
    <>
      {/* Ambient + directional lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} color="#67e8f9" />
      <pointLight position={[-3, 2, -2]} intensity={0.4} color="#facc15" distance={10} />

      {/* Star field background */}
      <Stars
        radius={50}
        depth={40}
        count={1500}
        factor={3}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Network */}
      <NetworkNodes nodes={nodes} time={timeRef} />
      <NetworkEdges nodes={nodes} edges={edges} time={timeRef} />
      <CoreOrb />

      {/* Mouse parallax */}
      <CameraRig />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

// ─── Exported component ─────────────────────────────────────────────────────

/** Whether WebGL is likely available */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return gl !== null;
  } catch {
    return false;
  }
}

/** Check if reduced motion is preferred */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function NodeNetwork() {
  // Fall back to CSS for no-WebGL or reduced motion
  if (!hasWebGL() || prefersReducedMotion()) {
    return <CSSFallbackHero />;
  }

  return (
    <CanvasErrorBoundary fallback={<CSSFallbackHero />}>
      <Canvas
        camera={{ position: [0, 0.5, 5], fov: 60 }}
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <Scene />
      </Canvas>
    </CanvasErrorBoundary>
  );
}

'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ─────────────────────────────────────────────
   Config — much denser network
   ───────────────────────────────────────────── */
const LAYERS = [6, 10, 14, 10, 8, 4, 1];
const LAYER_SPACING = 4.5;
const NODE_Y_SPACING = 1.2;
const PARTICLE_COUNT = 120;
const DUST_COUNT = 80;
const CURVE_SEGMENTS = 3; // segments per curved connection

/* ─────────────────────────────────────────────
   Deterministic random
   ───────────────────────────────────────────── */
function srand(seed: number): number {
  const x = Math.sin(seed + 1.0) * 10000;
  return x - Math.floor(x);
}

/* ─────────────────────────────────────────────
   Camera keyframes — immersive dive
   ───────────────────────────────────────────── */
interface CamKF {
  t: number;
  pos: THREE.Vector3;
  target: THREE.Vector3;
}

const CAM_KF: CamKF[] = [
  { t: 0.0,  pos: new THREE.Vector3(0, 2, 36),      target: new THREE.Vector3(0, 0, 0) },
  { t: 0.12, pos: new THREE.Vector3(-4, 3, 26),     target: new THREE.Vector3(-2, 0, 0) },
  { t: 0.28, pos: new THREE.Vector3(-8, 0, 14),     target: new THREE.Vector3(-6, 0, 2) },
  { t: 0.42, pos: new THREE.Vector3(-2, -1, 8),     target: new THREE.Vector3(2, 0, 0) },
  { t: 0.56, pos: new THREE.Vector3(4, 3, 10),      target: new THREE.Vector3(3, 0, -1) },
  { t: 0.70, pos: new THREE.Vector3(8, 0, 6),       target: new THREE.Vector3(6, 0, 0) },
  { t: 0.85, pos: new THREE.Vector3(12, 1, 5),      target: new THREE.Vector3(13.5, 0, 0) },
  { t: 1.0,  pos: new THREE.Vector3(13.5, 0.3, 3),  target: new THREE.Vector3(13.5, 0, 0) },
];

function lerpCam(
  progress: number,
  out: { pos: THREE.Vector3; target: THREE.Vector3 },
) {
  const p = Math.max(0, Math.min(1, progress));
  let a = CAM_KF[0];
  let b = CAM_KF[CAM_KF.length - 1];
  for (let i = 0; i < CAM_KF.length - 1; i++) {
    if (p >= CAM_KF[i].t && p <= CAM_KF[i + 1].t) {
      a = CAM_KF[i];
      b = CAM_KF[i + 1];
      break;
    }
  }
  const range = b.t - a.t;
  const raw = range > 0 ? (p - a.t) / range : 0;
  const s = raw * raw * (3 - 2 * raw); // smoothstep
  out.pos.lerpVectors(a.pos, b.pos, s);
  out.target.lerpVectors(a.target, b.target, s);
}

/* ─────────────────────────────────────────────
   GPU Shaders — Connections (curved heatmap)
   ───────────────────────────────────────────── */
const connVert = /* glsl */ `
  attribute float aLayerProgress;
  attribute float aRand;
  varying float vLayerProgress;
  varying float vRand;

  void main() {
    vLayerProgress = aLayerProgress;
    vRand = aRand;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const connFrag = /* glsl */ `
  varying float vLayerProgress;
  varying float vRand;
  uniform float uScroll;
  uniform float uTime;
  uniform float uFocus;

  vec3 heatmap(float t) {
    vec3 darkBlue  = vec3(0.0, 0.06, 0.4);
    vec3 blue      = vec3(0.0, 0.169, 1.0);
    vec3 lightBlue = vec3(0.2, 0.45, 1.0);
    vec3 bright    = vec3(0.5, 0.7, 1.0);
    float s = clamp(t, 0.0, 1.0);
    if (s < 0.33) return mix(darkBlue, blue, s / 0.33);
    if (s < 0.66) return mix(blue, lightBlue, (s - 0.33) / 0.33);
    return mix(lightBlue, bright, (s - 0.66) / 0.34);
  }

  void main() {
    float activation = (uScroll - 0.05) * 2.5 - vLayerProgress * 0.6;
    activation = clamp(activation, 0.0, 1.0);

    // Traveling pulse wave along connections
    float wave = sin(uTime * 3.0 - vLayerProgress * 8.0 + vRand * 6.283) * 0.5 + 0.5;
    float pulse = sin(uTime * 1.5 + vLayerProgress * 6.283 + vRand * 3.14) * 0.5 + 0.5;

    vec3 color = heatmap(activation);
    float alpha = 0.04 + activation * 0.55 + pulse * 0.05 + wave * activation * 0.15;

    // Dim non-output layers when focusing
    alpha *= 1.0 - uFocus * (1.0 - vLayerProgress) * 0.8;

    gl_FragColor = vec4(color, alpha);
  }
`;

/* ─────────────────────────────────────────────
   GPU Shaders — Nodes (instanced spheres)
   ───────────────────────────────────────────── */
const nodeVert = /* glsl */ `
  attribute float aNodeLayer;
  attribute float aNodeRand;
  varying float vNodeLayer;
  varying float vNodeRand;
  varying vec3 vWorldPos;
  uniform float uTime;
  uniform float uScroll;

  void main() {
    vNodeLayer = aNodeLayer;
    vNodeRand = aNodeRand;

    // Breathing + subtle drift animation
    float breath = sin(uTime * 1.8 + aNodeLayer * 3.14 + aNodeRand * 6.28) * 0.08;
    float drift = sin(uTime * 0.7 + aNodeRand * 12.56) * 0.03;
    vec3 pos = position * (1.0 + breath);

    vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
    worldPos.y += drift;
    worldPos.x += sin(uTime * 0.5 + aNodeRand * 9.42) * 0.02;

    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * worldPos;
  }
`;

const nodeFrag = /* glsl */ `
  varying float vNodeLayer;
  varying float vNodeRand;
  varying vec3 vWorldPos;
  uniform float uScroll;
  uniform float uTime;
  uniform float uFocus;

  vec3 heatmap(float t) {
    vec3 darkBlue  = vec3(0.0, 0.06, 0.4);
    vec3 blue      = vec3(0.0, 0.169, 1.0);
    vec3 lightBlue = vec3(0.2, 0.45, 1.0);
    vec3 bright    = vec3(0.5, 0.7, 1.0);
    float s = clamp(t, 0.0, 1.0);
    if (s < 0.33) return mix(darkBlue, blue, s / 0.33);
    if (s < 0.66) return mix(blue, lightBlue, (s - 0.33) / 0.33);
    return mix(lightBlue, bright, (s - 0.66) / 0.34);
  }

  void main() {
    float activation = (uScroll - 0.05) * 2.5 - vNodeLayer * 0.6;
    activation = clamp(activation, 0.0, 1.0);

    // Per-node shimmer
    float shimmer = sin(uTime * 4.0 + vNodeRand * 25.0) * 0.15 + 0.85;

    vec3 color = heatmap(activation) * shimmer;
    float alpha = 0.3 + activation * 0.7;

    // Focus: dim everything except the output node
    float isOutput = step(0.98, vNodeLayer);
    alpha *= 1.0 - uFocus * (1.0 - isOutput) * 0.9;

    // Output glow — pulsing bright
    float glow = isOutput * uFocus * (sin(uTime * 3.0) * 0.3 + 0.7);
    color += vec3(0.0, 0.169, 1.0) * glow * 1.5;
    alpha += glow * 0.5;

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

/* ─────────────────────────────────────────────
   GPU Shaders — Ambient dust
   ───────────────────────────────────────────── */
const dustVert = /* glsl */ `
  attribute float aDustRand;
  varying float vDustRand;
  uniform float uTime;

  void main() {
    vDustRand = aDustRand;
    vec4 worldPos = instanceMatrix * vec4(position, 1.0);
    // Slow float animation
    worldPos.y += sin(uTime * 0.3 + aDustRand * 20.0) * 0.5;
    worldPos.x += cos(uTime * 0.2 + aDustRand * 15.0) * 0.3;
    worldPos.z += sin(uTime * 0.25 + aDustRand * 10.0) * 0.4;
    gl_Position = projectionMatrix * modelViewMatrix * worldPos;
  }
`;

const dustFrag = /* glsl */ `
  varying float vDustRand;
  uniform float uScroll;
  uniform float uTime;

  void main() {
    float flicker = sin(uTime * 2.0 + vDustRand * 50.0) * 0.3 + 0.7;
    float alpha = 0.04 + uScroll * 0.06;
    alpha *= flicker;
    vec3 color = vec3(0.0, 0.169, 1.0) * 0.6;
    gl_FragColor = vec4(color, alpha);
  }
`;

/* ─────────────────────────────────────────────
   Build curved connection vertices
   ───────────────────────────────────────────── */
function buildCurvedConnections(
  nodes: THREE.Vector3[][],
  layerCount: number,
) {
  const verts: number[] = [];
  const lp: number[] = [];
  const rands: number[] = [];
  const conns: { start: THREE.Vector3; end: THREE.Vector3; layerNorm: number }[] = [];

  for (let l = 0; l < nodes.length - 1; l++) {
    for (let i = 0; i < nodes[l].length; i++) {
      for (let j = 0; j < nodes[l + 1].length; j++) {
        if (srand(l * 1000 + i * 100 + j + 7) > 0.55) {
          const s = nodes[l][i];
          const e = nodes[l + 1][j];
          const layerProgress = l / (layerCount - 2);
          const r = srand(l * 500 + i * 50 + j * 3 + 13);
          conns.push({ start: s, end: e, layerNorm: layerProgress });

          // Curved connection: bezier with a control point offset
          const cx = (s.x + e.x) * 0.5;
          const cy = (s.y + e.y) * 0.5 + (r - 0.5) * 1.8;
          const cz = (s.z + e.z) * 0.5 + (srand(l * 300 + i * 30 + j + 99) - 0.5) * 2.0;

          for (let seg = 0; seg < CURVE_SEGMENTS; seg++) {
            const t0 = seg / CURVE_SEGMENTS;
            const t1 = (seg + 1) / CURVE_SEGMENTS;

            // Quadratic bezier: (1-t)²·s + 2(1-t)t·c + t²·e
            const x0 = (1 - t0) * (1 - t0) * s.x + 2 * (1 - t0) * t0 * cx + t0 * t0 * e.x;
            const y0 = (1 - t0) * (1 - t0) * s.y + 2 * (1 - t0) * t0 * cy + t0 * t0 * e.y;
            const z0 = (1 - t0) * (1 - t0) * s.z + 2 * (1 - t0) * t0 * cz + t0 * t0 * e.z;
            const x1 = (1 - t1) * (1 - t1) * s.x + 2 * (1 - t1) * t1 * cx + t1 * t1 * e.x;
            const y1 = (1 - t1) * (1 - t1) * s.y + 2 * (1 - t1) * t1 * cy + t1 * t1 * e.y;
            const z1 = (1 - t1) * (1 - t1) * s.z + 2 * (1 - t1) * t1 * cz + t1 * t1 * e.z;

            verts.push(x0, y0, z0, x1, y1, z1);
            const segLP = layerProgress + (t0 + t1) * 0.5 / (layerCount - 2);
            lp.push(segLP, segLP);
            rands.push(r, r);
          }
        }
      }
    }
  }

  return {
    verts: new Float32Array(verts),
    lp: new Float32Array(lp),
    rands: new Float32Array(rands),
    conns,
  };
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */
interface Props {
  scrollProgress: number;
}

export default function NeuralNetwork({ scrollProgress }: Props) {
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const dustRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const spRef = useRef(scrollProgress);
  spRef.current = scrollProgress;

  /* ── Build network topology ─────────────── */
  const data = useMemo(() => {
    const nodes: THREE.Vector3[][] = [];
    const flat: THREE.Vector3[] = [];
    const layerValues: number[] = [];
    const nodeRands: number[] = [];

    for (let l = 0; l < LAYERS.length; l++) {
      const col: THREE.Vector3[] = [];
      const n = LAYERS[l];
      const x = (l - (LAYERS.length - 1) / 2) * LAYER_SPACING;
      for (let i = 0; i < n; i++) {
        const y = (i - (n - 1) / 2) * NODE_Y_SPACING;
        const z = (srand(l * 100 + i * 7 + 42) - 0.5) * 3;
        const v = new THREE.Vector3(x, y, z);
        col.push(v);
        flat.push(v);
        layerValues.push(l / (LAYERS.length - 1));
        nodeRands.push(srand(l * 77 + i * 13 + 5));
      }
      nodes.push(col);
    }

    const { verts, lp, rands, conns } = buildCurvedConnections(nodes, LAYERS.length);

    // Particle assignments
    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      ci: Math.floor(srand(i * 3 + 999) * conns.length) % conns.length,
      speed: 0.08 + srand(i * 3 + 1000) * 0.35,
      offset: srand(i * 3 + 1001),
      size: 0.02 + srand(i * 3 + 1002) * 0.04,
    }));

    // Dust particle positions (spread in a volume around the network)
    const dustPositions = Array.from({ length: DUST_COUNT }, (_, i) => ({
      x: (srand(i * 7 + 2000) - 0.5) * 50,
      y: (srand(i * 7 + 2001) - 0.5) * 30,
      z: (srand(i * 7 + 2002) - 0.5) * 20,
      r: srand(i * 7 + 2003),
    }));

    return {
      nodes,
      flat,
      layerValues: new Float32Array(layerValues),
      nodeRands: new Float32Array(nodeRands),
      conns,
      verts,
      lp,
      rands,
      particles,
      dustPositions,
      total: flat.length,
    };
  }, []);

  /* ── Materials ───────────────────────────── */
  const connMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: connVert,
        fragmentShader: connFrag,
        uniforms: {
          uScroll: { value: 0 },
          uTime: { value: 0 },
          uFocus: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [],
  );

  const nodeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: nodeVert,
        fragmentShader: nodeFrag,
        uniforms: {
          uScroll: { value: 0 },
          uTime: { value: 0 },
          uFocus: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  const particleMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x002bff,
        transparent: true,
        opacity: 0.7,
        blending: THREE.NormalBlending,
        depthWrite: false,
      }),
    [],
  );

  const dustMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dustVert,
        fragmentShader: dustFrag,
        uniforms: {
          uScroll: { value: 0 },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  /* ── Geometries ──────────────────────────── */
  const connGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.verts, 3));
    g.setAttribute('aLayerProgress', new THREE.BufferAttribute(data.lp, 1));
    g.setAttribute('aRand', new THREE.BufferAttribute(data.rands, 1));
    return g;
  }, [data]);

  const nodeGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.18, 8, 8);
    g.setAttribute(
      'aNodeLayer',
      new THREE.InstancedBufferAttribute(data.layerValues, 1),
    );
    g.setAttribute(
      'aNodeRand',
      new THREE.InstancedBufferAttribute(data.nodeRands, 1),
    );
    return g;
  }, [data]);

  const particleGeo = useMemo(() => new THREE.SphereGeometry(1, 4, 4), []);

  const dustGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.06, 3, 3);
    const dustRandAttr = new Float32Array(DUST_COUNT);
    data.dustPositions.forEach((d, i) => { dustRandAttr[i] = d.r; });
    g.setAttribute('aDustRand', new THREE.InstancedBufferAttribute(dustRandAttr, 1));
    return g;
  }, [data]);

  /* ── Re-usable objects ──────────────────── */
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const camOut = useMemo(
    () => ({ pos: new THREE.Vector3(0, 2, 36), target: new THREE.Vector3() }),
    [],
  );
  const smoothPos = useMemo(() => new THREE.Vector3(0, 2, 36), []);
  const smoothTgt = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const inited = useRef(false);
  const dustInited = useRef(false);

  const outputPos = data.flat[data.flat.length - 1];

  /* ── Render loop ─────────────────────────── */
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const sp = spRef.current;
    const focus = Math.max(0, Math.min(1, (sp - 0.8) / 0.2));

    // Init node instances
    if (!inited.current && nodesRef.current) {
      data.flat.forEach((p, i) => {
        tmp.position.copy(p);
        tmp.scale.setScalar(1);
        tmp.updateMatrix();
        nodesRef.current!.setMatrixAt(i, tmp.matrix);
      });
      nodesRef.current.instanceMatrix.needsUpdate = true;
      inited.current = true;
    }

    // Init dust instances
    if (!dustInited.current && dustRef.current) {
      data.dustPositions.forEach((d, i) => {
        tmp.position.set(d.x, d.y, d.z);
        tmp.scale.setScalar(0.5 + d.r * 1.5);
        tmp.updateMatrix();
        dustRef.current!.setMatrixAt(i, tmp.matrix);
      });
      dustRef.current.instanceMatrix.needsUpdate = true;
      dustInited.current = true;
    }

    // Slow rotation of entire network
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.08) * 0.06;
      groupRef.current.rotation.x = Math.cos(t * 0.06) * 0.02;
    }

    // ── Uniforms ──
    connMat.uniforms.uScroll.value = sp;
    connMat.uniforms.uTime.value = t;
    connMat.uniforms.uFocus.value = focus;

    nodeMat.uniforms.uScroll.value = sp;
    nodeMat.uniforms.uTime.value = t;
    nodeMat.uniforms.uFocus.value = focus;

    dustMat.uniforms.uScroll.value = sp;
    dustMat.uniforms.uTime.value = t;

    // ── Particles ──
    particleMat.color.setHSL(0.63, 0.9, 0.45 + sp * 0.2);
    particleMat.opacity = 0.2 + sp * 0.6;

    if (particlesRef.current) {
      // Only update every 2nd frame for performance
      const frameIdx = Math.round(t * 60);
      if (frameIdx % 2 === 0) {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const pd = data.particles[i];
          const c = data.conns[pd.ci];
          if (!c) continue;
          const pt = ((t * pd.speed + pd.offset) % 1 + 1) % 1;
          tmp.position.lerpVectors(c.start, c.end, pt);
          const vis = sp > 0.04 ? pd.size + sp * 0.03 : 0;
          tmp.scale.setScalar(vis);
          tmp.updateMatrix();
          particlesRef.current.setMatrixAt(i, tmp.matrix);
        }
        particlesRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    // ── Output glow ──
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = focus * (Math.sin(t * 3) * 0.3 + 0.5);
      glowRef.current.scale.setScalar(0.3 + focus * 4);
    }

    // ── Camera ──
    lerpCam(sp, camOut);
    smoothPos.lerp(camOut.pos, 0.03);
    smoothTgt.lerp(camOut.target, 0.03);
    camera.position.copy(smoothPos);
    (camera as THREE.PerspectiveCamera).lookAt(smoothTgt);
  });

  return (
    <>
      <group ref={groupRef}>
        {/* Curved connection lines */}
        <lineSegments geometry={connGeo} material={connMat} />

        {/* Nodes (instanced, animated in shader) */}
        <instancedMesh
          ref={nodesRef}
          args={[nodeGeo, nodeMat, data.total]}
        />

        {/* Traveling particles */}
        <instancedMesh
          ref={particlesRef}
          args={[particleGeo, particleMat, PARTICLE_COUNT]}
        />

        {/* Output node glow */}
        <mesh
          ref={glowRef}
          position={[outputPos.x, outputPos.y, outputPos.z]}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial
            color="#002bff"
            transparent
            opacity={0}
            blending={THREE.NormalBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Ambient dust — outside the rotating group for parallax */}
      <instancedMesh
        ref={dustRef}
        args={[dustGeo, dustMat, DUST_COUNT]}
      />
    </>
  );
}

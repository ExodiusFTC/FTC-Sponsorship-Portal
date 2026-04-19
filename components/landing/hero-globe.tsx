'use client'

import { useRef, useMemo, useCallback, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─── Hardcoded FTC team hub locations (lat, lng) ─────────────────────────────
const TEAM_LOCATIONS: [number, number][] = [
  // North America
  [37.7749, -122.4194],  // San Francisco, CA
  [34.0522, -118.2437],  // Los Angeles, CA
  [30.2672, -97.7431],   // Austin, TX
  [32.7767, -96.7970],   // Dallas, TX
  [29.7604, -95.3698],   // Houston, TX
  [42.3314, -83.0458],   // Detroit, MI
  [40.7128, -74.0060],   // New York, NY
  [25.7617, -80.1918],   // Miami, FL
  [47.6062, -122.3321],  // Seattle, WA
  [33.7490, -84.3880],   // Atlanta, GA
  [39.9612, -82.9988],   // Columbus, OH
  [41.8781, -87.6298],   // Chicago, IL
  [38.9072, -77.0369],   // Washington, DC
  [35.2271, -80.8431],   // Charlotte, NC
  [39.7392, -104.9903],  // Denver, CO
  [33.4484, -112.0740],  // Phoenix, AZ
  [36.1627, -86.7816],   // Nashville, TN
  [45.5152, -122.6784],  // Portland, OR
  [44.9778, -93.2650],   // Minneapolis, MN
  [43.6532, -79.3832],   // Toronto, Canada
  [51.0447, -114.0719],  // Calgary, Canada
  [45.5017, -73.5673],   // Montreal, Canada

  // International
  [32.0853, 34.7818],    // Tel Aviv, Israel
  [51.5074, -0.1278],    // London, UK
  [19.0760, 72.8777],    // Mumbai, India
  [28.6139, 77.2090],    // New Delhi, India
  [12.9716, 77.5946],    // Bangalore, India
  [39.9042, 116.4074],   // Beijing, China
  [31.2304, 121.4737],   // Shanghai, China
  [-33.8688, 151.2093],  // Sydney, Australia
  [-23.5505, -46.6333],  // São Paulo, Brazil
  [37.5665, 126.9780],   // Seoul, South Korea
  [35.6762, 139.6503],   // Tokyo, Japan
  [52.5200, 13.4050],    // Berlin, Germany
  [48.8566, 2.3522],     // Paris, France
  [55.7558, 37.6173],    // Moscow, Russia
  [-1.2921, 36.8219],    // Nairobi, Kenya
  [1.3521, 103.8198],    // Singapore
]

// ─── Color constants (indigo accent) ─────────────────────────────────────────
const INDIGO_400 = new THREE.Color(0x818cf8)
const INDIGO_500 = new THREE.Color(0x6366f1)
const INDIGO_300 = new THREE.Color(0xa5b4fc)
const INDIGO_200 = new THREE.Color(0xc7d2fe)

// ─── Utility: lat/lng to 3D position on sphere ──────────────────────────────
function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// ─── Generate a curved arc between two points ───────────────────────────────
function createArcCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  arcHeight: number
): THREE.CubicBezierCurve3 {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  mid.normalize().multiplyScalar(radius + arcHeight)

  // Create control points for a smooth bezier
  const ctrl1 = new THREE.Vector3().lerpVectors(start, mid, 0.33)
  ctrl1.normalize().multiplyScalar(radius + arcHeight * 0.6)
  const ctrl2 = new THREE.Vector3().lerpVectors(end, mid, 0.33)
  ctrl2.normalize().multiplyScalar(radius + arcHeight * 0.6)

  return new THREE.CubicBezierCurve3(start, ctrl1, ctrl2, end)
}

// ─── Globe wireframe sphere ─────────────────────────────────────────────────
function GlobeWireframe() {
  const meshRef = useRef<THREE.LineSegments>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(2.4, 6)
    const wireGeo = new THREE.WireframeGeometry(geo)
    return wireGeo
  }, [])

  return (
    <lineSegments ref={meshRef} geometry={geometry}>
      <lineBasicMaterial
        color={INDIGO_400}
        transparent
        opacity={0.12}
        depthWrite={false}
      />
    </lineSegments>
  )
}

// ─── Second layer: latitude/longitude grid lines ────────────────────────────
function GlobeGrid() {
  const gridLines = useMemo(() => {
    const lines: THREE.BufferGeometry[] = []
    const radius = 2.42

    // Latitude lines (every 30 degrees)
    for (let lat = -60; lat <= 60; lat += 30) {
      const points: THREE.Vector3[] = []
      for (let lng = 0; lng <= 360; lng += 3) {
        points.push(latLngToVec3(lat, lng, radius))
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      lines.push(geo)
    }

    // Longitude lines (every 30 degrees)
    for (let lng = 0; lng < 360; lng += 30) {
      const points: THREE.Vector3[] = []
      for (let lat = -90; lat <= 90; lat += 3) {
        points.push(latLngToVec3(lat, lng, radius))
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      lines.push(geo)
    }

    return lines
  }, [])

  return (
    <group>
      {gridLines.map((geo, i) => {
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
          color: INDIGO_400,
          transparent: true,
          opacity: 0.1,
          depthWrite: false,
        }))
        return <primitive key={i} object={line} />
      })}
    </group>
  )
}

// ─── Team dots on the globe surface ─────────────────────────────────────────
function TeamDots() {
  const instancedRef = useRef<THREE.InstancedMesh>(null)
  const glowRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const positions = useMemo(
    () => TEAM_LOCATIONS.map(([lat, lng]) => latLngToVec3(lat, lng, 2.42)),
    []
  )

  useEffect(() => {
    if (!instancedRef.current || !glowRef.current) return
    positions.forEach((pos, i) => {
      dummy.position.copy(pos)
      dummy.lookAt(0, 0, 0)
      dummy.updateMatrix()
      instancedRef.current!.setMatrixAt(i, dummy.matrix)
      glowRef.current!.setMatrixAt(i, dummy.matrix)
    })
    instancedRef.current.instanceMatrix.needsUpdate = true
    glowRef.current.instanceMatrix.needsUpdate = true
  }, [positions, dummy])

  // Pulsing glow animation
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (materialRef.current) {
      const t = clock.getElapsedTime()
      materialRef.current.opacity = 0.15 + Math.sin(t * 1.5) * 0.08
    }
  })

  return (
    <group>
      {/* Core dots */}
      <instancedMesh ref={instancedRef} args={[undefined, undefined, positions.length]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={INDIGO_200} />
      </instancedMesh>
      {/* Glow halos */}
      <instancedMesh ref={glowRef} args={[undefined, undefined, positions.length]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial
          ref={materialRef}
          color={INDIGO_400}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  )
}

// ─── Single animated arc with traveling pulse ───────────────────────────────
interface ArcData {
  curve: THREE.CubicBezierCurve3
  startTime: number
  duration: number
  fromIdx: number
  toIdx: number
}

function AnimatedArcs() {
  const groupRef = useRef<THREE.Group>(null)
  const [arcs, setArcs] = useState<ArcData[]>([])
  const arcMeshRefs = useRef<(THREE.Mesh | null)[]>([])
  const pulseRefs = useRef<(THREE.Mesh | null)[]>([])

  const positions = useMemo(
    () => TEAM_LOCATIONS.map(([lat, lng]) => latLngToVec3(lat, lng, 2.42)),
    []
  )

  // Generate random arcs on a staggered cycle
  const spawnArc = useCallback(() => {
    const fromIdx = Math.floor(Math.random() * positions.length)
    let toIdx = Math.floor(Math.random() * positions.length)
    while (toIdx === fromIdx) toIdx = Math.floor(Math.random() * positions.length)

    const start = positions[fromIdx]
    const end = positions[toIdx]
    const distance = start.distanceTo(end)
    const arcHeight = Math.max(0.3, distance * 0.35)

    return {
      curve: createArcCurve(start, end, 2.42, arcHeight),
      startTime: performance.now() / 1000,
      duration: 2.5 + Math.random() * 2,
      fromIdx,
      toIdx,
    }
  }, [positions])

  // Initialize arcs with staggered starts
  useEffect(() => {
    const initial: ArcData[] = []
    const now = performance.now() / 1000
    for (let i = 0; i < 6; i++) {
      const arc = spawnArc()
      arc.startTime = now - (i * 0.7) // Stagger
      initial.push(arc)
    }
    setArcs(initial)
  }, [spawnArc])

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime()

    arcs.forEach((arc, i) => {
      const elapsed = now - arc.startTime
      const progress = elapsed / arc.duration

      // Respawn arc if complete
      if (progress > 1.3) {
        const newArc = spawnArc()
        newArc.startTime = now
        setArcs(prev => {
          const next = [...prev]
          next[i] = newArc
          return next
        })
        return
      }

      // Update arc line (draw-on effect)
      const arcMesh = arcMeshRefs.current[i]
      if (arcMesh) {
        const drawProgress = Math.min(progress / 0.6, 1) // Draw completes at 60% of duration
        const fadeProgress = progress > 0.8 ? (progress - 0.8) / 0.5 : 0
        const numPoints = Math.max(2, Math.floor(drawProgress * 64))
        const points = arc.curve.getPoints(numPoints)
        const geo = new THREE.BufferGeometry().setFromPoints(points)
        arcMesh.geometry.dispose()
        arcMesh.geometry = geo
        const mat = arcMesh.material as THREE.LineBasicMaterial
        mat.opacity = Math.max(0, 0.6 - fadeProgress * 0.6)
      }

      // Update pulse particle
      const pulse = pulseRefs.current[i]
      if (pulse) {
        const pulseT = Math.min(progress / 0.7, 1) // Pulse completes at 70%
        if (pulseT <= 1 && progress < 1.0) {
          const pos = arc.curve.getPointAt(pulseT)
          pulse.position.copy(pos)
          pulse.visible = true
          const pulseMat = pulse.material as THREE.MeshBasicMaterial
          const fadeOut = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1
          pulseMat.opacity = Math.max(0, 0.9 * fadeOut)
          // Pulse size
          const s = 0.03 + Math.sin(pulseT * Math.PI) * 0.02
          pulse.scale.setScalar(s / 0.04)
        } else {
          pulse.visible = false
        }
      }
    })
  })

  return (
    <group ref={groupRef}>
      {arcs.map((arc, i) => (
        <group key={`arc-${i}`}>
          {/* Arc line */}
          <primitive
            key={`arc-line-${i}`}
            object={new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(arc.curve.getPoints(64)),
              new THREE.LineBasicMaterial({
                color: INDIGO_400,
                transparent: true,
                opacity: 0.6,
                depthWrite: false,
              })
            )}
            ref={(ref: any) => { arcMeshRefs.current[i] = ref }}
          />
          {/* Traveling pulse */}
          <mesh
            ref={(ref: any) => { pulseRefs.current[i] = ref }}
          >
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial
              color={INDIGO_200}
              transparent
              opacity={0.9}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── Atmosphere glow ring ───────────────────────────────────────────────────
function Atmosphere() {
  const uniforms = useMemo(
    () => ({
      uColor: { value: INDIGO_500 },
    }),
    []
  )

  const vertexShader = `
    varying vec3 vWorldNormal;
    varying vec3 vViewDir;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `

  const fragmentShader = `
    uniform vec3 uColor;
    varying vec3 vWorldNormal;
    varying vec3 vViewDir;
    void main() {
      float fresnel = 1.0 - max(0.0, dot(vWorldNormal, vViewDir));
      float glow = pow(fresnel, 4.0) * 0.7;
      gl_FragColor = vec4(uColor, glow);
    }
  `

  return (
    <mesh scale={[2.65, 2.65, 2.65]}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.FrontSide}
        depthWrite={false}
      />
    </mesh>
  )
}

// ─── Inner subtle glow sphere ───────────────────────────────────────────────
function InnerGlow() {
  return (
    <mesh scale={[2.4, 2.4, 2.4]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color={INDIGO_500}
        transparent
        opacity={0.015}
        side={THREE.FrontSide}
        depthWrite={false}
      />
    </mesh>
  )
}

// ─── Main globe scene with auto-rotation and drag ───────────────────────────
function GlobeScene() {
  const groupRef = useRef<THREE.Group>(null)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const velocity = useRef({ x: 0, y: 0 })
  const lastInteraction = useRef(0)
  const { gl } = useThree()

  const AUTO_ROTATE_SPEED = 0.0015
  const DRAG_SENSITIVITY = 0.005
  const DAMPING = 0.95
  const RESUME_DELAY = 3 // seconds

  const onPointerDown = useCallback((e: PointerEvent) => {
    isDragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
    velocity.current = { x: 0, y: 0 }
    gl.domElement.style.cursor = 'grabbing'
  }, [gl])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    velocity.current = { x: dx * DRAG_SENSITIVITY, y: dy * DRAG_SENSITIVITY }
    lastMouse.current = { x: e.clientX, y: e.clientY }
    lastInteraction.current = performance.now() / 1000
  }, [])

  const onPointerUp = useCallback(() => {
    isDragging.current = false
    gl.domElement.style.cursor = 'grab'
    lastInteraction.current = performance.now() / 1000
  }, [gl])

  useEffect(() => {
    const el = gl.domElement
    el.style.cursor = 'grab'
    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [gl, onPointerDown, onPointerMove, onPointerUp])

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    const now = clock.getElapsedTime()
    const sinceInteraction = now - lastInteraction.current

    // Auto-rotation (resumes after delay)
    if (sinceInteraction > RESUME_DELAY && !isDragging.current) {
      // Smoothly blend back to auto-rotation
      const blend = Math.min((sinceInteraction - RESUME_DELAY) / 2, 1)
      groupRef.current.rotation.y += AUTO_ROTATE_SPEED * blend
      velocity.current.x *= 0.9
      velocity.current.y *= 0.9
    }

    // Apply drag velocity with damping
    if (Math.abs(velocity.current.x) > 0.0001 || Math.abs(velocity.current.y) > 0.0001) {
      groupRef.current.rotation.y += velocity.current.x
      groupRef.current.rotation.x += velocity.current.y
      // Clamp vertical rotation
      groupRef.current.rotation.x = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, groupRef.current.rotation.x)
      )
      if (!isDragging.current) {
        velocity.current.x *= DAMPING
        velocity.current.y *= DAMPING
      }
    }
  })

  return (
    <group rotation={[0.25, 0, 0.08]}>
      <group ref={groupRef}>
        <GlobeWireframe />
        <GlobeGrid />
        <TeamDots />
        <AnimatedArcs />
      </group>
    </group>
  )
}

// ─── Exported component ─────────────────────────────────────────────────────
export function HeroGlobe({ className }: { className?: string }) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <GlobeScene />
        <Atmosphere />
      </Canvas>
    </div>
  )
}

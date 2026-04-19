"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
}

// [lng, lat] format
const HUB_LOCATIONS: [number, number][] = [
  // North America
  [-73.7781, 40.6413],   // JFK (New York)
  [-122.3748, 37.6189],  // SFO (San Francisco)
  [-99.0721, 19.4361],   // MEX (Mexico City)
  [-87.9073, 41.9742],   // ORD (Chicago)
  [-79.6248, 43.6777],   // YYZ (Toronto)
  [-123.1848, 49.1967],  // YVR (Vancouver)
  [-104.6737, 39.8561],  // DEN (Denver)
  [-97.2397, 49.9100],   // YWG (Winnipeg)
  [-51.6789, 64.1909],   // GOH (Nuuk, Greenland)
  // South America
  [-46.4731, -23.4356],  // GRU (Sao Paulo)
  [-58.5350, -34.8222],  // EZE (Buenos Aires)
  [-77.1120, -12.0219],  // LIM (Lima)
  [-74.1447, 4.7016],    // BOG (Bogota)
  [-70.7944, -33.3930],  // SCL (Santiago)
  // Europe
  [-0.4543, 51.4700],    // LHR (London)
  [2.5479, 49.0097],     // CDG (Paris)
  [13.5033, 52.3667],    // BER (Berlin)
  [-3.5672, 40.4839],    // MAD (Madrid)
  [12.2389, 41.8003],    // FCO (Rome)
  [28.7444, 41.2751],    // IST (Istanbul)
  // Asia
  [139.7798, 35.5494],   // HND (Tokyo)
  [103.9915, 1.3644],    // SIN (Singapore)
  [55.3644, 25.2532],    // DXB (Dubai)
  [72.8656, 19.0887],    // BOM (Mumbai)
  [114.1674, 22.3193],   // HKG (Hong Kong)
  [126.4407, 37.4602],   // ICN (Seoul)
  [100.7501, 13.6895],   // BKK (Bangkok)
  [116.5847, 40.0799],   // PEK (Beijing)
  [77.1025, 28.5562],    // DEL (New Delhi)
  [132.1480, 43.3990],   // VVO (Vladivostok)
  [103.9470, 30.5785],   // CTU (Chengdu)
  // Africa
  [31.4117, 30.1219],    // CAI (Cairo)
  [28.2460, -26.1367],   // JNB (Johannesburg)
  [38.7993, 8.9773],     // ADD (Addis Ababa)
  [36.9257, -1.3191],    // NBO (Nairobi)
  [3.3214, 6.5774],      // LOS (Lagos)
  [-7.5898, 33.3675],    // CMN (Casablanca)
  // Oceania
  [151.1772, -33.9399],  // SYD (Sydney)
  [144.8433, -37.6690],  // MEL (Melbourne)
  [174.7917, -37.0081],  // AKL (Auckland)
  [115.9669, -31.9403],  // PER (Perth)
]

const REALISTIC_ROUTES: [number, number][][] = [
  [[-73.7781, 40.6413], [-0.4543, 51.4700]],   // JFK -> LHR
  [[-46.4731, -23.4356], [2.5479, 49.0097]],   // GRU -> CDG
  [[-7.5898, 33.3675], [-73.7781, 40.6413]],   // CMN -> JFK
  [[-3.5672, 40.4839], [-99.0721, 19.4361]],   // MAD -> MEX
  [[-70.7944, -33.3930], [-3.5672, 40.4839]],  // SCL -> MAD
  [[-73.7781, 40.6413], [-46.4731, -23.4356]], // JFK -> GRU
  [[-122.3748, 37.6189], [-99.0721, 19.4361]], // SFO -> MEX
  [[-79.6248, 43.6777], [-74.1447, 4.7016]],   // YYZ -> BOG
  [[-74.1447, 4.7016], [-77.1120, -12.0219]],  // BOG -> LIM
  [[-77.1120, -12.0219], [-70.7944, -33.3930]],// LIM -> SCL
  [[-58.5350, -34.8222], [-46.4731, -23.4356]],// EZE -> GRU
  [[-0.4543, 51.4700], [28.2460, -26.1367]],   // LHR -> JNB
  [[2.5479, 49.0097], [3.3214, 6.5774]],       // CDG -> LOS
  [[31.4117, 30.1219], [55.3644, 25.2532]],    // CAI -> DXB
  [[38.7993, 8.9773], [72.8656, 19.0887]],     // ADD -> BOM
  [[36.9257, -1.3191], [38.7993, 8.9773]],     // NBO -> ADD
  [[12.2389, 41.8003], [31.4117, 30.1219]],    // FCO -> CAI
  [[103.9915, 1.3644], [151.1772, -33.9399]],  // SIN -> SYD
  [[115.9669, -31.9403], [55.3644, 25.2532]],  // PER -> DXB
  [[151.1772, -33.9399], [174.7917, -37.0081]],// SYD -> AKL
  [[144.8433, -37.6690], [151.1772, -33.9399]],// MEL -> SYD
  [[28.2460, -26.1367], [103.9915, 1.3644]],   // JNB -> SIN
  [[55.3644, 25.2532], [-0.4543, 51.4700]],    // DXB -> LHR
  [[55.3644, 25.2532], [139.7798, 35.5494]],   // DXB -> HND
  [[116.5847, 40.0799], [139.7798, 35.5494]],  // PEK -> HND
  [[116.5847, 40.0799], [-0.4543, 51.4700]],   // PEK -> LHR
  [[77.1025, 28.5562], [55.3644, 25.2532]],    // DEL -> DXB
  [[77.1025, 28.5562], [72.8656, 19.0887]],    // DEL -> BOM
  [[132.1480, 43.3990], [139.7798, 35.5494]],  // VVO -> HND
  [[132.1480, 43.3990], [116.5847, 40.0799]],  // VVO -> PEK
  [[103.9470, 30.5785], [116.5847, 40.0799]],  // CTU -> PEK
  [[103.9470, 30.5785], [114.1674, 22.3193]],  // CTU -> HKG
  [[103.9470, 30.5785], [100.7501, 13.6895]],  // CTU -> BKK
  [[139.7798, 35.5494], [126.4407, 37.4602]],  // HND -> ICN
  [[103.9915, 1.3644], [114.1674, 22.3193]],   // SIN -> HKG
  [[100.7501, 13.6895], [103.9915, 1.3644]],   // BKK -> SIN
  [[72.8656, 19.0887], [103.9915, 1.3644]],    // BOM -> SIN
  [[28.7444, 41.2751], [13.5033, 52.3667]],    // IST -> BER
  [[126.4407, 37.4602], [28.7444, 41.2751]],   // ICN -> IST
  [[-122.3748, 37.6189], [139.7798, 35.5494]], // SFO -> HND
  [[-123.1848, 49.1967], [114.1674, 22.3193]], // YVR -> HKG
  [[151.1772, -33.9399], [139.7798, 35.5494]], // SYD -> HND
  [[-87.9073, 41.9742], [-73.7781, 40.6413]],  // ORD -> JFK
  [[-122.3748, 37.6189], [-104.6737, 39.8561]], // SFO -> DEN
  [[-104.6737, 39.8561], [-87.9073, 41.9742]],  // DEN -> ORD
  [[-104.6737, 39.8561], [-99.0721, 19.4361]],  // DEN -> MEX
  [[-97.2397, 49.9100], [-51.6789, 64.1909]],   // YWG -> GOH
  [[-97.2397, 49.9100], [-87.9073, 41.9742]],   // YWG -> ORD
  [[-51.6789, 64.1909], [-0.4543, 51.4700]],    // GOH -> LHR
  [[-122.3748, 37.6189], [-87.9073, 41.9742]], // SFO -> ORD
  [[13.5033, 52.3667], [-0.4543, 51.4700]],    // BER -> LHR
]


const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

const pointInFeature = (point: [number, number], feature: any): boolean => {
  const geometry = feature.geometry
  if (geometry.type === "Polygon") {
    const coordinates = geometry.coordinates
    if (!pointInPolygon(point, coordinates[0])) return false
    for (let i = 1; i < coordinates.length; i++) {
      if (pointInPolygon(point, coordinates[i])) return false
    }
    return true
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      if (pointInPolygon(point, polygon[0])) {
        let inHole = false
        for (let i = 1; i < polygon.length; i++) {
          if (pointInPolygon(point, polygon[i])) {
            inHole = true
            break
          }
        }
        if (!inHole) return true
      }
    }
    return false
  }
  return false
}

const generateDotsInPolygon = (feature: any, dotSpacing = 16) => {
  const dots: [number, number][] = []
  const bounds = d3.geoBounds(feature)
  const [[minLng, minLat], [maxLng, maxLat]] = bounds
  const stepSize = dotSpacing * 0.08
  for (let lng = minLng; lng <= maxLng; lng += stepSize) {
    for (let lat = minLat; lat <= maxLat; lat += stepSize) {
      const point: [number, number] = [lng, lat]
      if (pointInFeature(point, feature)) {
        dots.push(point)
      }
    }
  }
  return dots
}

export default function RotatingEarth({ className = "" }: RotatingEarthProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dimensions = useRef({ width: 800, height: 800 })
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const landFeaturesRef = useRef<any>(null)
  const allDotsRef = useRef<{ lng: number; lat: number; visible: boolean }[]>([])
  const connectionsRef = useRef<[number, number][][]>([])
  const projectionRef = useRef<any>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const timeRef = useRef(0)
  const themeColorsRef = useRef({ accent: '#94a3b8' })

  // 1. Listen for theme changes
  useEffect(() => {
    const updateColors = () => {
      const isDark = document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') !== 'light'
      setTheme(isDark ? 'dark' : 'light')

      // Update cached colors
      const accent = window.getComputedStyle(document.documentElement).getPropertyValue('--accent-globe').trim() || '#94a3b8'
      themeColorsRef.current = { accent }
    }

    const observer = new MutationObserver(updateColors)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })

    updateColors()
    return () => observer.disconnect()
  }, [])

  // 2. Initialize data (Mount only)
  useEffect(() => {
    const loadWorldData = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
        )
        if (!response.ok) throw new Error("Failed to load land data")
        const data = await response.json()
        landFeaturesRef.current = data

        // WORKER IMPLEMENTATION
        const workerCode = `
          const pointInPolygon = (point, polygon) => {
            const [x, y] = point;
            let inside = false;
            for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
              const [xi, yi] = polygon[i];
              const [xj, yj] = polygon[j];
              if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
                inside = !inside;
              }
            }
            return inside;
          };

          const pointInFeature = (point, feature) => {
            const geometry = feature.geometry;
            if (geometry.type === "Polygon") {
              const coordinates = geometry.coordinates;
              if (!pointInPolygon(point, coordinates[0])) return false;
              for (let i = 1; i < coordinates.length; i++) {
                if (pointInPolygon(point, coordinates[i])) return false;
              }
              return true;
            } else if (geometry.type === "MultiPolygon") {
              for (const polygon of geometry.coordinates) {
                if (pointInPolygon(point, polygon[0])) {
                  let inHole = false;
                  for (let i = 1; i < polygon.length; i++) {
                    if (pointInPolygon(point, polygon[i])) {
                      inHole = true;
                      break;
                    }
                  }
                  if (!inHole) return true;
                }
              }
              return false;
            }
            return false;
          };

          const getBounds = (feature) => {
            let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
            const loop = (coords) => {
              if (typeof coords[0] === 'number') {
                const [lng, lat] = coords;
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
              } else {
                coords.forEach(loop);
              }
            };
            loop(feature.geometry.coordinates);
            return [[minLng, minLat], [maxLng, maxLat]];
          };

          const generateDotsInPolygon = (feature, dotSpacing = 20) => {
            const dots = [];
            const [[minLng, minLat], [maxLng, maxLat]] = getBounds(feature);
            const stepSize = dotSpacing * 0.08;
            for (let lng = minLng; lng <= maxLng; lng += stepSize) {
              for (let lat = minLat; lat <= maxLat; lat += stepSize) {
                if (pointInFeature([lng, lat], feature)) {
                  dots.push({ lng, lat, visible: true });
                }
              }
            }
            return dots;
          };

          self.onmessage = (e) => {
            const data = e.data;
            const dots = [];
            const features = data.features;
            
            for (let i = 0; i < features.length; i++) {
              const generated = generateDotsInPolygon(features[i], 20);
              dots.push(...generated);
              self.postMessage({ type: 'progress', progress: Math.round(((i + 1) / features.length) * 100) });
            }
            
            self.postMessage({ type: 'result', dots });
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));

        worker.onmessage = (e) => {
          if (e.data.type === 'progress') {
            window.dispatchEvent(new CustomEvent('globe-progress', { detail: e.data.progress }));
          } else if (e.data.type === 'result') {
            allDotsRef.current = e.data.dots;
            setIsDataLoaded(true);
            window.dispatchEvent(new CustomEvent('globe-progress', { detail: 100 }));
            window.dispatchEvent(new CustomEvent('globe-ready'));
            worker.terminate();
          }
        };

        worker.postMessage(data);

        const conns: [number, number][][] = []
        
        // Use curated realistic routes
        REALISTIC_ROUTES.forEach(([from, to]) => {
          const interpolator = d3.geoInterpolate(from, to)
          const segments: [number, number][] = []
          const numSegments = 15
          for (let s = 0; s <= numSegments; s++) {
            segments.push(interpolator(s / numSegments))
          }
          conns.push(segments)
        })

        connectionsRef.current = conns


      } catch (err) {
        setError("Failed to load land map data")
      }
    }
    loadWorldData()
  }, [])

  // 3. Setup Canvas and Animation (Mount only)
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return
    contextRef.current = context

    const updateDimensions = () => {
      if (containerRef.current) {
        dimensions.current = {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        }
      }
    }
    updateDimensions()

    const { width, height } = dimensions.current
    const radius = Math.min(width, height) / 2.5
    const dpr = window.devicePixelRatio || 1

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.scale(dpr, dpr)

    const projection = d3.geoOrthographic().scale(radius).translate([width / 2, height / 2]).clipAngle(90)
    projectionRef.current = projection

    const path = d3.geoPath().projection(projection).context(context)

    const hexToRgba = (hex: string, alpha: number) => {
      if (!hex.startsWith('#')) return hex
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    const render = () => {
      if (!contextRef.current || !projectionRef.current) return
      const ctx = contextRef.current
      const proj = projectionRef.current

      timeRef.current += 1
      ctx.clearRect(0, 0, dimensions.current.width, dimensions.current.height)

      const currentScale = proj.scale()
      const scaleFactor = currentScale / radius

      const ACCENT_COLOR = themeColorsRef.current.accent

      if (landFeaturesRef.current) {
        // 1. Graticule
        ctx.beginPath()
        path(d3.geoGraticule()())
        ctx.strokeStyle = hexToRgba(ACCENT_COLOR, 0.1)
        ctx.lineWidth = 0.5 * scaleFactor
        ctx.stroke()

        // 2. Land Outline
        ctx.beginPath()
        landFeaturesRef.current.features.forEach((feature: any) => { path(feature) })
        ctx.strokeStyle = hexToRgba(ACCENT_COLOR, 0.15)
        ctx.lineWidth = 1 * scaleFactor
        ctx.stroke()

        // 3. Dots - BATCHED for performance
        ctx.fillStyle = hexToRgba(ACCENT_COLOR, 0.35)
        ctx.beginPath()
        const dotSize = 1.0 * scaleFactor
        const dots = allDotsRef.current
        for (let i = 0; i < dots.length; i++) {
          const dot = dots[i]
          const p = proj([dot.lng, dot.lat])
          if (p && p[0] >= 0 && p[0] <= dimensions.current.width && p[1] >= 0 && p[1] <= dimensions.current.height) {
            // Using rect is much faster than arc for thousands of points
            ctx.moveTo(p[0], p[1])
            ctx.rect(p[0] - dotSize / 2, p[1] - dotSize / 2, dotSize, dotSize)
          }
        }
        ctx.fill()

        // 4. Connection Lines (Dashed Great Circles)
        ctx.strokeStyle = ACCENT_COLOR
        ctx.lineWidth = 1.0 * scaleFactor
        connectionsRef.current.forEach((sepments) => {
          ctx.beginPath()
          path({ type: 'LineString', coordinates: sepments })
          ctx.setLineDash([4 * scaleFactor, 6 * scaleFactor])
          ctx.lineDashOffset = -timeRef.current * 0.4
          ctx.stroke()
        })
        ctx.setLineDash([])

        // 5. Hubs
        path.pointRadius(3 * scaleFactor)
        ctx.fillStyle = ACCENT_COLOR
        ctx.beginPath()
        HUB_LOCATIONS.forEach((hub) => { path({ type: 'Point', coordinates: hub }) })
        ctx.fill()

        path.pointRadius(6 * scaleFactor)
        ctx.fillStyle = hexToRgba(ACCENT_COLOR, 0.2)
        ctx.beginPath()
        HUB_LOCATIONS.forEach((hub) => { path({ type: 'Point', coordinates: hub }) })
        ctx.fill()
      }
    }

    const rotation: [number, number, number] = [0, -15, 0]
    let autoRotate = true
    const rotationSpeed = 0.5

    const rotate = () => {
      if (autoRotate && projectionRef.current) {
        rotation[0] += rotationSpeed
        projectionRef.current.rotate(rotation)
        render()
      }
    }

    const rotationTimer = d3.timer(rotate)

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false
      const startX = event.clientX
      const startY = event.clientY
      const startRotation = [...rotation]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.5
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = startRotation[1] - dy * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]))
        if (projectionRef.current) {
          projectionRef.current.rotate(rotation)
          render()
        }
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        setTimeout(() => { autoRotate = true }, 10)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    canvas.addEventListener("mousedown", handleMouseDown)

    const handleResize = () => {
      if (!containerRef.current || !projectionRef.current) return
      const nw = containerRef.current.offsetWidth
      const nh = containerRef.current.offsetHeight
      if (nw === dimensions.current.width && nh === dimensions.current.height) return

      dimensions.current = { width: nw, height: nh }
      const nr = Math.min(nw, nh) / 2.5
      canvas.width = nw * dpr
      canvas.height = nh * dpr
      canvas.style.width = `${nw}px`
      canvas.style.height = `${nh}px`
      context.scale(dpr, dpr)
      projectionRef.current.scale(nr).translate([nw / 2, nh / 2])
      render()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-card border border-border rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Error loading Earth visualization</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden flex items-center justify-center transition-opacity duration-1000 ${isDataLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-transparent cursor-grab active:cursor-grabbing"
        style={{ display: "block" }}
      />
    </div>
  )
}

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
  [-122.4194, 37.7749], // SF
  [-74.0060, 40.7128],  // NY
  [-0.1278, 51.5074],   // London
  [139.6503, 35.6762],  // Tokyo
  [151.2093, -33.8688], // Sydney
  [-46.6333, -23.5505], // Sao Paulo
  [34.7818, 32.0853],   // Tel Aviv
  [103.8198, 1.3521],   // Singapore
  [77.2090, 28.6139],   // New Delhi
  [2.3522, 48.8566],    // Paris
  [37.6173, 55.7558],   // Moscow
  [-118.2437, 34.0522], // LA
  [-87.6298, 41.8781],  // Chicago
  [116.4074, 39.9042],  // Beijing
  [-95.3698, 29.7604],  // Houston
  [-80.1918, 25.7617],  // Miami
  [3.3792, 6.5244],     // Lagos, Nigeria
  [36.8219, -1.2921],   // Nairobi, Kenya
  [28.0473, -26.2041],  // Johannesburg, SA
  [-58.3816, -34.6037], // Buenos Aires, Argentina
  [-77.0428, -12.0464], // Lima, Peru
  [-70.6483, -33.4489], // Santiago, Chile
  [-43.1729, -22.9068], // Rio de Janeiro, Brazil
  [18.4241, -33.9249],  // Cape Town, SA
  [31.2357, 30.0444],   // Cairo, Egypt
  [-99.1332, 19.4326],  // Mexico City
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
        // Data is processed incrementally below to avoid blocking the main thread
        const response = await fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
        )
        if (!response.ok) throw new Error("Failed to load land data")
        const data = await response.json()
        landFeaturesRef.current = data

        const dots: { lng: number; lat: number; visible: boolean }[] = []

        // Processing features incrementally to avoid blocking the main thread
        const processFeatures = (index: number) => {
          if (index >= data.features.length) {
            allDotsRef.current = dots
            setIsDataLoaded(true)
            return
          }

          const feature = data.features[index]
          const generated = generateDotsInPolygon(feature, 20)
          generated.forEach(([lng, lat]) => {
            dots.push({ lng, lat, visible: true })
          })

          // Yield more aggressively to ensure smooth gooey animation
          // Every 2 features we give a full breath to the main thread
          if (index % 2 === 0) {
            setTimeout(() => processFeatures(index + 1), 0)
          } else {
            processFeatures(index + 1)
          }
        }

        processFeatures(0)

        const conns: [number, number][][] = []
        for (let i = 0; i < 28; i++) {
          const from = HUB_LOCATIONS[Math.floor(Math.random() * HUB_LOCATIONS.length)]
          let to = HUB_LOCATIONS[Math.floor(Math.random() * HUB_LOCATIONS.length)]
          while (to === from) to = HUB_LOCATIONS[Math.floor(Math.random() * HUB_LOCATIONS.length)]
          conns.push([from, to])
        }
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

        // 4. Connection Lines
        ctx.strokeStyle = ACCENT_COLOR
        ctx.lineWidth = 1.2 * scaleFactor
        connectionsRef.current.forEach((conn) => {
          ctx.beginPath()
          path({ type: 'LineString', coordinates: conn })
          ctx.setLineDash([8 * scaleFactor, 12 * scaleFactor])
          ctx.lineDashOffset = -timeRef.current * 0.5
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

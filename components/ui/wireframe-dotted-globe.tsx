"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import { THEME_ACCENT_BASE, THEME_ACCENT_DARK, THEME_ACCENT_LIGHT } from "@/lib/site-config"

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
}

export default function RotatingEarth({ className = "" }: RotatingEarthProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dimensions = useRef({ width: 800, height: 800 }) // Initial fallback

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    // Setup function to update canvas based on container size
    const updateDimensions = () => {
      if (containerRef.current) {
        dimensions.current = {
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        }
      }
    }
    updateDimensions()

    let { width: containerWidth, height: containerHeight } = dimensions.current

    // Make the globe slightly smaller (radius divisor from 2.1 -> 2.5) 
    // to give it padding and prevent the atmosphere/dots from being cut off.
    const radius = Math.min(containerWidth, containerHeight) / 2.5

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    context.scale(dpr, dpr)

    // Create projection and path generator for Canvas
    let projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    let path = d3.geoPath().projection(projection).context(context)

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
        // Check if point is in outer ring
        if (!pointInPolygon(point, coordinates[0])) {
          return false
        }
        // Check if point is in any hole (inner rings)
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) {
            return false // Point is in a hole
          }
        }
        return true
      } else if (geometry.type === "MultiPolygon") {
        // Check each polygon in the MultiPolygon
        for (const polygon of geometry.coordinates) {
          // Check if point is in outer ring
          if (pointInPolygon(point, polygon[0])) {
            // Check if point is in any hole
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true
                break
              }
            }
            if (!inHole) {
              return true
            }
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
      let pointsGenerated = 0

      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) {
            dots.push(point)
            pointsGenerated++
          }
        }
      }

      console.log(
        `[v0] Generated ${pointsGenerated} points for land feature:`,
        feature.properties?.featurecla || "Land",
      )
      return dots
    }

    interface DotData {
      lng: number
      lat: number
      visible: boolean
    }

    const allDots: DotData[] = []
    let landFeatures: any

    // ─── Accent Colors & Data ────────────────────────────────────────────────
    const INDIGO_400 = THEME_ACCENT_BASE
    const INDIGO_500 = THEME_ACCENT_DARK
    const INDIGO_300 = THEME_ACCENT_LIGHT
    
    // Helper to apply opacity to hex colors
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
    ]

    const connections: [number, number][][] = []
    for (let i = 0; i < 18; i++) {
      const from = HUB_LOCATIONS[Math.floor(Math.random() * HUB_LOCATIONS.length)]
      let to = HUB_LOCATIONS[Math.floor(Math.random() * HUB_LOCATIONS.length)]
      while (to === from) to = HUB_LOCATIONS[Math.floor(Math.random() * HUB_LOCATIONS.length)]
      connections.push([from, to])
    }

    let time = 0;

    const render = () => {
      time += 1;
      // Clear canvas
      context.clearRect(0, 0, containerWidth, containerHeight)

      const currentScale = projection.scale()
      const scaleFactor = currentScale / radius

      // Draw subtle atmosphere glow behind globe
      const gradient = context.createRadialGradient(
        containerWidth / 2, containerHeight / 2, currentScale * 0.8,
        containerWidth / 2, containerHeight / 2, currentScale * 1.2
      );
      gradient.addColorStop(0, hexToRgba(INDIGO_500, 0.0));
      gradient.addColorStop(0.8, hexToRgba(INDIGO_500, 0.12));
      gradient.addColorStop(1, hexToRgba(INDIGO_500, 0.0));

      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale * 1.2, 0, 2 * Math.PI)
      context.fillStyle = gradient
      context.fill()

      if (landFeatures) {
        // Draw graticule
        const graticule = d3.geoGraticule()
        context.beginPath()
        path(graticule())
        context.strokeStyle = hexToRgba(INDIGO_400, 0.15)
        context.lineWidth = 1 * scaleFactor
        context.stroke()

        // Draw land outlines
        context.beginPath()
        landFeatures.features.forEach((feature: any) => {
          path(feature)
        })
        context.strokeStyle = hexToRgba(INDIGO_400, 0.25)
        context.lineWidth = 1 * scaleFactor
        context.stroke()

        // Draw halftone dots
        context.fillStyle = hexToRgba(INDIGO_400, 0.4)
        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat])
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            context.beginPath()
            context.arc(projected[0], projected[1], 1.0 * scaleFactor, 0, 2 * Math.PI)
            context.fill()
          }
        })

        // Draw Connections
        context.strokeStyle = INDIGO_400
        context.lineWidth = 1.5 * scaleFactor
        connections.forEach((conn) => {
          context.beginPath()
          path({ type: 'LineString', coordinates: conn })
          context.setLineDash([8 * scaleFactor, 12 * scaleFactor])
          context.lineDashOffset = -time * 0.5
          context.stroke()
        })
        context.setLineDash([])

        // Draw Hubs
        // We use d3 geoPath with pointRadius to correctly clip hubs to the front
        path.pointRadius(3.5 * scaleFactor)
        context.fillStyle = INDIGO_300
        HUB_LOCATIONS.forEach((hub) => {
          context.beginPath()
          path({ type: 'Point', coordinates: hub })
          context.fill()
        })

        // Add a glow to the hubs
        path.pointRadius(7 * scaleFactor)
        context.fillStyle = hexToRgba(INDIGO_300, 0.25)
        HUB_LOCATIONS.forEach((hub) => {
          context.beginPath()
          path({ type: 'Point', coordinates: hub })
          context.fill()
        })
      }
    }

    const loadWorldData = async () => {
      try {
        setIsLoading(true)

        const response = await fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
        )
        if (!response.ok) throw new Error("Failed to load land data")

        landFeatures = await response.json()

        // Generate dots for all land features
        let totalDots = 0
        landFeatures.features.forEach((feature: any) => {
          const dots = generateDotsInPolygon(feature, 16)
          dots.forEach(([lng, lat]) => {
            allDots.push({ lng, lat, visible: true })
            totalDots++
          })
        })

        console.log(`[v0] Total dots generated: ${totalDots} across ${landFeatures.features.length} land features`)

        render()
        setIsLoading(false)
      } catch (err) {
        setError("Failed to load land map data")
        setIsLoading(false)
      }
    }

    // Set up rotation and interaction
    const rotation: [number, number, number] = [0, -15, 0] // Start with slight tilt
    let autoRotate = true
    const rotationSpeed = 0.5

    const rotate = () => {
      if (autoRotate) {
        rotation[0] += rotationSpeed
        projection.rotate(rotation)
        render()
      }
    }

    // Auto-rotation timer
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

        projection.rotate(rotation)
        render()
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)

        setTimeout(() => {
          autoRotate = true
        }, 10)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1
      const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * scaleFactor))
      projection.scale(newRadius)
      render()
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("wheel", handleWheel)

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return
      const newWidth = containerRef.current.offsetWidth
      const newHeight = containerRef.current.offsetHeight

      if (newWidth === containerWidth && newHeight === containerHeight) return

      containerWidth = newWidth
      containerHeight = newHeight
      const newRadius = Math.min(containerWidth, containerHeight) / 2.5

      canvas.width = containerWidth * dpr
      canvas.height = containerHeight * dpr
      canvas.style.width = `${containerWidth}px`
      canvas.style.height = `${containerHeight}px`
      context.scale(dpr, dpr)

      projection.scale(newRadius).translate([containerWidth / 2, containerHeight / 2])
      render()
    }

    window.addEventListener("resize", handleResize)

    // Load the world data
    loadWorldData()

    // Cleanup
    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("wheel", handleWheel)
      window.removeEventListener("resize", handleResize)
    }
  }, []) // Removed width/height dependencies as we use internal dimensions

  if (error) {
    return (
      <div className={`dark flex items-center justify-center bg-card rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <p className="dark text-destructive font-semibold mb-2">Error loading Earth visualization</p>
          <p className="dark text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-transparent"
        style={{ display: "block" }}
      />
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground px-2 py-1 rounded-md dark bg-neutral-900/80 backdrop-blur">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  )
}

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * WindCanvasOverlay
 * Real-time Canvas Wind Streamline & Vector Field Overlay for Leaflet
 * 
 * SOURCING: CURRENT MODEL DATA (SOURCE: OPEN-METEO)
 * Uses meteorological wind velocity and direction vectors to animate moving streamlines.
 */

// Color scale for wind speed in km/h
export const getWindColor = (speedKmh) => {
  if (speedKmh < 15) return "#0284c7"; // calm cyan/blue
  if (speedKmh < 30) return "#10b981"; // moderate green/teal
  if (speedKmh < 50) return "#f59e0b"; // fresh amber/yellow
  if (speedKmh < 70) return "#ea580c"; // strong orange
  return "#dc2626"; // gale/storm red
};

export default function WindCanvasOverlay({
  windPoints = [],
  visible = true,
  isActive = true,
  opacity = 0.85
}) {
  const map = useMap();
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const particlesRef = useRef([]);

  const isShowing = visible && isActive;

  useEffect(() => {
    if (!map) return;

    // Create canvas element
    const canvas = L.DomUtil.create("canvas", "leaflet-wind-canvas-layer");
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "450"; // Above basemap, below markers
    canvasRef.current = canvas;

    const pane = map.getPane("overlayPane");
    if (pane) {
      pane.appendChild(canvas);
    }

    const resetCanvas = () => {
      try {
        if (!map || !canvas) return;
        const bounds = map.getBounds();
        if (!bounds || !bounds.isValid()) return;
        const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
        const bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());

        const width = Math.max(10, Math.abs(bottomRight.x - topLeft.x));
        const height = Math.max(10, Math.abs(bottomRight.y - topLeft.y));

        canvas.width = width;
        canvas.height = height;

        L.DomUtil.setPosition(canvas, topLeft);
      } catch (err) {
        console.warn("Wind canvas reset error:", err);
      }
    };

    resetCanvas();

    map.on("move", resetCanvas);
    map.on("zoom", resetCanvas);
    map.on("resize", resetCanvas);

    return () => {
      map.off("move", resetCanvas);
      map.off("zoom", resetCanvas);
      map.off("resize", resetCanvas);
      if (pane && canvas.parentNode === pane) {
        pane.removeChild(canvas);
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [map]);

  // Particle animation loop
  useEffect(() => {
    if (!isShowing || !windPoints || windPoints.length === 0) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize particles - smooth, restrained density to avoid overwhelming the map
    const PARTICLE_COUNT = 80;
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * (canvas.width || 800),
        y: Math.random() * (canvas.height || 600),
        age: Math.floor(Math.random() * 80),
        maxAge: 70 + Math.floor(Math.random() * 50),
        speed: 15,
        color: "#0284c7"
      });
    }
    particlesRef.current = particles;

    // Helper to find nearest wind grid point in screen space
    const getWindAtScreenPos = (sx, sy) => {
      try {
        if (!canvas || !map) return { speed: 15, dirRad: Math.PI / 4, color: "#0284c7" };

        const bounds = map.getBounds();
        if (!bounds || !bounds.isValid()) return { speed: 15, dirRad: Math.PI / 4, color: "#0284c7" };
        const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
        const layerX = topLeft.x + sx;
        const layerY = topLeft.y + sy;
        const latlng = map.layerPointToLatLng([layerX, layerY]);

        // Find closest station
        let minDistSq = Infinity;
        let closest = windPoints[0] || { speed: 15, direction: 90 };

        for (let i = 0; i < windPoints.length; i++) {
          const pt = windPoints[i];
          const dLat = pt.lat - latlng.lat;
          const dLon = pt.lon - latlng.lng;
          const distSq = dLat * dLat + dLon * dLon;
          if (distSq < minDistSq) {
            minDistSq = distSq;
            closest = pt;
          }
        }

        const flowDeg = ((closest?.direction ?? 90) + 180) % 360;
        const dirRad = ((90 - flowDeg) * Math.PI) / 180;

        return {
          speed: closest?.speed ?? 15,
          dirRad,
          color: getWindColor(closest?.speed ?? 15)
        };
      } catch {
        return { speed: 15, dirRad: Math.PI / 4, color: "#0284c7" };
      }
    };

    let lastTime = performance.now();

    const animate = (currentTime) => {
      const _dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Clear canvas each frame so underlying Leaflet basemap is 100% transparent and visible
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = opacity || 0.85;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age++;

        if (p.age > p.maxAge || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.age = 0;
          p.maxAge = 60 + Math.floor(Math.random() * 40);
        }

        const wind = getWindAtScreenPos(p.x, p.y);
        const velocity = Math.max(1.5, Math.min(7.0, (wind?.speed ?? 15) * 0.16));

        const nextX = p.x + Math.cos(wind.dirRad) * velocity;
        const nextY = p.y - Math.sin(wind.dirRad) * velocity;

        // Draw streamline streak
        ctx.strokeStyle = wind.color;
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(wind.dirRad) * velocity * 2.2, p.y + Math.sin(wind.dirRad) * velocity * 2.2);
        ctx.lineTo(nextX, nextY);
        ctx.stroke();

        p.x = nextX;
        p.y = nextY;
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isShowing, windPoints, map, opacity]);

  return null;
}

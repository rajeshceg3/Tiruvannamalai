import { useQuery } from "@tanstack/react-query";
import { Shrine } from "@shared/schema";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

// Leaflet imports - using dynamic import to avoid SSR issues
let L: any;

export default function MapSection() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  
  const { data: shrines, isLoading } = useQuery<Shrine[]>({
    queryKey: ["/api/shrines"],
  });

  useEffect(() => {
    // Dynamically import Leaflet
    const loadLeaflet = async () => {
      if (typeof window === "undefined") return;
      
      try {
        // Import Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        
        // Import Leaflet JS
        const leafletModule = await import('leaflet');
        L = leafletModule.default;
        
        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        initializeMap();
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (L && mapInstanceRef.current && shrines && !isLoading) {
      addShrineMarkers();
    }
  }, [shrines, isLoading]);

  const initializeMap = () => {
    if (!mapRef.current || !L) return;

    // Initialize map centered on Tiruvannamalai
    const map = L.map(mapRef.current).setView([12.2253, 79.0747], 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add Arunachala Hill center marker
    L.marker([12.2253, 79.0747])
      .addTo(map)
      .bindPopup(`
        <div class="p-2">
          <h3 class="font-bold text-lg">🏔️ Arunachala Hill</h3>
          <p class="text-sm text-gray-600">Sacred center of the Girivalam path</p>
        </div>
      `);

    mapInstanceRef.current = map;
  };

  const addShrineMarkers = () => {
    if (!mapInstanceRef.current || !shrines) return;

    // Add custom markers for each sacred site
    shrines.forEach((shrine, index) => {
      // Create custom circle marker
      const marker = L.circleMarker([shrine.latitude, shrine.longitude], {
        radius: 12,
        fillColor: shrine.color,
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(mapInstanceRef.current);

      // Create popup content
      const popupContent = `
        <div class="p-3 min-w-[200px]">
          <h3 class="font-bold text-lg mb-2">${shrine.emoji} ${shrine.name}</h3>
          <p class="text-sm text-gray-600 mb-2">${shrine.direction} • ${shrine.element}</p>
          <p class="text-xs text-gray-500 mb-2">Sacred Site ${shrine.order} of 8</p>
          <p class="text-sm text-gray-700 leading-relaxed">${shrine.description.substring(0, 120)}...</p>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'sacred-popup'
      });
    });
  };

  return (
    <section id="map" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-gray-900 mb-6">
            Sacred Geography
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore the mystical landscape of Tiruvannamalai and plan your pilgrimage through the eight sacred directions
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="bg-gradient-to-br from-temple to-white rounded-3xl p-2 shadow-2xl mb-8"
        >
          {isLoading ? (
            <Skeleton className="w-full h-96 lg:h-[500px] rounded-2xl" />
          ) : (
            <div 
              ref={mapRef}
              className="w-full h-96 lg:h-[500px] rounded-2xl shadow-inner"
            />
          )}
        </motion.div>

        {/* Map Legend */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-lg"
        >
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">Sacred Directions & Elements</h3>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {shrines?.map((shrine) => (
                <div key={shrine.id} className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: shrine.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {shrine.direction} - {shrine.name.replace(' Lingam', '')} ({shrine.element})
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

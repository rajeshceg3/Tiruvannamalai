import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const { user } = useAuth();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[100dvh] md:h-[600px] flex items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 z-0 bg-muted">
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
               <Loader2 className="w-10 h-10 animate-spin text-white/50" />
            </div>
          )}
          <img
            src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt="Arunachala Hill, a sacred mountain in Tamil Nadu, India, symbolizing Lord Shiva."
            // Removed lazy loading for Hero image to improve LCP
            className={`w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-background" />
        </div>

        <div className="relative z-10 text-center space-y-6 max-w-4xl px-4 mt-[-60px] md:mt-0">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight drop-shadow-2xl">
              Sacred Steps
            </h1>
          </motion.div>
          <motion.p
            className="text-lg md:text-2xl font-light opacity-90 max-w-2xl mx-auto drop-shadow-md leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            A digital companion for the Giri Pradakshina.
            Discover the 8 Lingams, track your journey, and find inner peace.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center pt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {user ? (
               <Link href="/dashboard">
                <Button size="lg" className="h-12 text-lg px-10 shadow-xl hover:scale-105 transition-all duration-300 bg-primary hover:bg-primary/90 rounded-full font-medium">
                  Continue Journey
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button size="lg" className="h-12 text-lg px-10 shadow-xl hover:scale-105 transition-all duration-300 bg-primary hover:bg-primary/90 rounded-full font-medium">
                  Start Pilgrimage
                </Button>
              </Link>
            )}
            {/* Removed generic API button for cleaner UX */}
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-24">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          <div className="space-y-4">
            <div className="text-4xl mb-4" role="img" aria-label="Sacred Om Symbol">🕉️</div>
            <h3 className="text-2xl font-semibold">Ancient Wisdom</h3>
            <p className="text-muted-foreground">
              Learn the significance of each Lingam and the elemental energies they represent.
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-2xl font-semibold">Interactive Map</h3>
            <p className="text-muted-foreground">
              Track your progress around the sacred hill and visualize your spiritual path.
            </p>
          </div>
          <div className="space-y-4">
            <div className="text-4xl mb-4">📔</div>
            <h3 className="text-2xl font-semibold">Personal Journal</h3>
            <p className="text-muted-foreground">
              Record your thoughts and realizations at each stop on your journey.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-[600px] flex items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 z-0 bg-muted">
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
               <Loader2 className="w-10 h-10 animate-spin text-white/50" />
            </div>
          )}
          <img
            src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt="Arunachala Hill"
            className={`w-full h-full object-cover transition-opacity duration-700 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 text-center space-y-6 max-w-2xl px-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Sacred Steps
          </h1>
          <p className="text-xl md:text-2xl font-light opacity-90">
            A digital companion for the Giri Pradakshina.
            Discover the 8 Lingams, track your journey, and find inner peace.
          </p>
          <div className="flex gap-4 justify-center pt-8">
            {user ? (
               <Link href="/dashboard">
                <Button size="lg" className="text-lg px-8 shadow-lg hover:scale-105 transition-transform">
                  Continue Journey
                </Button>
              </Link>
            ) : (
              <Link href="/auth">
                <Button size="lg" className="text-lg px-8 shadow-lg hover:scale-105 transition-transform">
                  Start Pilgrimage
                </Button>
              </Link>
            )}
            <Link href="/api/shrines" target="_blank">
               <Button variant="outline" size="lg" className="text-lg px-8 bg-transparent text-white border-white hover:bg-white/20 hover:text-white transition-colors">
                View API
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-24">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          <div className="space-y-4">
            <div className="text-4xl mb-4">🕉️</div>
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

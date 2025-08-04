import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import MapSection from "@/components/map-section";
import ShrineCard from "@/components/shrine-card";
import { useQuery } from "@tanstack/react-query";
import { Shrine } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function Home() {
  const { data: shrines, isLoading, error } = useQuery<Shrine[]>({
    queryKey: ["/api/shrines"],
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Sacred Journey</h2>
          <p className="text-gray-600">Unable to load the sacred shrines. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-temple">
      <Navigation />
      <HeroSection />
      
      {/* Journey Introduction */}
      <section id="journey" className="py-20 bg-gradient-to-b from-temple to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-gray-900 mb-6">
              A Pilgrimage of the Soul
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Cradled in the spiritual folds of Tamil Nadu, Tiruvannamalai beckons with the mystical rhythm of temple bells, 
              rustling neem trees, and the soft murmur of ancient mantras. Each of the eight guardian Lingams holds a piece of cosmic wisdom.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: "🛤️", title: "Sacred Path", desc: "Walk the ancient Girivalam route that has guided pilgrims for millennia" },
              { icon: "🕉️", title: "Eight Elements", desc: "Discover cosmic guardians representing the fundamental forces of creation" },
              { icon: "❤️", title: "Inner Journey", desc: "Transform through contemplation, devotion, and sacred presence" },
              { icon: "♾️", title: "Eternal Circle", desc: "Complete the sacred circuit and find your place in the cosmos" }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group bg-white rounded-3xl p-6 hover:shadow-xl transition-all duration-500"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-saffron/20 to-saffron/40 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <MapSection />

      {/* Eight Sacred Shrines */}
      <section id="shrines" className="py-20 bg-gradient-to-b from-white to-temple">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-gray-900 mb-6">
              The Eight Sacred Guardians
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Each Lingam represents a cosmic element and direction, offering unique wisdom and blessings to devotees who walk the sacred path
            </p>
          </motion.div>

          <div className="space-y-16">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex flex-col lg:flex-row items-center gap-12 py-12">
                  <div className="lg:w-1/2">
                    <Skeleton className="w-full h-80 rounded-3xl" />
                  </div>
                  <div className="lg:w-1/2 space-y-6">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="w-12 h-12 rounded-2xl" />
                      <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-24 w-full" />
                    <div className="flex items-center space-x-6">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              shrines?.map((shrine, index) => (
                <ShrineCard
                  key={shrine.id}
                  shrine={shrine}
                  isReversed={index % 2 === 1}
                  index={index}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Journey Completion */}
      <section className="py-20 bg-gradient-to-br from-saffron/10 via-meditation/10 to-sage/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-24 h-24 bg-gradient-to-br from-sacred to-saffron rounded-full flex items-center justify-center mx-auto mb-8"
            >
              <span className="text-white text-2xl">♾️</span>
            </motion.div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-gray-900 mb-6">
              📸 A Circle That Never Ends
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              As you complete the Girivalam, your feet dusty but your heart light, you realize this wasn't just a journey around a hill. 
              It was a spiral inward—a mandala of meaning. The Ashta Lingams are not just stone shrines. 
              They are mirrors of the universe… and of you.
            </p>
            <p className="text-xl font-display text-meditation mb-12">
              Are you ready to walk it again?
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/80 backdrop-blur rounded-3xl p-8 shadow-2xl"
          >
            <h3 className="font-display text-xl font-semibold text-gray-900 mb-6">Begin Your Sacred Journey</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group bg-gradient-to-r from-saffron to-terracotta text-white px-8 py-4 rounded-2xl font-medium hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-3"
              >
                <span>🗺️</span>
                <span>Download Pilgrimage Map</span>
                <motion.span
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  📥
                </motion.span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group bg-meditation/10 text-meditation px-8 py-4 rounded-2xl font-medium hover:bg-meditation/20 transition-all duration-300 flex items-center justify-center space-x-3"
              >
                <span>📤</span>
                <span>Share This Journey</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-saffron to-terracotta rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🕉️</span>
                </div>
                <span className="font-display font-semibold text-xl">Ashta Lingams Journey</span>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6">
                Experience the sacred wisdom of Tiruvannamalai's eight guardian Lingams through this immersive digital pilgrimage guide. 
                Designed with mindful simplicity to honor the ancient traditions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-4">Sacred Sites</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#shrines" className="hover:text-white transition-colors duration-300">All Eight Shrines</a></li>
                <li><a href="#map" className="hover:text-white transition-colors duration-300">Sacred Map</a></li>
                <li><a href="#journey" className="hover:text-white transition-colors duration-300">Pilgrimage Guide</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-4">Journey Guide</h4>
              <ul className="space-y-2 text-gray-400">
                <li><span className="text-gray-500">Pilgrimage Tips</span></li>
                <li><span className="text-gray-500">Best Times to Visit</span></li>
                <li><span className="text-gray-500">Local Customs</span></li>
                <li><span className="text-gray-500">Photo Guidelines</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Ashta Lingams Sacred Journey. Designed with 🕉️ for spiritual seekers worldwide.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

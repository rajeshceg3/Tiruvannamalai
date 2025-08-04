import { motion } from "framer-motion";

export default function HeroSection() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-saffron/20 via-sandstone/30 to-terracotta/20"></div>
      <img 
        src="https://images.unsplash.com/photo-1545558014-8692077e9b5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
        alt="Ancient temple architecture in golden sunlight" 
        className="absolute inset-0 w-full h-full object-cover opacity-30" 
      />
      
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <motion.h1 
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-gray-900 mb-6 leading-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
          >
            🌄 Eight Sacred Sights
            <motion.span 
              className="block text-saffron"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
            >
              That Will Transform
            </motion.span>
            <motion.span 
              className="block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              Your Soul
            </motion.span>
          </motion.h1>
          
          <motion.p 
            className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
          >
            Walk the mystical Girivalam path around Arunachala Hill and discover the cosmic wisdom of Tiruvannamalai's ancient Ashta Lingams 🕉️
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scrollToSection('journey')}
              className="group bg-gradient-to-r from-saffron to-terracotta text-white px-8 py-4 rounded-2xl font-medium text-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-3"
            >
              <span>Begin Sacred Journey</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🛤️
              </motion.span>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scrollToSection('map')}
              className="group bg-white/80 backdrop-blur text-gray-700 px-8 py-4 rounded-2xl font-medium text-lg hover:bg-white hover:shadow-lg transition-all duration-300 flex items-center space-x-3"
            >
              <span className="text-meditation">🗺️</span>
              <span>Explore Sacred Map</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating elements */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-3 h-3 bg-sacred rounded-full opacity-60"
        animate={{ 
          y: [0, -10, 0],
          opacity: [0.6, 1, 0.6]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute top-1/3 right-1/3 w-2 h-2 bg-meditation rounded-full opacity-50"
        animate={{ 
          y: [0, -10, 0],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{ duration: 6, repeat: Infinity, delay: 2, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-1/4 left-1/3 w-4 h-4 bg-sage rounded-full opacity-40"
        animate={{ 
          y: [0, -10, 0],
          opacity: [0.4, 0.7, 0.4]
        }}
        transition={{ duration: 6, repeat: Infinity, delay: 4, ease: "easeInOut" }}
      />
    </section>
  );
}

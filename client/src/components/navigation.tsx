import { motion } from "framer-motion";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-saffron to-terracotta rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🕉️</span>
            </div>
            <span className="font-display font-semibold text-lg text-gray-900">Ashta Lingams</span>
          </motion.div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('journey')}
              className="text-gray-600 hover:text-saffron transition-colors duration-300"
            >
              Journey
            </button>
            <button 
              onClick={() => scrollToSection('map')}
              className="text-gray-600 hover:text-saffron transition-colors duration-300"
            >
              Sacred Map
            </button>
            <button 
              onClick={() => scrollToSection('shrines')}
              className="text-gray-600 hover:text-saffron transition-colors duration-300"
            >
              Eight Shrines
            </button>
          </div>
          
          <button 
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-gray-100 py-4"
          >
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => scrollToSection('journey')}
                className="text-gray-600 hover:text-saffron transition-colors duration-300 text-left"
              >
                Journey
              </button>
              <button 
                onClick={() => scrollToSection('map')}
                className="text-gray-600 hover:text-saffron transition-colors duration-300 text-left"
              >
                Sacred Map
              </button>
              <button 
                onClick={() => scrollToSection('shrines')}
                className="text-gray-600 hover:text-saffron transition-colors duration-300 text-left"
              >
                Eight Shrines
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}

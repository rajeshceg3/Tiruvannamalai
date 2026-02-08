import { Shrine } from "@shared/schema";
import { motion } from "framer-motion";
import { Compass, MapPin } from "lucide-react";

interface ShrineCardProps {
  shrine: Shrine;
  isReversed: boolean;
  index: number;
}

export default function ShrineCard({ shrine, isReversed, index }: ShrineCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      className={`group flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 py-12`}
    >
      {/* Image */}
      <motion.div 
        className="lg:w-1/2"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        <img 
          src={shrine.imageUrl} 
          alt={`${shrine.name} - Ancient temple architecture`} 
          className="w-full h-80 object-cover rounded-3xl shadow-2xl group-hover:shadow-3xl transition-shadow duration-500" 
        />
      </motion.div>

      {/* Content */}
      <div className="lg:w-1/2 space-y-6">
        <div className="flex items-center space-x-4">
          <motion.div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
            style={{ background: `linear-gradient(135deg, ${shrine.color}, ${shrine.color}CC)` }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            {shrine.order}
          </motion.div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-gray-900">
              <span role="img" aria-label="shrine symbol" className="mr-2">{shrine.emoji}</span>
              {shrine.name}
            </h3>
            <p className="text-meditation font-medium">
              {shrine.direction} • {shrine.element}
            </p>
          </div>
        </div>

        <p className="text-gray-600 leading-relaxed text-lg">
          {shrine.description}
        </p>

        {shrine.significance && (
          <motion.blockquote 
            initial={{ opacity: 0, x: isReversed ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="border-l-4 border-saffron pl-4 italic text-gray-700 bg-temple/50 p-4 rounded-r-lg"
          >
            "{shrine.significance}"
          </motion.blockquote>
        )}

        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <span className="flex items-center space-x-2">
            <Compass className="w-4 h-4" />
            <span>Direction: {shrine.direction}</span>
          </span>
          <span className="flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>Element: {shrine.element}</span>
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group bg-gradient-to-r from-gray-100 to-gray-200 hover:from-saffron/10 hover:to-terracotta/10 text-gray-700 hover:text-gray-900 px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2"
        >
          <span role="img" aria-label="compass">🧭</span>
          <span>View on Sacred Map</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

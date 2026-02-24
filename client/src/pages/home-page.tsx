import HeroSection from "@/components/hero-section";
import { Footer } from "@/components/layout/footer";
import { BookOpen, Map, Scroll, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function HomePage() {
  const testimonials = [
    {
      name: "Lakshmi Priya",
      location: "Chennai, India",
      quote: "The deep spiritual context provided for each Lingam transformed my Girivalam experience from a walk into a true pilgrimage. I felt the presence of the divine at every step.",
      avatar: "LP"
    },
    {
      name: "David Miller",
      location: "London, UK",
      quote: "Even from thousands of miles away, the virtual journey helped me find a center of stillness in my chaotic daily life. The 'Daily Wisdom' has become my essential morning ritual.",
      avatar: "DM"
    },
    {
      name: "Ravi Kumar",
      location: "Bangalore, India",
      quote: "The group coordination features were a lifesaver during the crowded full moon walk. We tracked our elderly parents in real-time and never felt the anxiety of separation.",
      avatar: "RK"
    },
    {
      name: "Sarah Jenkins",
      location: "Sydney, Australia",
      quote: "I didn't expect the emotional release I felt using the journaling feature at the Kubera Lingam. This app holds space for you in a way technology rarely does.",
      avatar: "SJ"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeroSection />

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-4 py-24 scroll-mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Spiritual Toolkit</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to make your pilgrimage meaningful, safe, and deeply personal.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-4 p-6 rounded-2xl hover:bg-muted/30 transition-colors"
          >
            <div className="mx-auto w-16 h-16 bg-saffron/10 rounded-full flex items-center justify-center text-saffron mb-6">
              <Scroll className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-semibold">Ancient Wisdom</h3>
            <p className="text-muted-foreground leading-relaxed">
              Uncover the mystical significance of the 8 Ashta Lingams. Access curated mantras, elemental associations, and historical lore that turn every step into a lesson in consciousness.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-4 p-6 rounded-2xl hover:bg-muted/30 transition-colors"
          >
            <div className="mx-auto w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center text-terracotta mb-6">
              <Map className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-semibold">Pilgrim's Compass</h3>
            <p className="text-muted-foreground leading-relaxed">
              Walk the 14km path with confidence. Our GPS-enabled Pathfinder ensures you never miss a shrine, while 'Squadron Overwatch' keeps your group connected even in the densest crowds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="space-y-4 p-6 rounded-2xl hover:bg-muted/30 transition-colors"
          >
            <div className="mx-auto w-16 h-16 bg-meditation/10 rounded-full flex items-center justify-center text-meditation mb-6">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-semibold">Inner Sanctum Journal</h3>
            <p className="text-muted-foreground leading-relaxed">
              Capture the whispers of your soul. Document your realizations, prayers, and moments of silence in a private digital diary geo-tagged to each sacred location on the path.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-muted/20 py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Voices of the Path</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Hear from fellow pilgrims who have walked the path with Sacred Steps.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <Card className="h-full border-none shadow-lg bg-card/50 backdrop-blur">
                  <CardContent className="p-8 flex flex-col gap-6">
                    <Quote className="w-10 h-10 text-primary/20" />
                    <p className="text-lg italic text-muted-foreground flex-1">"{t.quote}"</p>
                    <div className="flex items-center gap-4 mt-auto">
                      <Avatar className="h-12 w-12 border-2 border-primary/10">
                        <AvatarFallback className="bg-primary/5 text-primary font-bold">{t.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.location}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import HeroSection from "@/components/hero-section";
import { Footer } from "@/components/layout/footer";
import { BookOpen, Map, Scroll, Quote, User } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function HomePage() {
  const testimonials = [
    {
      name: "Lakshmi Priya",
      location: "Chennai, India",
      quote: "The detailed information about each Lingam transformed my Girivalam experience. I felt a deeper connection at every step.",
      avatar: "LP"
    },
    {
      name: "David Miller",
      location: "London, UK",
      quote: "Even from afar, the virtual journey helped me find stillness in my chaotic daily life. The 'Daily Wisdom' is my morning ritual.",
      avatar: "DM"
    },
    {
      name: "Ravi Kumar",
      location: "Bangalore, India",
      quote: "The group coordination features were a lifesaver during the crowded full moon walk. We never lost track of our elderly parents.",
      avatar: "RK"
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
              Unlock the secrets of the 8 Lingams. Learn the elemental significance (Pancha Bhoota) and chanting mantras for each sacred stop.
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
            <h3 className="text-2xl font-semibold">Interactive Map</h3>
            <p className="text-muted-foreground leading-relaxed">
              Navigate the 14km path with confidence. Real-time GPS tracking ensures you never miss a shrine or a crucial turn on the Girivalam path.
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
            <h3 className="text-2xl font-semibold">Personal Journal</h3>
            <p className="text-muted-foreground leading-relaxed">
              Document your inner journey. Capture realizations, prayers, and moments of silence in your private spiritual diary attached to each location.
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

          <div className="grid md:grid-cols-3 gap-8">
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

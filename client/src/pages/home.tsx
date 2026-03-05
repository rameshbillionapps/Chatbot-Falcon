import { motion } from "framer-motion";
import { MessageCircle, Phone, Mail, MapPin, Star, Truck, Award, Palette, Scissors, ShieldCheck, Clock } from "lucide-react";
import { SiInstagram, SiFacebook, SiLinkedin, SiWhatsapp } from "react-icons/si";
import { ChatWidget } from "@/components/chatbot/chat-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const products = [
  { title: "Polo T-Shirts", desc: "180-240 GSM in Combed Cotton, Dryfit & Interlock", img: "/images/instagram/instagram-0.png" },
  { title: "Crew Neck T-Shirts", desc: "120-240 GSM for promotions, uniforms & branding", img: "/images/instagram/instagram-1.png" },
  { title: "Custom Caps", desc: "Baseball, Snapback, Trucker & 5/6 Panel styles", img: "/images/instagram/instagram-2.png" },
  { title: "Winter Wear", desc: "Fleece sweatshirts, jackets & track pants", img: "/images/instagram/instagram-3.png" },
  { title: "Corporate Uniforms", desc: "Professional uniforms for all industries", img: "/images/instagram/instagram-4.png" },
  { title: "Sublimation Prints", desc: "Full-color all-over printing on polyester", img: "/images/instagram/instagram-5.png" },
];

const services = [
  { icon: Palette, title: "Custom Design", desc: "Pantone matching, custom cuts, private labeling" },
  { icon: Scissors, title: "Cut & Sew", desc: "Fully custom patterns and constructions" },
  { icon: Award, title: "Premium Quality", desc: "Oeko-Tex compliant, AZO-free dyes" },
  { icon: Truck, title: "Global Export", desc: "Shipping to USA, UK, Europe, Middle East & more" },
  { icon: ShieldCheck, title: "Quality Control", desc: "100% inspection with AQL sampling" },
  { icon: Clock, title: "Fast Turnaround", desc: "10-30 day production, rush orders available" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Star className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-base text-foreground leading-none" data-testid="text-brand">Falcon Head Gear</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">& Meenax T-Shirts</span>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#products" className="hover:text-foreground transition-colors" data-testid="nav-products">Products</a>
            <a href="#services" className="hover:text-foreground transition-colors" data-testid="nav-services">Services</a>
            <a href="#gallery" className="hover:text-foreground transition-colors" data-testid="nav-gallery">Gallery</a>
            <a href="#contact" className="hover:text-foreground transition-colors" data-testid="nav-contact">Contact</a>
          </nav>
          <a href="https://wa.me/918825452704" target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="gap-1.5" data-testid="button-whatsapp">
              <SiWhatsapp className="w-3.5 h-3.5" /> Get Quote
            </Button>
          </a>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
            <MapPin className="w-3.5 h-3.5" />
            Tiruppur, India — Knitwear Capital
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4" data-testid="text-hero-title">
            Premium T-Shirts, Caps &<br />
            <span className="text-primary">Custom Garment Manufacturing</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            We manufacture high-quality T-shirts, caps, uniforms, and winter wear with custom printing, 
            embroidery, and branding. Serving businesses worldwide from Tiruppur, Tamil Nadu.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://wa.me/918825452704" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2" data-testid="button-order">
                <SiWhatsapp className="w-4 h-4" /> Order Now
              </Button>
            </a>
            <a href="#products">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-products">
                View Products
              </Button>
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> Oeko-Tex Compliant</span>
            <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-primary" /> Global Shipping</span>
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-primary" /> 50+ MOQ</span>
          </div>
        </motion.div>
      </section>

      <section id="products" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Our Products</h2>
          <p className="text-muted-foreground">Quality garments for every need — from promotions to premium branding</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p, i) => (
            <motion.div key={p.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp}>
              <Card className="overflow-hidden border border-border group" data-testid={`card-product-${i}`}>
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="services" className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">What We Offer</h2>
            <p className="text-muted-foreground">End-to-end garment manufacturing with world-class quality</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s, i) => (
              <motion.div key={s.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp}>
                <Card className="h-full border border-border" data-testid={`card-service-${i}`}>
                  <CardContent className="p-5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <s.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Printing & Customization</h2>
          <p className="text-muted-foreground">Multiple printing techniques for every design requirement</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["Screen Printing", "Embroidery", "Sublimation", "DTG Printing", "Heat Transfer", "Foil Print", "Puff Print", "Discharge Print"].map((method, i) => (
            <div key={method} className="text-center p-4 rounded-lg border border-border bg-card" data-testid={`card-print-${i}`}>
              <p className="text-sm font-medium text-foreground">{method}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery" className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Product Gallery</h2>
            <p className="text-muted-foreground">A glimpse of our recent work and product range</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {Array.from({ length: 15 }, (_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                className="aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <img
                  src={`/images/instagram/instagram-${i}.png`}
                  alt={`Product ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                  data-testid={`img-gallery-${i}`}
                />
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-6">
            <a href="https://www.instagram.com/falcon.head.gear/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <SiInstagram className="w-4 h-4" /> Follow us on Instagram
            </a>
          </div>
        </div>
      </section>

      <section id="contact" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Get in Touch</h2>
          <p className="text-muted-foreground">Ready to place an order or need a custom quote? Reach out to us.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <Card className="border border-border" data-testid="card-contact-falcon">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground mb-3">Falcon Head Gear</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> 80123 45434</p>
                <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> sales@falconheadgear.com</p>
                <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-primary mt-0.5" /> SF.NO.31/4C, Chellam Nagar, Andipalayam, Tiruppur-641687</p>
              </div>
              <div className="flex gap-3 mt-4">
                <a href="https://www.facebook.com/FalconHeadGear" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><SiFacebook className="w-4 h-4" /></a>
                <a href="https://www.instagram.com/falcon.head.gear/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><SiInstagram className="w-4 h-4" /></a>
                <a href="https://www.linkedin.com/company/falcon-head-gear/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><SiLinkedin className="w-4 h-4" /></a>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border" data-testid="card-contact-meenax">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground mb-3">Meenax T-Shirts</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> +91 8825452704</p>
                <p className="flex items-center gap-2"><SiWhatsapp className="w-4 h-4 text-primary" /> WhatsApp: +91 8825452704</p>
                <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-primary mt-0.5" /> Tiruppur, Tamil Nadu, India</p>
              </div>
              <div className="mt-4">
                <a href="https://wa.me/918825452704" target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <SiWhatsapp className="w-3.5 h-3.5" /> Chat on WhatsApp
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border bg-primary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">Need Help? Chat with Our AI Assistant</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-4">
            Click the chat button in the bottom-right corner to get instant answers about products, pricing, fabrics, and more.
          </p>
          <MessageCircle className="w-8 h-8 text-primary mx-auto animate-bounce" />
        </div>
      </section>

      <footer className="border-t border-border py-6 bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Falcon Head Gear & Meenax T-Shirts — Premium Garment Manufacturers, Tiruppur</span>
          <span>Made with care in the Knitwear Capital of India</span>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}

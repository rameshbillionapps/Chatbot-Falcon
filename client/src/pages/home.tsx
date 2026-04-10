import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageCircle, Phone, Mail, MapPin, Star } from "lucide-react";
import { SiInstagram, SiFacebook, SiLinkedin, SiWhatsapp } from "react-icons/si";
import { ChatWidget } from "@/components/chatbot/chat-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

interface PublicSettings {
  brand_name?: string;
  brand_tagline?: string;
  brand_location?: string;
  brand_address?: string;
  brand_whatsapp?: string;
  contact_phone?: string;
  contact_email?: string;
  social_instagram?: string;
  social_facebook?: string;
  social_linkedin?: string;
  home_hero_title?: string;
  home_hero_description?: string;
  bot_name?: string;
  welcome_message?: string;
}

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
}

interface MediaAsset {
  id: number;
  title: string;
  type: string;
  url: string;
  category: string | null;
  knowledgeArticleId: number | null;
}

export default function HomePage() {
  const { data: settings = {} } = useQuery<PublicSettings>({
    queryKey: ["/api/public/settings"],
    queryFn: () => fetch("/api/public/settings").then(r => r.json()),
    staleTime: 60_000,
  });

  const { data: products = [] } = useQuery<Article[]>({
    queryKey: ["/api/public/articles", "products"],
    queryFn: () => fetch("/api/public/articles?category=products").then(r => r.json()),
    staleTime: 60_000,
  });

  const { data: galleryMedia = [] } = useQuery<MediaAsset[]>({
    queryKey: ["/api/public/media", "image"],
    queryFn: () => fetch("/api/public/media?type=image").then(r => r.json()),
    staleTime: 60_000,
  });

  const brandName = settings.brand_name || "My Business";
  const brandTagline = settings.brand_tagline || "";
  const heroTitle = settings.home_hero_title || brandName;
  const heroDesc = settings.home_hero_description || "";
  const location = settings.brand_location || "";
  const address = settings.brand_address || "";
  const phone = settings.contact_phone || "";
  const email = settings.contact_email || "";
  const whatsapp = settings.brand_whatsapp || "";
  const instagram = settings.social_instagram || "";
  const facebook = settings.social_facebook || "";
  const linkedin = settings.social_linkedin || "";
  const botName = settings.bot_name || "AI Assistant";
  const galleryImages = galleryMedia.slice(0, 15);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Star className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-base text-foreground leading-none" data-testid="text-brand">{brandName}</span>
              {brandTagline && <span className="text-[10px] text-muted-foreground block leading-tight">{brandTagline}</span>}
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            {products.length > 0 && <a href="#products" className="hover:text-foreground transition-colors">Products</a>}
            {galleryImages.length > 0 && <a href="#gallery" className="hover:text-foreground transition-colors">Gallery</a>}
            {(phone || email || address) && <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>}
          </nav>
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-1.5" data-testid="button-whatsapp">
                <SiWhatsapp className="w-3.5 h-3.5" /> Get Quote
              </Button>
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          {location && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
              <MapPin className="w-3.5 h-3.5" />
              {location}
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4" data-testid="text-hero-title">
            {heroTitle}
          </h1>
          {heroDesc && (
            <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              {heroDesc}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2" data-testid="button-order">
                  <SiWhatsapp className="w-4 h-4" /> Contact on WhatsApp
                </Button>
              </a>
            )}
            {products.length > 0 && (
              <a href="#products">
                <Button size="lg" variant="outline" data-testid="button-view-products">View Products</Button>
              </a>
            )}
          </div>
        </motion.div>
      </section>

      {/* Products */}
      {products.length > 0 && (
        <section id="products" className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Our Products</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p, i) => {
              // Find a linked gallery image for this article
              const img = galleryMedia.find(m => m.knowledgeArticleId === p.id);
              return (
                <motion.div key={p.id} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp}>
                  <Card className="overflow-hidden border border-border group" data-testid={`card-product-${i}`}>
                    {img ? (
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        <img src={img.url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                        <Star className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-1">{p.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {p.content.split(".")[0]}.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <section id="gallery" className="border-t border-border bg-card/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Gallery</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {galleryImages.map((img, i) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  className="aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <img
                    src={img.url}
                    alt={img.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                    data-testid={`img-gallery-${i}`}
                  />
                </motion.div>
              ))}
            </div>
            {instagram && (
              <div className="text-center mt-6">
                <a href={instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <SiInstagram className="w-4 h-4" /> Follow us on Instagram
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Contact */}
      {(phone || email || address || whatsapp) && (
        <section id="contact" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Get in Touch</h2>
            <p className="text-muted-foreground">Ready to connect? Reach out to us.</p>
          </div>
          <div className="max-w-sm mx-auto">
            <Card className="border border-border">
              <CardContent className="p-5">
                <h3 className="font-semibold text-foreground mb-3">{brandName}</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary flex-shrink-0" /> {phone}</p>}
                  {email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary flex-shrink-0" /> {email}</p>}
                  {address && <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /> {address}</p>}
                </div>
                <div className="flex gap-3 mt-4 items-center">
                  {whatsapp && (
                    <a href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <SiWhatsapp className="w-3.5 h-3.5" /> WhatsApp
                      </Button>
                    </a>
                  )}
                  {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><SiFacebook className="w-4 h-4" /></a>}
                  {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><SiInstagram className="w-4 h-4" /></a>}
                  {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><SiLinkedin className="w-4 h-4" /></a>}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* AI Chat nudge */}
      <section className="border-t border-border bg-primary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">Need Help? Chat with {botName}</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-4">
            Click the chat button in the bottom-right corner for instant answers.
          </p>
          <MessageCircle className="w-8 h-8 text-primary mx-auto animate-bounce" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{brandName}{brandTagline ? ` — ${brandTagline}` : ""}</span>
          {location && <span>{location}</span>}
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}

import { motion } from "framer-motion";
import { Link } from "wouter";
import { MessageCircle, Zap, Image, BarChart3, Code, Globe, Shield, Package, ArrowRight } from "lucide-react";
import { ChatWidget } from "@/components/chatbot/chat-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: MessageCircle, title: "AI-Powered Chat", desc: "Smart RAG-based chatbot answers supplier queries about products, fabrics, pricing, and more using your knowledge base." },
  { icon: Image, title: "Rich Media Responses", desc: "Display product images, PDF catalogues, and videos inline within chat responses for a visual experience." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Track chat sessions, popular topics, visitor domains, and message volume with real-time analytics." },
  { icon: Code, title: "Embeddable Widget", desc: "Deploy on any website with a simple script tag, GTM container, or iframe embed code." },
  { icon: Shield, title: "Knowledge Management", desc: "Admin dashboard to manage articles, media assets, and AI responses with full CRUD control." },
  { icon: Globe, title: "Multi-Domain Support", desc: "Configure separate widget instances per domain with custom branding, colors, and welcome messages." },
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
              <MessageCircle className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground" data-testid="text-brand">SupplierBot</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="outline" size="sm" data-testid="link-admin">
                Admin Dashboard
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Supplier Assistant
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6" data-testid="text-hero-title">
            Smart Chatbot for<br />
            <span className="text-primary">Garment Manufacturers</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Help suppliers find product info, get pricing quotes, learn about fabrics and printing methods — 
            all through an intelligent AI chatbot powered by your company's knowledge base.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2" data-testid="button-try-demo">
              <MessageCircle className="w-4 h-4" />
              Try the Demo
            </Button>
            <Link href="/admin">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-go-admin">
                Admin Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Everything You Need</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            A complete supplier communication platform with AI chat, media support, and admin tools.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
            >
              <Card className="h-full border border-border" data-testid={`card-feature-${i}`}>
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Easy Integration</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Embed the chatbot on any website in minutes with three flexible options.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Code, title: "Script Tag", desc: "Add a single <script> tag to your site's HTML" },
              { icon: Package, title: "GTM Container", desc: "Install via Google Tag Manager for easy deployment" },
              { icon: Globe, title: "iFrame Embed", desc: "Embed as an iframe for full isolation and control" },
            ].map((opt, i) => (
              <Card key={opt.title} className="text-center border border-border" data-testid={`card-embed-${i}`}>
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <opt.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{opt.title}</h3>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Built for Tiruppur's Garment Industry</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-6">
          Designed specifically for garment manufacturers like Falcon Head Gear and Meenax T-shirts
          to help suppliers get instant answers about products, pricing, and ordering.
        </p>
        <Link href="/admin">
          <Button size="lg" className="gap-2">
            Get Started <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>SupplierBot — AI Chatbot for Garment Manufacturers</span>
          <span>Tiruppur, Tamil Nadu, India</span>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}

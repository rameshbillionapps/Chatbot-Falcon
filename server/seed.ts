import { db } from "./db";
import { knowledgeArticles, mediaAssets, adminSettings, widgetConfigs } from "@shared/schema";
import { count, eq, sql, isNull } from "drizzle-orm";
import { generateEmbedding } from "./openai";

async function ensureVideoAssets() {
  const existingVideos = await db.select().from(mediaAssets).where(eq(mediaAssets.type, "video"));
  if (existingVideos.length > 0) return;

  console.log("Adding video media assets...");
  const articles = await db.select().from(knowledgeArticles);
  const printingArticle = articles.find(a => a.title.includes("Printing"));
  const processArticle = articles.find(a => a.title.includes("Production Process"));
  const poloArticle = articles.find(a => a.title.includes("Polo"));
  const companyArticle = articles.find(a => a.title.includes("About Falcon"));

  const videos = [
    { title: "Screen Printing T-Shirt Tutorial", type: "video", url: "https://www.youtube.com/watch?v=MXNJpZTyLrI", description: "Step by step screen printing process on T-shirts", category: "printing", knowledgeArticleId: printingArticle?.id || null },
    { title: "Textile Manufacturing in Tiruppur", type: "video", url: "https://www.youtube.com/watch?v=n9CS_w_qR-Y", description: "One of the biggest textile manufacturers in Tiruppur", category: "process", knowledgeArticleId: processArticle?.id || null },
    { title: "T-Shirt Manufacturer in Tiruppur", type: "video", url: "https://www.youtube.com/watch?v=1HMnYzDqtxI", description: "T-shirt manufacturing and wholesale in Tiruppur", category: "products", knowledgeArticleId: poloArticle?.id || null },
    { title: "Corporate T-Shirt Embroidery", type: "video", url: "https://www.youtube.com/watch?v=PNsPxyW4zNM", description: "Corporate T-shirt manufacturing with embroidery in Tiruppur", category: "products", knowledgeArticleId: poloArticle?.id || null },
    { title: "Falcon Head Gear - Product Showcase", type: "video", url: "https://www.instagram.com/reel/C-AeTg2vYWU/", description: "Product showcase reel from Instagram", category: "products", knowledgeArticleId: poloArticle?.id || null },
    { title: "Falcon Head Gear - Instagram Reel", type: "video", url: "https://www.instagram.com/reel/DTU9qupEQC7/", description: "Falcon Head Gear product reel from Instagram", category: "company", knowledgeArticleId: companyArticle?.id || null },
  ];

  for (const v of videos) {
    await db.insert(mediaAssets).values(v);
  }
  console.log(`Added ${videos.length} video assets`);
}

async function ensureSuggestedQuestions() {
  const existing = await db.select().from(adminSettings).where(eq(adminSettings.key, "suggested_questions"));
  if (existing.length > 0) return;

  console.log("Adding suggested_questions setting...");
  await db.insert(adminSettings).values({
    key: "suggested_questions",
    value: JSON.stringify([
      "What types of T-shirts do you manufacture?",
      "What are the available GSM options for polo T-shirts?",
      "How do I place a bulk order for caps?",
      "What printing methods do you offer?",
      "What is the minimum order quantity?",
    ]),
  });
}

async function ensureEmbeddings() {
  const articlesWithoutEmbeddings = await db.select()
    .from(knowledgeArticles)
    .where(isNull(knowledgeArticles.embedding));

  if (articlesWithoutEmbeddings.length === 0) return;

  let generated = 0;
  let firstError: string | null = null;
  for (const article of articlesWithoutEmbeddings) {
    try {
      const text = `${article.title} ${article.category} ${article.content}`;
      const embedding = await generateEmbedding(text);
      const vectorStr = `[${embedding.join(",")}]`;
      await db.execute(sql`UPDATE knowledge_articles SET embedding = ${vectorStr}::vector WHERE id = ${article.id}`);
      generated++;
    } catch (err: unknown) {
      if (!firstError) {
        firstError = err instanceof Error ? err.message : String(err);
      }
      if (firstError?.includes("No OpenAI API key")) break;
    }
  }
  if (generated > 0) {
    console.log(`Generated embeddings for ${generated}/${articlesWithoutEmbeddings.length} articles`);
  } else if (firstError) {
    console.log(`Embeddings skipped: ${firstError}`);
  }
}

export async function seedDatabase() {
  await ensureVideoAssets();
  await ensureSuggestedQuestions();

  const [existing] = await db.select({ count: count() }).from(knowledgeArticles);
  if (existing.count > 0) {
    console.log("Database already seeded, skipping...");
    await ensureEmbeddings();
    return;
  }

  console.log("Seeding knowledge base...");

  const articles = [
    {
      title: "Polo T-Shirts Collection",
      content: "We manufacture high-quality polo T-shirts in various GSM options. Available styles include: Polo 180 GSM, Polo 200 GSM, Polo 220 GSM, 240 GSM Contrast, 240 GSM Plain, 240 GSM Raglan, Cut and Sew, Dryfit Polyester 180 GSM, Dryfit Polyester 200 GSM, and Dryfit Polyester 220 GSM. Polo T-shirts are ideal for corporate uniforms, promotional events, and casual branding. Available in multiple colors with options for custom logo embroidery or printing.",
      category: "products",
      sourceUrl: "https://www.meenaxtshirts.com/product/category/polos",
      tags: ["polo", "tshirt", "uniform", "corporate", "dryfit"],
    },
    {
      title: "Crew Neck T-Shirts Collection",
      content: "Our crew neck T-shirt range covers all GSM options for every need: Cotton 120 GSM, Cotton 140 GSM, Cotton 160 GSM Combed, Cotton 160 GSM Semicombed, Cotton 180 GSM Combed, Cotton 180 GSM Semicombed, Cotton 200 GSM, Cotton Interlock 220 GSM, Cotton Interlock 240 GSM, and Poly Cotton 140 GSM. Crew neck T-shirts are perfect for promotional campaigns, events, team uniforms, and everyday branding. We offer both round neck and V-neck options.",
      category: "products",
      sourceUrl: "https://www.meenaxtshirts.com/product/category/crew-neck",
      tags: ["crew-neck", "round-neck", "cotton", "tshirt", "promotional"],
    },
    {
      title: "Winter Wear - Fleece Collection",
      content: "Stay warm with our premium fleece collection including: Fleece Crew Necks (sweatshirts), Jackets (zip-up and pullover styles), and Track Pants. Made with high-quality fleece fabric for maximum warmth and comfort. Ideal for corporate winter uniforms, team outfits, and branded winter merchandise. Available in multiple colors with custom printing and embroidery options.",
      category: "products",
      sourceUrl: "https://www.meenaxtshirts.com/product/category/fleece",
      tags: ["winter", "fleece", "jacket", "sweatshirt", "trackpants"],
    },
    {
      title: "Sublimation Printed Garments",
      content: "Our sublimation printing service delivers vibrant, full-color all-over prints on polyester garments. Sublimation printing creates designs that become part of the fabric, ensuring they never crack, peel, or fade. Perfect for sportswear, team jerseys, fashion statements, and promotional merchandise with photographic-quality prints. Available on crew neck and polo styles.",
      category: "products",
      sourceUrl: "https://www.meenaxtshirts.com/product/category/sublimation",
      tags: ["sublimation", "printing", "allover", "polyester", "sportswear"],
    },
    {
      title: "Custom Caps Manufacturing",
      content: "Falcon Head Gear specializes in premium custom cap manufacturing with advanced embroidery and printing technology. We offer: Baseball caps, Snapback caps, Trucker caps, Dad caps, 5-panel and 6-panel caps, Bucket hats, Visors, and Sports caps. All caps feature durable construction, precise stitching, and vibrant embroidery or printing. Ideal for corporate branding, promotional events, sports teams, and retail. PDF catalogue available for download.",
      category: "products",
      sourceUrl: "https://falconheadgear.com/our-products/",
      tags: ["caps", "headgear", "embroidery", "baseball", "snapback", "trucker"],
    },
    {
      title: "Uniform Manufacturing",
      content: "We manufacture professional uniforms for various sectors: Corporate uniforms, School uniforms, Industrial uniforms, Hospital/medical uniforms, Hotel/hospitality uniforms, and Security uniforms. Each uniform is designed for comfort, durability, and a sharp professional appearance. We handle the entire process from design consultation to bulk production with custom logos, labels, and finishing touches. Our uniforms use premium fabrics tested for color fastness and shrinkage resistance.",
      category: "products",
      sourceUrl: "https://falconheadgear.com/uniforms/",
      tags: ["uniforms", "corporate", "school", "industrial", "professional"],
    },
    {
      title: "Understanding GSM - Fabric Weight Guide",
      content: "GSM (Grams per Square Meter) indicates the weight and thickness of fabric. Here's a guide:\n\n120-140 GSM: Ultra-lightweight, great for promotional giveaway T-shirts, summer events. Very affordable.\n\n150-160 GSM: Light, everyday casual wear. Good for large volume promotional orders.\n\n170-180 GSM: Standard quality, the most popular range. Comfortable for daily wear with good durability.\n\n190-200 GSM: Premium quality, feels substantial and drapes well. Ideal for branded merchandise.\n\n220-240 GSM: Heavy weight, premium feel. Perfect for winter wear, oversized styles, and luxury branding.\n\n240+ GSM: Extra heavy, used for sweatshirts, hoodies, and winter collections.\n\nHigher GSM generally means better quality, more opacity, and longer lasting garments but also higher cost per piece.",
      category: "fabrics",
      tags: ["gsm", "weight", "fabric", "quality", "thickness"],
    },
    {
      title: "Cotton Types and Fabric Options",
      content: "We offer various fabric options:\n\nCombed Cotton: Higher quality, smoother, softer finish. Combing removes short fibers and impurities, resulting in a stronger, more uniform yarn. Ideal for premium T-shirts.\n\nSemicombed Cotton: Good quality at a more affordable price. Partially processed to remove some short fibers. Suitable for bulk orders and promotional wear.\n\n100% Cotton: Pure cotton fabric, breathable and comfortable. Available in various GSM options.\n\nPoly Cotton: Blend of polyester and cotton (usually 60/40 or 65/35). More durable, wrinkle-resistant, and retains shape better. Good for uniforms.\n\nDryfit Polyester: 100% moisture-wicking polyester fabric. Keeps the wearer cool and dry. Ideal for sportswear and active wear.\n\nCotton Interlock: Double-knit fabric with smooth surfaces on both sides. Thicker and more stable. Used for premium polo T-shirts and formal wear.\n\nFleece: Soft, warm fabric made from polyester or cotton-poly blend. Used for sweatshirts, jackets, and winter wear.\n\nOrganic Cotton: GOTS-certified organic cotton available for eco-conscious brands.",
      category: "fabrics",
      tags: ["cotton", "combed", "semicombed", "polyester", "dryfit", "interlock", "organic"],
    },
    {
      title: "Printing Methods Available",
      content: "We offer comprehensive printing solutions:\n\nScreen Printing: Most popular and cost-effective for large batches. Best for solid colors and simple designs. Produces vibrant, long-lasting prints. Minimum: 50 pieces per color.\n\nSublimation Printing: Full-color, photographic quality all-over printing. The design becomes part of the fabric (won't crack or peel). Only works on polyester/poly-blend fabrics.\n\nEmbroidery: Premium, professional finish for logos and text. Uses computerized embroidery machines for precise, consistent results. Ideal for corporate branding.\n\nDTG (Direct to Garment): Digital printing directly on fabric. Good for complex designs with many colors. Ideal for small batches or one-off designs.\n\nHeat Transfer: Versatile method for applying designs using heat and pressure. Good for names, numbers, and detailed graphics.\n\nDischarge Printing: Removes dye from dark fabrics and replaces with design color. Creates a soft, vintage feel.\n\nFoil Printing: Metallic finish for eye-catching designs. Available in gold, silver, and colored foils.\n\nPuff Printing: 3D raised effect for text and designs. Creates a tactile, premium feel.",
      category: "printing",
      tags: ["screen", "sublimation", "embroidery", "dtg", "heat-transfer", "foil", "puff"],
    },
    {
      title: "T-Shirt Care Instructions",
      content: "Proper care extends the life of your T-shirts:\n\nWashing:\n- Turn T-shirts inside out before washing to protect prints and colors\n- Wash in cold water (30C or below) to prevent shrinkage and color fading\n- Use mild detergent; avoid bleach\n- Wash similar colors together\n- Don't overload the washing machine\n\nDrying:\n- Air dry in shade when possible; avoid direct sunlight which fades colors\n- If using a dryer, use low heat setting\n- Remove promptly to prevent wrinkles\n- Never wring or twist; gently squeeze excess water\n\nIroning:\n- Iron inside out on medium heat\n- Avoid ironing directly over prints or embroidery\n- Use a pressing cloth over printed areas\n- Steam iron works best for removing wrinkles\n\nFolding & Storage:\n- Fold neatly along the center and then in thirds\n- Store in a cool, dry place\n- Use cedar or lavender to repel moths\n- Don't hang heavy T-shirts on hangers (causes shoulder bumps)\n- Stack folded T-shirts; don't overstuff drawers\n\nFor embroidered garments: Hand wash or use delicate cycle. Avoid soaking for extended periods.",
      category: "care",
      tags: ["washing", "folding", "ironing", "storage", "care", "maintenance"],
    },
    {
      title: "Cap Care and Maintenance",
      content: "Keep your caps looking fresh with proper care:\n\nCleaning:\n- Spot clean stains with mild soap and a soft brush\n- For deep cleaning, hand wash in lukewarm water with mild detergent\n- Never put caps in a washing machine or dishwasher\n- Rinse thoroughly to remove all soap\n\nDrying:\n- Shape the cap over a round object (like a ball or bowl) to maintain form\n- Air dry away from direct sunlight\n- Never use a dryer — heat damages the brim and structure\n- Stuff the crown with towels to hold shape while drying\n\nStorage:\n- Store on a cap rack or shelf to maintain shape\n- Never stack heavy items on top of caps\n- Keep in a cool, dry place\n- Use hat boxes for long-term storage\n- For embroidered caps, store with the embroidered side facing up\n\nBrim Care:\n- Don't bend or crease the brim excessively\n- Use a brim template to reshape if needed\n- For curved brims, use a mug or cup to maintain the curve",
      category: "care",
      tags: ["cap", "hat", "cleaning", "maintenance", "storage", "brim"],
    },
    {
      title: "Minimum Order Quantity (MOQ) & Pricing",
      content: "Our MOQ and pricing structure:\n\nT-Shirts:\n- Minimum order: 50 pieces per style/color\n- Basic plain T-shirts (120-140 GSM): Starting from Rs 90-150 per piece\n- Standard quality (180-200 GSM): Rs 150-200 per piece\n- Premium quality (220-240 GSM): Rs 200-275 per piece\n- Bulk orders (1000+ pieces) receive 10-30% discount\n\nCaps:\n- Minimum order varies by design and customization\n- Contact us for exact MOQ and pricing\n- Bulk discounts available for orders above 500 pieces\n\nUniforms:\n- Minimum order: 100 pieces per style\n- Pricing depends on fabric, design, and customization\n- Volume discounts for institutional orders\n\nNote: All prices are indicative and vary based on fabric type, GSM, printing/embroidery complexity, and order quantity. Contact our sales team for an accurate quote.\n\nPayment Terms:\n- 30-50% advance payment\n- Balance before shipment\n- Bank transfer (NEFT/RTGS) preferred\n- LC accepted for large export orders",
      category: "pricing",
      tags: ["moq", "minimum-order", "pricing", "bulk", "discount", "payment"],
    },
    {
      title: "Production Process & Timeline",
      content: "Our manufacturing process:\n\n1. Requirement Discussion: Share your design, quantity, fabric, and customization needs\n2. Quotation: Receive detailed pricing within 24-48 hours\n3. Sample Development: We create samples for approval (5-7 working days)\n4. Sample Approval: You review and approve fit, fabric, color, and print quality\n5. Advance Payment: 30-50% payment to confirm order\n6. Production: Bulk manufacturing begins\n   - Small orders (50-500 pcs): 10-15 working days\n   - Medium orders (500-2000 pcs): 15-20 working days\n   - Large orders (2000+ pcs): 20-30 working days\n7. Quality Inspection: Each garment inspected for defects, measurements, and print quality\n8. Finishing: Washing, pressing, labeling, and packaging\n9. Dispatch: Shipped to your location\n\nRush Orders: Available with 10-15 day turnaround at additional charges\n\nProduction Capacity: 50,000-150,000 pieces per month across all product lines",
      category: "process",
      tags: ["production", "timeline", "manufacturing", "process", "lead-time", "capacity"],
    },
    {
      title: "Customization Options",
      content: "Full customization available for all products:\n\nDesign Customization:\n- Custom colors (Pantone matching available)\n- Custom cuts and fits (Regular, Slim, Oversized, Relaxed)\n- Custom necklines (Round, V-neck, Polo, Henley)\n- Raglan sleeves, contrast panels, piping\n- Cut-and-sew options for unique designs\n\nBranding Options:\n- Custom neck labels (woven or printed)\n- Hang tags with your brand\n- Custom packaging (poly bags, cartons)\n- Private labeling / White labeling\n- Custom size labels\n\nLogo Application:\n- Chest embroidery\n- Back printing (full or partial)\n- Sleeve printing\n- All-over sublimation\n- Multiple print locations\n\nDesign Assistance:\n- Our in-house design team can help create tech packs\n- Pattern making and grading\n- Color suggestions based on trends\n- Mockup and visualization before production",
      category: "products",
      tags: ["customization", "branding", "logo", "design", "private-label", "pantone"],
    },
    {
      title: "About Falcon Head Gear",
      content: "Falcon Head Gear is a specialized manufacturer of premium caps and T-shirts based in Tiruppur, Tamil Nadu, India. We focus on high-quality cap and T-shirt manufacturing and printing designed for branding, promotions, and corporate identity.\n\nWe combine comfort, durability, premium print quality, and a powerful brand presence in every product. With advanced embroidery and printing technology along with strict quality control, we ensure consistency and excellence in every order.\n\nOur services include: Clothing Design, Sample Production, Consultation, Mass Production, Pattern Making, and Fashion Branding.\n\nContact:\n- Phone: 80123 45434\n- Email: sales@falconheadgear.com\n- Address: SF.NO.31/4C, Chellam Nagar, Andipalayam, Tiruppur-641687\n- Facebook, Instagram (@falcon.head.gear), LinkedIn available",
      category: "company",
      sourceUrl: "https://falconheadgear.com/about-us/",
      tags: ["falcon", "about", "company", "tiruppur", "manufacturer"],
    },
    {
      title: "About Meenax T-Shirts",
      content: "Meenax T-shirts is a trusted T-shirt manufacturer based in Tiruppur, Tamil Nadu — known as the knitwear capital of India. We offer affordable, branded T-shirts for uniforms, promotions, winter wear, and printed garments.\n\nOur product categories include: Polo T-shirts (Uniform wear), Crew Neck T-shirts (Promotional wear), Fleece/Winter Wear, and Sublimation Printed Garments.\n\nClient Testimonials:\n- 'Good quality shirts at very reasonable prices and very quick delivery, well recommended.' - Dilip, Chennai\n- 'Super fast turnaround on our order which enabled us to meet our deadline and great quality printing and T-shirts for a great price.' - Agarwal, Bangalore\n\nContact: WhatsApp +91 8825452704",
      category: "company",
      sourceUrl: "https://www.meenaxtshirts.com",
      tags: ["meenax", "about", "company", "tiruppur", "affordable"],
    },
    {
      title: "Frequently Asked Questions",
      content: "Q: What types of Caps and T-shirts do you manufacture?\nA: We manufacture corporate caps and T-shirts, promotional wear, sportswear, school uniforms, and fully customized branded caps and printed T-shirts.\n\nQ: Do you offer custom logo embroidery or printing?\nA: Yes, we provide high-quality embroidery and printing options to match your brand identity.\n\nQ: What is the minimum order quantity for caps?\nA: Our minimum order quantity depends on the design and customization requirements. Contact us for exact details.\n\nQ: How long does bulk production take?\nA: Typical bulk production takes 15-30 days depending on quantity and customization complexity.\n\nQ: Do you provide samples before bulk orders?\nA: Yes, we provide samples for approval before starting mass production. Sample charges may apply.\n\nQ: Can you match Pantone colors?\nA: Yes, we offer Pantone color matching for custom dyeing.\n\nQ: Do you export internationally?\nA: Yes, we export to USA, UK, Europe, Australia, Middle East, Africa, and Southeast Asia.\n\nQ: What certifications do you have?\nA: We follow Oeko-Tex standards and maintain strict quality control processes.",
      category: "faq",
      sourceUrl: "https://falconheadgear.com",
      tags: ["faq", "questions", "answers", "common", "help"],
    },
    {
      title: "Export and Shipping Information",
      content: "We are established exporters serving clients worldwide:\n\nExport Markets: USA, UK, Europe, Australia, UAE, Saudi Arabia, Bahrain, Africa, Southeast Asia\n\nShipping Options:\n- Domestic: Courier and logistics partners across India\n- International: FOB (Free on Board) and CIF (Cost, Insurance, Freight) terms available\n\nExport Documentation:\n- GST/IGST documentation\n- Export certifications\n- Custom clearance support\n- Commercial invoice and packing list\n\nQuality Certifications:\n- Oeko-Tex Standard 100 compliance\n- AZO-free dyes\n- Color fastness testing\n- Shrinkage testing\n- Dimensional stability checks\n\nPacking:\n- Individual poly bag packing\n- Size-wise and color-wise sorting\n- Master carton packing\n- Custom packing as per buyer requirement\n\nFor international inquiries, contact our export team at sales@falconheadgear.com",
      category: "process",
      tags: ["export", "shipping", "international", "logistics", "certification", "packing"],
    },
    {
      title: "Quality Control Standards",
      content: "Our comprehensive quality control process ensures every garment meets the highest standards:\n\nFabric Testing:\n- GSM verification for every fabric lot\n- Color fastness testing (wash, light, rubbing)\n- Shrinkage testing (max 3-5%)\n- Pilling resistance testing\n- AZO-free dye verification\n\nProduction QC:\n- 4-point fabric inspection before cutting\n- Pattern accuracy check\n- Stitching quality inspection (SPI count)\n- Seam strength testing\n- Measurement verification at multiple stages\n\nPrint/Embroidery QC:\n- Color matching against approved sample\n- Print adhesion testing\n- Embroidery thread density check\n- Placement accuracy verification\n\nFinal Inspection:\n- 100% inspection for visible defects\n- Random AQL sampling for shipments\n- Metal detection (for export orders)\n- Packaging quality check\n\nBio-wash and enzyme wash treatments available for softer finish.\nPre-shrinkage treatment applied to all garments.\nSilicone softener treatment for premium feel.",
      category: "process",
      tags: ["quality", "inspection", "testing", "standards", "control", "aql"],
    },
    {
      title: "How to Place an Order",
      content: "Ordering is simple and straightforward:\n\nStep 1: Share Your Requirements\n- T-shirt/cap style and fit preference\n- Fabric type and GSM\n- Color(s) and size breakdown\n- Printing or embroidery details (share your logo/design files)\n- Desired quantity\n- Delivery location and timeline\n\nStep 2: Get a Quote\n- We'll send a detailed quotation within 24-48 hours\n- Quote includes per-piece price, sample charges, and delivery timeline\n\nStep 3: Sample Approval\n- We'll produce samples for your review\n- You approve fit, fabric, color, and print quality\n- Modifications can be made at this stage\n\nStep 4: Confirm Order\n- Pay 30-50% advance to start production\n- Receive order confirmation with delivery schedule\n\nStep 5: Production & Delivery\n- Regular updates during production\n- Quality inspection before dispatch\n- Balance payment before shipping\n- Tracking details shared for shipment\n\nContact us to get started:\n- WhatsApp: +91 8825452704 (Meenax) or 80123 45434 (Falcon Head Gear)\n- Email: sales@falconheadgear.com",
      category: "faq",
      tags: ["order", "how-to", "process", "steps", "quote", "sample"],
    },
  ];

  const createdArticles = [];
  for (const article of articles) {
    const [created] = await db.insert(knowledgeArticles).values(article).returning();
    createdArticles.push(created);
  }

  console.log(`Seeded ${createdArticles.length} knowledge articles`);

  const media = [
    { title: "Caps Product Catalogue (PDF)", type: "pdf", url: "https://falconheadgear.com/wp-content/uploads/2026/02/cap-products.pdf", description: "Complete caps catalogue with all styles and specifications", category: "products" },
    { title: "T-Shirts Product Catalogue (PDF)", type: "pdf", url: "https://falconheadgear.com/wp-content/uploads/2026/02/T-shirt-products.pdf", description: "Complete T-shirts catalogue with all styles and specifications", category: "products" },
    { title: "Cap Manufacturing Gallery", type: "image", url: "https://falconheadgear.com/wp-content/uploads/2026/02/cap-image-7.webp", description: "Premium cap manufacturing", category: "products" },
    { title: "Custom Caps Collection", type: "image", url: "https://falconheadgear.com/wp-content/uploads/2026/02/cap-image-8.webp", description: "Custom branded caps", category: "products" },
    { title: "T-Shirt Printing Quality", type: "image", url: "https://falconheadgear.com/wp-content/uploads/2026/02/T-shirt-7-1.webp", description: "High quality T-shirt printing", category: "products" },
    { title: "Corporate T-Shirts", type: "image", url: "https://falconheadgear.com/wp-content/uploads/2026/02/T-Shirt-3.webp", description: "Corporate branded T-shirts", category: "products" },
    { title: "Uniform Collection", type: "image", url: "https://falconheadgear.com/wp-content/uploads/2026/03/uniform-5.webp", description: "Professional uniforms", category: "products" },
    { title: "Premium Finish T-Shirts", type: "image", url: "https://falconheadgear.com/wp-content/uploads/2026/02/T-Shirt-10.webp", description: "Premium printed T-shirts", category: "products" },
    { title: "Manufacturing Process", type: "image", url: "https://falconheadgear.com/wp-content/uploads/2026/02/About-Us.webp", description: "Our manufacturing facility", category: "company" },
    { title: "Caps & T-Shirts Range", type: "image", url: "https://falconheadgear.com/wp-content/uploads/2026/02/Caps-T-Shirts-1024x597.webp", description: "Complete caps and T-shirts range", category: "products" },
    { title: "Creative Designs Service", type: "image", url: "https://falconheadgear.com/wp-content/uploads/2026/02/Creative-Designs-1024x597.webp", description: "Our creative design capabilities", category: "company" },
    { title: "Fast Delivery Service", type: "image", url: "https://falconheadgear.com/wp-content/uploads/2026/02/Fast-Delivery-1024x597.webp", description: "Quick production and delivery", category: "company" },
    { title: "Screen Printing T-Shirt Tutorial", type: "video", url: "https://www.youtube.com/watch?v=MXNJpZTyLrI", description: "Step by step screen printing process on T-shirts", category: "printing" },
    { title: "Textile Manufacturing in Tiruppur", type: "video", url: "https://www.youtube.com/watch?v=n9CS_w_qR-Y", description: "One of the biggest textile manufacturers in Tiruppur", category: "process" },
    { title: "T-Shirt Manufacturer in Tiruppur", type: "video", url: "https://www.youtube.com/watch?v=1HMnYzDqtxI", description: "T-shirt manufacturing and wholesale in Tiruppur", category: "products" },
    { title: "Corporate T-Shirt Embroidery", type: "video", url: "https://www.youtube.com/watch?v=PNsPxyW4zNM", description: "Corporate T-shirt manufacturing with embroidery in Tiruppur", category: "products" },
    { title: "Falcon Head Gear - Product Showcase", type: "video", url: "https://www.instagram.com/reel/C-AeTg2vYWU/", description: "Product showcase reel from Instagram", category: "products" },
    { title: "Falcon Head Gear - Instagram Reel", type: "video", url: "https://www.instagram.com/reel/DTU9qupEQC7/", description: "Falcon Head Gear product reel from Instagram", category: "company" },
  ];

  for (let i = 0; i < 15; i++) {
    media.push({
      title: `Instagram Product Showcase ${i + 1}`,
      type: "image",
      url: `/images/instagram/instagram-${i}.png`,
      description: `Product showcase from Instagram @falcon.head.gear`,
      category: "products",
    });
  }

  const capsArticle = createdArticles.find(a => a.title.includes("Custom Caps"));
  const tshirtArticle = createdArticles.find(a => a.title.includes("Polo T-Shirts"));
  const companyArticle = createdArticles.find(a => a.title.includes("About Falcon"));
  const uniformArticle = createdArticles.find(a => a.title.includes("Uniform"));

  const printingArticle = createdArticles.find(a => a.title.includes("Printing"));
  const processArticle = createdArticles.find(a => a.title.includes("Production Process"));

  for (const m of media) {
    let articleId = null;
    if (m.category === "printing") {
      articleId = printingArticle?.id;
    } else if (m.category === "process") {
      articleId = processArticle?.id;
    } else if (m.category === "products" && m.title.toLowerCase().includes("cap")) {
      articleId = capsArticle?.id;
    } else if (m.category === "products" && m.title.toLowerCase().includes("t-shirt")) {
      articleId = tshirtArticle?.id;
    } else if (m.category === "products" && m.title.toLowerCase().includes("uniform")) {
      articleId = uniformArticle?.id;
    } else if (m.category === "company") {
      articleId = companyArticle?.id;
    }

    await db.insert(mediaAssets).values({
      ...m,
      knowledgeArticleId: articleId,
    });
  }

  console.log(`Seeded ${media.length} media assets`);

  const defaultSettings = [
    { key: "brand_name", value: "Falcon Head Gear" },
    { key: "brand_tagline", value: "& Meenax T-Shirts" },
    { key: "brand_location", value: "Tiruppur, India — Knitwear Capital" },
    { key: "brand_address", value: "SF.NO.31/4C, Chellam Nagar, Andipalayam, Tiruppur-641687" },
    { key: "brand_whatsapp", value: "+918825452704" },
    { key: "social_instagram", value: "https://www.instagram.com/falcon.head.gear/" },
    { key: "social_facebook", value: "https://www.facebook.com/FalconHeadGear" },
    { key: "social_linkedin", value: "https://www.linkedin.com/company/falcon-head-gear/" },
    { key: "home_hero_title", value: "Premium T-Shirts, Caps & Custom Garment Manufacturing" },
    { key: "home_hero_description", value: "We manufacture high-quality T-shirts, caps, uniforms, and winter wear with custom printing, embroidery, and branding. Serving businesses worldwide from Tiruppur, Tamil Nadu." },
    { key: "site_password", value: "" },
    { key: "bot_name", value: "Supplier Assistant" },
    { key: "welcome_message", value: "Hi! I'm your Supplier Assistant. I can help you with product information, pricing, fabric details, printing methods, and much more. How can I assist you today?" },
    { key: "system_prompt", value: "You are a friendly supplier assistant for Falcon Head Gear and Meenax T-shirts, garment manufacturers in Tiruppur, India.\n\nCRITICAL RULE — ONLY USE PROVIDED DATA:\n- You MUST answer ONLY based on the knowledge base articles provided below under \"Relevant Knowledge Base Articles\".\n- If the knowledge base does NOT contain the information needed to answer the question, respond with something like: \"I'm sorry, I don't have that information in our knowledge base right now. Please reach out to our team for help.\"\n- NEVER make up, guess, or invent information that is not in the provided articles. This is extremely important.\n- If the articles only partially cover the question, answer with what is available and mention that for more details they should contact the team." },
    { key: "contact_phone", value: "80123 45434 / +91 8825452704" },
    { key: "contact_email", value: "sales@falconheadgear.com" },
    { key: "openai_model", value: "gpt-4o-mini" },
    { key: "meta_access_token", value: "" },
    { key: "meta_phone_number_id", value: "" },
    { key: "meta_app_secret", value: "" },
    { key: "meta_verify_token", value: "chatbot_verify_2025" },
    { key: "meta_welcome_template", value: "lead_welcome" },
    { key: "meta_template_language", value: "en_US" },
    { key: "suggested_questions", value: JSON.stringify([
      "What types of T-shirts do you manufacture?",
      "What are the available GSM options for polo T-shirts?",
      "How do I place a bulk order for caps?",
      "What printing methods do you offer?",
      "What is the minimum order quantity?",
    ]) },
  ];

  for (const setting of defaultSettings) {
    await db.insert(adminSettings).values(setting).onConflictDoNothing();
  }

  const [existingWidget] = await db.select({ count: count() }).from(widgetConfigs);
  if (existingWidget.count === 0) {
    await db.insert(widgetConfigs).values({
      name: "Default Widget",
      domain: "*",
      primaryColor: "#2563eb",
      welcomeMessage: "Hi! I'm your Supplier Assistant. How can I help you today?",
      botName: "Supplier Assistant",
      isActive: true,
    });
  }

  await ensureEmbeddings();
  console.log("Database seeding complete!");
}

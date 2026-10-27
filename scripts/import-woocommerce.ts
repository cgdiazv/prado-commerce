import { PrismaClient, Prisma, StockStatus, ProductStatus, ProductType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const WOO_BASE_URL = process.env.WOO_URL || "https://rkmaternity.shop";
const WOO_KEY = process.env.WOO_KEY || process.argv[2] || "";
const WOO_SECRET = process.env.WOO_SECRET || process.argv[3] || "";
const TARGET_STORE_SLUG = process.env.TARGET_STORE_SLUG || "rkj-maternity";

if (!WOO_KEY || !WOO_SECRET) {
  console.error("❌ Please provide WOO_KEY and WOO_SECRET via environment variables or CLI arguments:");
  console.error("   npx tsx scripts/import-woocommerce.ts <ck_key> <cs_secret>");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const authHeader = "Basic " + Buffer.from(`${WOO_KEY}:${WOO_SECRET}`).toString("base64");

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapStockStatus(status: string): StockStatus {
  if (status === "outofstock") return "OUT_OF_STOCK";
  if (status === "onbackorder") return "ON_BACKORDER";
  return "IN_STOCK";
}

function resolveInventory(item: any): number {
  if (item.manage_stock && item.stock_quantity !== null && item.stock_quantity !== undefined) {
    return Math.max(0, parseInt(String(item.stock_quantity), 10) || 0);
  }
  return item.stock_status === "instock" ? 50 : 0;
}

function resolvePrices(item: any) {
  const activePriceStr = item.price || item.regular_price || "0";
  const regularPriceStr = item.regular_price || null;
  const salePriceStr = item.sale_price || null;

  const priceNum = parseFloat(activePriceStr) || 0;
  const price = new Prisma.Decimal(priceNum.toFixed(2));

  let compareAtPrice: Prisma.Decimal | null = null;
  if (regularPriceStr) {
    const regNum = parseFloat(regularPriceStr);
    if (!isNaN(regNum) && regNum > priceNum) {
      compareAtPrice = new Prisma.Decimal(regNum.toFixed(2));
    }
  }

  return { price, compareAtPrice };
}

async function fetchWooJson(endpoint: string) {
  const url = `${WOO_BASE_URL.replace(/\/+$/, "")}/wp-json/wc/v3/${endpoint.replace(/^\/+/, "")}`;
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      "User-Agent": "PradoCommerce-WooImporter/1.0",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WooCommerce API error (${res.status} ${res.statusText}): ${errText}`);
  }

  return res.json();
}

async function fetchAllWooProducts(): Promise<any[]> {
  const allProducts: any[] = [];
  let page = 1;
  const perPage = 50;

  console.log(`📡 Fetching products from WooCommerce (${WOO_BASE_URL})...`);
  while (true) {
    const items = await fetchWooJson(`products?page=${page}&per_page=${perPage}`);
    if (!items || !items.length) break;
    allProducts.push(...items);
    console.log(`   Page ${page}: received ${items.length} products (total so far: ${allProducts.length})`);
    if (items.length < perPage) break;
    page++;
  }

  return allProducts;
}

async function main() {
  console.log("=================================================");
  console.log("   PRADO COMMERCE - WOOCOMMERCE ONE-TIME IMPORT   ");
  console.log("=================================================");

  const store = await prisma.store.findUnique({
    where: { slug: TARGET_STORE_SLUG },
    include: {
      ownerUser: true,
      categories: true,
    },
  });

  if (!store) {
    console.error(`❌ Store with slug "${TARGET_STORE_SLUG}" not found!`);
    process.exit(1);
  }

  console.log(`🏬 Target Store: ${store.name} (${store.id})`);
  console.log(`👤 Owner: ${store.ownerUser?.name || store.ownerUser?.email || "Unknown"}`);

  // Upgrade owner plan to PRO if on STARTER, so that 135 products are allowed by platform limits
  if (store.ownerUser && store.ownerUser.plan === "STARTER") {
    console.log("⬆️  Upgrading store owner plan from STARTER to PRO to support 50+ products...");
    await prisma.merchantUser.update({
      where: { id: store.ownerUser.id },
      data: { plan: "PRO" },
    });
    console.log("✅ Owner plan upgraded to PRO.");
  }

  const wooProducts = await fetchAllWooProducts();
  console.log(`\n📦 Total products to process: ${wooProducts.length}`);

  // 1. Sync Categories
  console.log("\n📁 Syncing Categories...");
  const categoryMap = new Map<string, string>(); // slug -> categoryId
  for (const cat of store.categories) {
    categoryMap.set(cat.slug, cat.id);
  }

  const allWooCategories = new Map<string, string>(); // slug -> name
  for (const prod of wooProducts) {
    if (Array.isArray(prod.categories)) {
      for (const cat of prod.categories) {
        if (cat.slug && cat.name) {
          allWooCategories.set(cat.slug, cat.name);
        }
      }
    }
  }

  for (const [catSlug, catName] of allWooCategories.entries()) {
    if (!categoryMap.has(catSlug)) {
      const createdCat = await prisma.category.upsert({
        where: {
          storeId_slug: {
            storeId: store.id,
            slug: catSlug,
          },
        },
        create: {
          storeId: store.id,
          slug: catSlug,
          name: catName,
        },
        update: {
          name: catName,
        },
      });
      categoryMap.set(catSlug, createdCat.id);
      console.log(`   + Created category: "${catName}" (${catSlug})`);
    } else {
      console.log(`   ✓ Category exists: "${catName}"`);
    }
  }

  // 2. Import Products and Variants
  console.log("\n📦 Importing Products & Variants...");
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const usedSlugs = new Set<string>();

  for (let i = 0; i < wooProducts.length; i++) {
    const wp = wooProducts[i];
    const indexLabel = `[${i + 1}/${wooProducts.length}]`;
    const title = (wp.name || "").trim();

    if (!title) {
      console.warn(`⚠️  ${indexLabel} Skipping product with no title (ID: ${wp.id})`);
      skippedCount++;
      continue;
    }

    let slug = toSlug(wp.slug || title);
    if (!slug) slug = `product-${wp.id}`;

    // Ensure unique slug within store
    let finalSlug = slug;
    let suffix = 1;
    while (usedSlugs.has(finalSlug)) {
      finalSlug = `${slug}-${suffix++}`;
    }
    usedSlugs.add(finalSlug);

    const description = wp.description || wp.short_description || null;
    const images: string[] = [];
    if (Array.isArray(wp.images)) {
      for (const img of wp.images) {
        if (img.src && typeof img.src === "string" && !images.includes(img.src)) {
          images.push(img.src);
        }
      }
    }

    const status: ProductStatus = wp.status === "publish" ? "ACTIVE" : "DRAFT";
    const productType: ProductType = "PHYSICAL";

    // Associated categories
    const prodCategoryIds: string[] = [];
    if (Array.isArray(wp.categories)) {
      for (const cat of wp.categories) {
        const cId = categoryMap.get(cat.slug);
        if (cId && !prodCategoryIds.includes(cId)) {
          prodCategoryIds.push(cId);
        }
      }
    }
    const primaryCategoryId = prodCategoryIds[0] || null;

    // Check if product already exists
    const existingProduct = await prisma.product.findUnique({
      where: {
        storeId_slug: {
          storeId: store.id,
          slug: finalSlug,
        },
      },
      select: { id: true },
    });

    const product = await prisma.product.upsert({
      where: {
        storeId_slug: {
          storeId: store.id,
          slug: finalSlug,
        },
      },
      create: {
        storeId: store.id,
        title,
        slug: finalSlug,
        description,
        images,
        status,
        productType,
        featured: Boolean(wp.featured),
        categoryId: primaryCategoryId,
        categories: prodCategoryIds.length > 0 ? {
          connect: prodCategoryIds.map((id) => ({ id })),
        } : undefined,
      },
      update: {
        title,
        description,
        images: images.length > 0 ? images : undefined,
        status,
        featured: Boolean(wp.featured),
        categoryId: primaryCategoryId,
        categories: prodCategoryIds.length > 0 ? {
          set: prodCategoryIds.map((id) => ({ id })),
        } : undefined,
      },
    });

    if (existingProduct) {
      updatedCount++;
    } else {
      createdCount++;
    }

    // Process Variants
    if (wp.type === "variable") {
      let variations: any[] = [];
      try {
        variations = await fetchWooJson(`products/${wp.id}/variations?per_page=100`);
      } catch (err: any) {
        console.warn(`   ⚠️ Could not fetch variations for ${wp.id}: ${err.message}`);
      }

      if (variations.length > 0) {
        for (const v of variations) {
          // If variation has image, add to product images if missing
          if (v.image?.src && !images.includes(v.image.src)) {
            images.push(v.image.src);
            await prisma.product.update({
              where: { id: product.id },
              data: { images },
            });
          }

          let varTitle = "";
          const optionsObj: Record<string, string> = {};
          if (Array.isArray(v.attributes)) {
            const parts = v.attributes.map((a: any) => {
              const opt = a.option || "";
              const name = a.name || "Option";
              optionsObj[name] = opt;
              return `${name}: ${opt}`;
            });
            varTitle = parts.join(", ");
          }
          if (!varTitle) {
            varTitle = v.name || `Variation #${v.id}`;
          }

          const { price, compareAtPrice } = resolvePrices(v);
          const inventory = resolveInventory(v);
          const stockStatus = mapStockStatus(v.stock_status);
          const sku = v.sku || null;

          const existingVar = await prisma.productVariant.findFirst({
            where: {
              productId: product.id,
              OR: [
                ...(sku ? [{ sku }] : []),
                { title: varTitle },
              ],
            },
          });

          if (existingVar) {
            await prisma.productVariant.update({
              where: { id: existingVar.id },
              data: {
                title: varTitle,
                sku,
                price,
                compareAtPrice,
                inventory,
                stockStatus,
                options: optionsObj,
              },
            });
          } else {
            await prisma.productVariant.create({
              data: {
                productId: product.id,
                title: varTitle,
                sku,
                price,
                compareAtPrice,
                inventory,
                stockStatus,
                options: optionsObj,
              },
            });
          }
        }
        console.log(`   ${indexLabel} ${existingProduct ? "Updated" : "Created"} [Variable]: "${title}" with ${variations.length} variations`);
      } else {
        // Fallback for variable product with no variations returned
        const { price, compareAtPrice } = resolvePrices(wp);
        const inventory = resolveInventory(wp);
        const stockStatus = mapStockStatus(wp.stock_status);
        const sku = wp.sku || null;

        await prisma.productVariant.upsert({
          where: {
            id: (await prisma.productVariant.findFirst({ where: { productId: product.id } }))?.id || "none",
          },
          create: {
            productId: product.id,
            title: "Default",
            sku,
            price,
            compareAtPrice,
            inventory,
            stockStatus,
          },
          update: {
            sku,
            price,
            compareAtPrice,
            inventory,
            stockStatus,
          },
        });
        console.log(`   ${indexLabel} ${existingProduct ? "Updated" : "Created"} [Variable fallback]: "${title}"`);
      }
    } else {
      // Simple product
      const { price, compareAtPrice } = resolvePrices(wp);
      const inventory = resolveInventory(wp);
      const stockStatus = mapStockStatus(wp.stock_status);
      const sku = wp.sku || null;

      const existingVar = await prisma.productVariant.findFirst({
        where: { productId: product.id },
      });

      if (existingVar) {
        await prisma.productVariant.update({
          where: { id: existingVar.id },
          data: {
            title: "Default",
            sku,
            price,
            compareAtPrice,
            inventory,
            stockStatus,
          },
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            title: "Default",
            sku,
            price,
            compareAtPrice,
            inventory,
            stockStatus,
          },
        });
      }
      console.log(`   ${indexLabel} ${existingProduct ? "Updated" : "Created"} [Simple]: "${title}" ($${price})`);
    }
  }

  console.log("\n=================================================");
  console.log("   IMPORT COMPLETED SUCCESSFULLY!                ");
  console.log("=================================================");
  console.log(`📊 Total Products Processed: ${wooProducts.length}`);
  console.log(`✨ Created: ${createdCount}`);
  console.log(`🔄 Updated: ${updatedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`📁 Categories synced: ${allWooCategories.size}`);
  console.log("🔒 The connection is closed. No recurring sync is active.");
  console.log("=================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Fatal error during import:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

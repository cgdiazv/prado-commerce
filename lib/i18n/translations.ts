export type Language = "es" | "en";

export interface Translations {
  common: {
    language: string;
    english: string;
    spanish: string;
    logoSubtitle: string;
    loading: string;
  };
  nav: {
    home: string;
    pricing: string;
    dashboard: string;
    startFree: string;
    menu: string;
    closeMenu: string;
    backToHome: string;
  };
  home: {
    starterBadge: string;
    heroTitle: string;
    heroSubtitle: string;
    viewPricing: string;
    startFree: string;
    heroAlt: string;
    frictionBadge: string;
    frictionTitle: string;
    frictionSubtitle: string;
    frictionStories: Array<{
      title: string;
      detail: string;
      image: string;
    }>;
    whyBadge: string;
    whyTitle: string;
    whySubtitle: string;
    whyCustomersChooseUs: string;
    prevStory: string;
    nextStory: string;
    benefits: Array<{
      title: string;
      detail: string;
      image: string;
      layout: string;
    }>;
    ctaBadge: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaButton: string;
  };
  pricing: {
    badge: string;
    title: string;
    subtitle: string;
    monthly: string;
    annual: string;
    saveDiscount: string;
    mostPopular: string;
    loading: string;
    activeStores: string;
    products: string;
    customDomains: string;
    embeddableCheckout: string;
    apiRateLimits: string;
    integrations: string;
    quickComparison: string;
    featureHeader: string;
    comparisonRows: Array<{
      label: string;
      values: [string, string, string];
    }>;
    tiers: Array<{
      name: "Starter" | "Pro" | "Enterprise";
      monthlyPriceLabel: string;
      annualPriceLabel: string;
      annualBillingLabel: string;
      feeLabel?: string;
      audience: string;
      stores: string;
      products: string;
      customDomains: string;
      checkoutExperience: string;
      apiRateLimits: string;
      integrations: string;
      ctaHref: string;
      ctaLabel: string;
      ctaSubLabel?: string;
      highlighted?: boolean;
    }>;
  };
  footer: {
    copyright: string;
    privacy: string;
    terms: string;
  };
  cookies: {
    message: string;
    privacyPolicy: string;
    accept: string;
    dismiss: string;
  };
  login: {
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    showPassword: string;
    hidePassword: string;
    submitButton: string;
    submitting: string;
    needAccount: string;
    startFree: string;
    forgotPassword: string;
    resetIt: string;
    loading: string;
    errorMessage: string;
  };
  forgotPassword: {
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    submitButton: string;
    submitting: string;
    rememberedPassword: string;
    signIn: string;
    successMessage: string;
    errorMessage: string;
  };
  dashboard: {
    merchantDashboard: string;
    help: string;
    authenticated: string;
    logout: string;
    stores: string;
    allStores: string;
    themes: string;
    products: string;
    allProducts: string;
    addProduct: string;
    categories: string;
    brands: string;
    orders: string;
    allOrders: string;
    newOrder: string;
    pointOfSale: string;
    posSettings: string;
    procurement: string;
    procurementOverview: string;
    purchaseOrders: string;
    vendors: string;
    receivingHistory: string;
    consignments: string;
    reports: string;
    salesByCustomer: string;
    salesByBrand: string;
    monthlyProfitAndCost: string;
    customers: string;
    allCustomers: string;
    addCustomer: string;
    customerGroups: string;
    newCustomerGroup: string;
    tools: string;
    importTables: string;
    exportTables: string;
    settings: string;
    rightsReserved: string;
    newOrderTitle: string;
    newOrderMessage: string;
    overviewBadge: string;
    consoleTitle: string;
    consoleSubtitle: string;
    starterPlanNotice: string;
    totalStores: string;
    totalProducts: string;
    totalRevenue: string;
    totalOrders: string;
  };
  storefront: {
    searchPlaceholder: string;
    all: string;
    categories: string;
    openCategoriesMenu: string;
    closeCategoriesMenu: string;
    account: string;
    cart: string;
    featuredProducts: string;
    allProducts: string;
    otherProducts: string;
    selectOptions: string;
    addToCart: string;
    startingAt: string;
    noImage: string;
    noImageAvailable: string;
    noProductsAvailable: string;
    featuredSelection: string;
    featuredSelectionDesc: string;
    liveStoreStats: string;
    productsInCatalog: string;
    home: string;
    productDetails: string;
    manufacturer: string;
    dimensions: string;
    weight: string;
    condition: string;
    conditionNotes: string;
    decreaseQuantity: string;
    increaseQuantity: string;
    allRightsReserved: string;
    poweredBy: string;
    oneProduct: string;
    countProducts: string;
    matching: string;
    noProductsInCategory: string;
    tryDifferentSearch: string;
    welcomeBack: string;
    shopper: string;
    welcomeDesc: string;
    editProfile: string;
    editProfileDesc: string;
    goToProfile: string;
    orders: string;
    ordersDesc: string;
    viewOrders: string;
    savedAddresses: string;
    savedAddressesDesc: string;
    manageAddresses: string;
    signIn: string;
    signUp: string;
    createAccount: string;
    signOut: string;
    signingOut: string;
    resetPassword: string;
    forgotPassword: string;
    signInToAccess: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    saveChanges: string;
    saving: string;
    streetAddress: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
    addAddress: string;
    yourOrders: string;
    trackPurchases: string;
    loadingOrders: string;
    noOrdersYet: string;
    date: string;
    total: string;
    status: string;
    newPassword: string;
    confirmNewPassword: string;
    updatePassword: string;
    updatingPassword: string;
    passwordMinLength: string;
    passwordsDoNotMatch: string;
  };
}

export const translations: Record<Language, Translations> = {
  es: {
    common: {
      language: "Idioma",
      english: "Inglés",
      spanish: "Español",
      logoSubtitle: "Comercio Electrónico Unificado",
      loading: "Cargando...",
    },
    nav: {
      home: "Inicio",
      pricing: "Precios",
      dashboard: "Panel",
      startFree: "Comenzar gratis",
      menu: "Menú",
      closeMenu: "Cerrar menú",
      backToHome: "Volver al inicio",
    },
    home: {
      starterBadge: "Plan Inicial Gratuito · $0/mes",
      heroTitle: "Crea tiendas veloces sin el caos de plataformas.",
      heroSubtitle:
        "Prado Commerce te da un único panel de control para tiendas, productos y flujos de compra integrables. Lanza funciones más rápido con pagos más seguros.",
      viewPricing: "Ver precios",
      startFree: "Comenzar gratis",
      heroAlt: "Panel de control de tienda ejecutándose en Prado Commerce",
      frictionBadge: "La fricción que la mayoría de equipos enfrenta",
      frictionTitle: "El crecimiento debe aumentar la confianza, no el caos operativo.",
      frictionSubtitle:
        "La mayoría de los equipos no se detienen por falta de ideas. Se detienen por sistemas frágiles, datos desconectados y fricción en el checkout que destruye conversiones silenciosamente.",
      frictionStories: [
        {
          title: "Las ventas se detienen justo al lanzar una campaña",
          detail:
            "Un creador lanza una promoción relámpago, el tráfico se dispara y el proceso de compra empieza a fallar a los compradores en el peor momento.",
          image: "/conflict1.webp",
        },
        {
          title: "El inventario dice una cosa, las expectativas del cliente otra",
          detail:
            "Los equipos actualizan productos en múltiples herramientas y terminan con stock, precios y envíos desincronizados.",
          image: "/conflict2.webp",
        },
        {
          title: "El crecimiento expone un cuello de botella operativo",
          detail:
            "Al sumar canales, los equipos pasan más tiempo parchando sistemas que mejorando la experiencia de compra.",
          image: "/conflict3.webp",
        },
      ],
      whyBadge: "¿Por qué Prado Commerce?",
      whyTitle:
        "Ayudando a todo tipo de negocios a conectar productos con el mundo, fortalecer su presencia online e impulsar sus ingresos.",
      whySubtitle:
        "Prado Commerce da a los equipos herramientas para lanzar más rápido, vender con inteligencia y escalar sin reconstruir su infraestructura en cada etapa.",
      whyCustomersChooseUs: "Por qué nos eligen nuestros clientes",
      prevStory: "Ver historia anterior",
      nextStory: "Ver siguiente historia",
      benefits: [
        {
          title: "Diseñado para todo tipo de negocio",
          detail:
            "Desde creadores independientes y tiendas locales hasta marcas en rápida expansión, Prado Commerce se adapta a catálogos físicos, digitales y de servicios.",
          image: "/whyus1.webp",
          layout: "vertical",
        },
        {
          title: "Alcance global de productos",
          detail:
            "Publica productos una sola vez y conéctalos con el mundo mediante experiencias de compra integradas, APIs de alta velocidad y dominios flexibles.",
          image: "/whyus2.webp",
          layout: "horizontal",
        },
        {
          title: "Presencia online más sólida",
          detail:
            "Unifica tu marca en tu sitio, flujos de pago y páginas de producto para que los clientes confíen en lo que ven y compren con seguridad.",
          image: "/whyus3.webp",
          layout: "horizontal",
        },
      ],
      ctaBadge: "Comienza hoy",
      ctaTitle: "¿Listo para crecer con Prado Commerce?",
      ctaSubtitle:
        "Lanza tu tienda virtual, conecta tus productos con compradores globales y construye una presencia online más sólida con Prado Commerce.",
      ctaButton: "Comenzar gratis",
    },
    pricing: {
      badge: "Precios",
      title: "Planes que escalan con cada tienda en Prado Commerce.",
      subtitle:
        "Comienza gratis con Starter, desbloquea el crecimiento con Pro y opera a escala con Enterprise. Cada nivel incluye capacidades centrales de checkout y tienda virtual.",
      monthly: "Mensual",
      annual: "Anual",
      saveDiscount: "Ahorra un 20% (2 meses gratis)",
      mostPopular: "Más popular",
      loading: "Cargando precios...",
      activeStores: "Tiendas activas",
      products: "Productos",
      customDomains: "Dominios personalizados",
      embeddableCheckout: "Checkout integrable",
      apiRateLimits: "Límites de API",
      integrations: "Integraciones",
      quickComparison: "Comparación rápida",
      featureHeader: "Característica",
      comparisonRows: [
        { label: "Facturación mensual", values: ["$0", "$49", "$199"] },
        { label: "Facturación anual", values: ["$0", "$39/mes ($468/año)", "$159/mes ($1.908/año)"] },
        { label: "Tiendas activas", values: ["1", "Hasta 5", "Ilimitadas"] },
        { label: "Productos", values: ["Hasta 50", "Ilimitados", "Ilimitados"] },
        {
          label: "Dominios personalizados",
          values: ["No incluidos", "Incluidos", "Incluidos (múltiples)"],
        },
        {
          label: "Límites de API",
          values: ["60 req/min", "1.000 req/min", "Rendimiento dedicado"],
        },
      ],
      tiers: [
        {
          name: "Starter",
          monthlyPriceLabel: "$0 / mes",
          annualPriceLabel: "$0 / año",
          annualBillingLabel: "Gratis en facturación anual",
          audience: "Creadores independientes y pequeñas tiendas que prueban sitios personalizados.",
          stores: "1 tienda",
          products: "Hasta 50 productos",
          customDomains: "No incluidos (solo subdominios de Prado Commerce)",
          checkoutExperience: "Checkout integrable básico",
          apiRateLimits: "60 solicitudes / minuto",
          integrations: "Webhooks básicos",
          ctaHref: "/signup?plan=Starter",
          ctaLabel: "Comenzar gratis",
          ctaSubLabel: "Sin tarjeta de crédito",
        },
        {
          name: "Pro",
          monthlyPriceLabel: "$49 / mes",
          annualPriceLabel: "$39 / mes",
          annualBillingLabel: "Facturado anualmente como $468",
          audience: "Comerciantes en expansión, agencias y tiendas medianas.",
          stores: "Hasta 5 tiendas",
          products: "Productos ilimitados",
          customDomains: "Incluidos (ej. checkout.tumarca.com)",
          checkoutExperience: "Checkout integrable + estilos CSS personalizados",
          apiRateLimits: "1.000 solicitudes / minuto",
          integrations: "Stripe Connect, webhooks, sincronización CSV",
          ctaHref: "/signup?plan=Pro",
          ctaLabel: "Elegir Pro",
          highlighted: true,
        },
        {
          name: "Enterprise",
          monthlyPriceLabel: "$199 / mes",
          annualPriceLabel: "$159 / mes",
          annualBillingLabel: "Facturado anualmente como $1.908",
          audience: "Marcas de alto volumen y operaciones integradas con TPV/POS.",
          stores: "Tiendas ilimitadas",
          products: "Productos ilimitados",
          customDomains: "Múltiples dominios personalizados",
          checkoutExperience: "Flujos de checkout headless y de marca blanca",
          apiRateLimits: "Rendimiento edge dedicado",
          integrations: "Pagos, TPV/POS y Transportistas",
          ctaHref: "/signup?plan=Enterprise",
          ctaLabel: "Elegir Enterprise",
        },
      ],
    },
    footer: {
      copyright: "Copyright © {year} Prado Commerce. Todos los derechos reservados.",
      privacy: "Privacidad",
      terms: "Términos",
    },
    cookies: {
      message: "Utilizamos cookies esenciales para mejorar tu experiencia y garantizar el funcionamiento de la plataforma.",
      privacyPolicy: "Política de Privacidad",
      accept: "Aceptar",
      dismiss: "Cerrar",
    },
    login: {
      title: "Iniciar sesión en el Panel",
      subtitle: "Usa tu correo y contraseña de comerciante para acceder a tus tiendas y estadísticas.",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "propietario@marca.com",
      passwordLabel: "Contraseña",
      passwordPlaceholder: "Tu contraseña del panel",
      showPassword: "Mostrar contraseña",
      hidePassword: "Ocultar contraseña",
      submitButton: "Continuar",
      submitting: "Iniciando sesión...",
      needAccount: "¿Necesitas una cuenta?",
      startFree: "Comenzar gratis",
      forgotPassword: "¿Olvidaste tu contraseña?",
      resetIt: "Restablécela",
      loading: "Cargando inicio de sesión...",
      errorMessage: "No fue posible iniciar sesión",
    },
    forgotPassword: {
      title: "Restablece tu contraseña",
      subtitle:
        "Ingresa el correo electrónico de tu cuenta de Prado Commerce y generaremos un enlace de restablecimiento.",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "propietario@marca.com",
      submitButton: "Crear enlace de restablecimiento",
      submitting: "Creando enlace...",
      rememberedPassword: "¿Recordaste tu contraseña?",
      signIn: "Iniciar sesión",
      successMessage: "Enlace de restablecimiento generado con éxito",
      errorMessage: "No se pudo generar el enlace de restablecimiento",
    },
    dashboard: {
      merchantDashboard: "Panel",
      help: "Ayuda",
      authenticated: "Autenticado",
      logout: "Cerrar sesión",
      stores: "Tiendas",
      allStores: "Todas las tiendas",
      themes: "Temas",
      products: "Productos",
      allProducts: "Todos los productos",
      addProduct: "Añadir producto",
      categories: "Categorías",
      brands: "Marcas",
      orders: "Pedidos",
      allOrders: "Todos los pedidos",
      newOrder: "Nuevo pedido",
      pointOfSale: "Punto de Venta (POS)",
      posSettings: "Configuración POS",
      procurement: "Compras",
      procurementOverview: "Resumen",
      purchaseOrders: "Órdenes de compra",
      vendors: "Proveedores",
      receivingHistory: "Historial de ingresos",
      consignments: "Consignaciones",
      reports: "Reportes",
      salesByCustomer: "Ventas por cliente",
      salesByBrand: "Ventas por marca",
      monthlyProfitAndCost: "Ventas, costo y profit mensual",
      customers: "Clientes",
      allCustomers: "Todos los clientes",
      addCustomer: "Nuevo cliente",
      customerGroups: "Grupos de clientes",
      newCustomerGroup: "Nuevo grupo",
      tools: "Herramientas",
      importTables: "Importar tablas",
      exportTables: "Exportar tablas",
      settings: "Configuración",
      rightsReserved: "Todos los derechos reservados.",
      newOrderTitle: "¡Nuevo pedido!",
      newOrderMessage: "Pedido #{orderNumber} ({currency} {total}) recibido en {storeName}.",
      overviewBadge: "Resumen",
      consoleTitle: "Resumen del negocio",
      consoleSubtitle: "Panel de control unificado para administrar tus tiendas, productos, canales de venta y pedidos de clientes.",
      starterPlanNotice: "Estás en el plan Starter: 1 tienda, hasta 50 productos por tienda y sin dominios personalizados. Actualiza a Prado Commerce Pro para desbloquear mayor capacidad.",
      totalStores: "Tiendas totales",
      totalProducts: "Productos totales",
      totalRevenue: "Ingresos totales",
      totalOrders: "Pedidos totales",
    },
    storefront: {
      searchPlaceholder: "Buscar productos",
      all: "Todos",
      categories: "Categorías",
      openCategoriesMenu: "Abrir menú de categorías",
      closeCategoriesMenu: "Cerrar menú de categorías",
      account: "Cuenta",
      cart: "Carrito",
      featuredProducts: "Productos destacados",
      allProducts: "Todos los productos",
      otherProducts: "Otros productos",
      selectOptions: "Seleccionar opciones",
      addToCart: "Agregar al carrito",
      startingAt: "Desde",
      noImage: "Sin imagen",
      noImageAvailable: "No hay imagen disponible",
      noProductsAvailable: "No hay productos disponibles por ahora.",
      featuredSelection: "Selección destacada",
      featuredSelectionDesc: "Descubre los productos elegidos por nuestro equipo esta semana.",
      liveStoreStats: "Estadísticas de la tienda",
      productsInCatalog: "Productos en catálogo",
      home: "Inicio",
      productDetails: "Detalles del producto",
      manufacturer: "Fabricante",
      dimensions: "Dimensiones",
      weight: "Peso",
      condition: "Condición",
      conditionNotes: "Notas de condición",
      decreaseQuantity: "Disminuir cantidad",
      increaseQuantity: "Aumentar cantidad",
      allRightsReserved: "Todos los derechos reservados.",
      poweredBy: "Desarrollado por Prado Commerce",
      oneProduct: "producto",
      countProducts: "productos",
      matching: "que coinciden con",
      noProductsInCategory: "No hay productos en esta categoría.",
      tryDifferentSearch: "Intenta buscar con otros términos.",
      welcomeBack: "¡Bienvenido de nuevo!",
      shopper: "comprador",
      welcomeDesc: "Bienvenido a tu panel de cuenta. Aquí puedes administrar tus datos, rastrear tus pedidos y actualizar tus direcciones de envío.",
      editProfile: "Editar perfil",
      editProfileDesc: "Actualiza tu nombre, apellido y datos de contacto.",
      goToProfile: "Ir al perfil",
      orders: "Pedidos",
      ordersDesc: "Consulta el estado, totales e historial de tus compras.",
      viewOrders: "Ver pedidos",
      savedAddresses: "Direcciones guardadas",
      savedAddressesDesc: "Administra tus destinos de envío para agilizar tus compras.",
      manageAddresses: "Administrar direcciones",
      signIn: "Iniciar sesión",
      signUp: "Crear cuenta",
      createAccount: "Crear cuenta",
      signOut: "Cerrar sesión",
      signingOut: "Cerrando sesión...",
      resetPassword: "Restablecer contraseña",
      forgotPassword: "¿Olvidaste tu contraseña?",
      signInToAccess: "Inicia sesión para acceder a tu panel de cuenta.",
      firstName: "Nombre",
      lastName: "Apellido",
      email: "Correo electrónico",
      phone: "Teléfono",
      password: "Contraseña",
      confirmPassword: "Confirmar contraseña",
      saveChanges: "Guardar cambios",
      saving: "Guardando...",
      streetAddress: "Dirección",
      city: "Ciudad",
      stateProvince: "Estado / Provincia",
      postalCode: "Código postal",
      country: "País",
      addAddress: "Agregar dirección",
      yourOrders: "Tus pedidos",
      trackPurchases: "Rastrea las compras asociadas a esta cuenta.",
      loadingOrders: "Cargando pedidos...",
      noOrdersYet: "Aún no has realizado ningún pedido.",
      date: "Fecha",
      total: "Total",
      status: "Estado",
      newPassword: "Nueva contraseña",
      confirmNewPassword: "Confirmar nueva contraseña",
      updatePassword: "Actualizar contraseña",
      updatingPassword: "Actualizando...",
      passwordMinLength: "La contraseña debe tener al menos 6 caracteres.",
      passwordsDoNotMatch: "Las contraseñas no coinciden.",
    },
  },
  en: {
    common: {
      language: "Language",
      english: "English",
      spanish: "Spanish",
      logoSubtitle: "Unified E-Commerce",
      loading: "Loading...",
    },
    nav: {
      home: "Home",
      pricing: "Pricing",
      dashboard: "Dashboard",
      startFree: "Start free",
      menu: "Menu",
      closeMenu: "Close menu",
      backToHome: "Back to home",
    },
    home: {
      starterBadge: "Free Starter plan · $0/month",
      heroTitle: "Build storefront velocity without platform chaos.",
      heroSubtitle:
        "Prado Commerce gives you one control plane for stores, products, and embeddable cart flows. Ship features faster and more secure checkouts.",
      viewPricing: "View pricing",
      startFree: "Start free",
      heroAlt: "Storefront dashboard running on Prado Commerce",
      frictionBadge: "The friction most teams hit",
      frictionTitle: "Growth should increase confidence, not operational chaos.",
      frictionSubtitle:
        "Most commerce teams are not blocked by ideas. They are blocked by fragile systems, disconnected data, and checkout friction that quietly kills conversions.",
      frictionStories: [
        {
          title: "Sales stop after a campaign goes live",
          detail:
            "A maker launches a flash promo, traffic spikes, and checkout starts dropping buyers at the worst possible moment.",
          image: "/conflict1.webp",
        },
        {
          title: "Inventory says one thing, customer expectations say another",
          detail:
            "Store teams update products in multiple tools and still end up with mismatched stock, pricing, and fulfillment details.",
          image: "/conflict2.webp",
        },
        {
          title: "Growth exposes an operations bottleneck",
          detail:
            "As new channels get added, teams spend more time patching systems than improving the buying experience.",
          image: "/conflict3.webp",
        },
      ],
      whyBadge: "Why Prado Commerce",
      whyTitle:
        "Helping all kinds of businesses connect products to the world, strengthen online presence, and grow revenue.",
      whySubtitle:
        "Prado Commerce gives teams the tools to launch faster, sell smarter, and scale without rebuilding their commerce stack each time they grow.",
      whyCustomersChooseUs: "Why customers choose us",
      prevStory: "View previous story",
      nextStory: "View next story",
      benefits: [
        {
          title: "Built For Every Business Type",
          detail:
            "From independent makers and local stores to fast-scaling brands, Prado Commerce adapts to physical, digital, and service-based catalogs.",
          image: "/whyus1.webp",
          layout: "vertical",
        },
        {
          title: "Global Product Reach",
          detail:
            "Publish products once and connect them to the world through embedded storefront experiences, faster APIs, and flexible domain setup.",
          image: "/whyus2.webp",
          layout: "horizontal",
        },
        {
          title: "Stronger Online Presence",
          detail:
            "Unify your brand across your site, checkout flows, and product pages so customers trust what they see and buy with confidence.",
          image: "/whyus3.webp",
          layout: "horizontal",
        },
      ],
      ctaBadge: "Start Today",
      ctaTitle: "Ready to grow with Prado Commerce?",
      ctaSubtitle:
        "Launch your storefront, connect your products to global customers, and build a stronger online presence with Prado Commerce.",
      ctaButton: "Start free",
    },
    pricing: {
      badge: "Pricing",
      title: "Plans that scale with every Prado Commerce storefront.",
      subtitle:
        "Start for free with Starter, unlock growth with Pro, and run advanced operations with Enterprise. Every tier includes core checkout and storefront capabilities.",
      monthly: "Monthly",
      annual: "Annual",
      saveDiscount: "Save about 20% (2 months free)",
      mostPopular: "Most popular",
      loading: "Loading pricing...",
      activeStores: "Active stores",
      products: "Products",
      customDomains: "Custom domains",
      embeddableCheckout: "Embeddable checkout",
      apiRateLimits: "API rate limits",
      integrations: "Integrations",
      quickComparison: "Quick comparison",
      featureHeader: "Feature",
      comparisonRows: [
        { label: "Monthly billing", values: ["$0", "$49", "$199"] },
        { label: "Annual billing", values: ["$0", "$39/mo ($468/yr)", "$159/mo ($1,908/yr)"] },
        { label: "Active stores", values: ["1", "Up to 5", "Unlimited"] },
        { label: "Products", values: ["Up to 50", "Unlimited", "Unlimited"] },
        {
          label: "Custom domains",
          values: ["Not included", "Included", "Included (multiple)"],
        },
        {
          label: "API limits",
          values: ["60 req/min", "1,000 req/min", "Dedicated throughput"],
        },
      ],
      tiers: [
        {
          name: "Starter",
          monthlyPriceLabel: "$0 / mo",
          annualPriceLabel: "$0 / yr",
          annualBillingLabel: "Free on annual billing",
          audience: "Individual creators and small shops testing custom sites.",
          stores: "1 store",
          products: "Up to 50 products",
          customDomains: "Not included (Prado Commerce subdomains only)",
          checkoutExperience: "Basic embedded checkout",
          apiRateLimits: "60 requests / minute",
          integrations: "Basic webhooks",
          ctaHref: "/signup?plan=Starter",
          ctaLabel: "Start free",
          ctaSubLabel: "No credit card required",
        },
        {
          name: "Pro",
          monthlyPriceLabel: "$49 / mo",
          annualPriceLabel: "$39 / mo",
          annualBillingLabel: "Billed yearly as $468",
          audience: "Scaling merchants, agencies, and medium storefront teams.",
          stores: "Up to 5 stores",
          products: "Unlimited products",
          customDomains: "Included (for example checkout.yourbrand.com)",
          checkoutExperience: "Embedded checkout + custom CSS styling",
          apiRateLimits: "1,000 requests / minute",
          integrations: "Stripe Connect, webhooks, CSV sync",
          ctaHref: "/signup?plan=Pro",
          ctaLabel: "Choose Pro",
          highlighted: true,
        },
        {
          name: "Enterprise",
          monthlyPriceLabel: "$199 / mo",
          annualPriceLabel: "$159 / mo",
          annualBillingLabel: "Billed yearly as $1,908",
          audience: "High-volume brands and POS-integrated operations.",
          stores: "Unlimited stores",
          products: "Unlimited products",
          customDomains: "Multiple custom domains",
          checkoutExperience: "White-labeled and headless checkout workflows",
          apiRateLimits: "Dedicated edge throughput",
          integrations: "Payment, POS and Carriers",
          ctaHref: "/signup?plan=Enterprise",
          ctaLabel: "Choose Enterprise",
        },
      ],
    },
    footer: {
      copyright: "Copyright © {year} Prado Commerce. All rights reserved.",
      privacy: "Privacy",
      terms: "Terms",
    },
    cookies: {
      message: "We use essential cookies to ensure platform functionality and improve your browsing experience.",
      privacyPolicy: "Privacy Policy",
      accept: "Accept",
      dismiss: "Dismiss",
    },
    login: {
      title: "Sign in to Dashboard",
      subtitle: "Use your merchant email and password to access your stores and analytics.",
      emailLabel: "Email",
      emailPlaceholder: "owner@brand.com",
      passwordLabel: "Password",
      passwordPlaceholder: "Your dashboard password",
      showPassword: "Show password",
      hidePassword: "Hide password",
      submitButton: "Continue",
      submitting: "Signing in...",
      needAccount: "Need an account?",
      startFree: "Start free",
      forgotPassword: "Forgot your password?",
      resetIt: "Reset it",
      loading: "Loading sign in...",
      errorMessage: "Unable to sign in",
    },
    forgotPassword: {
      title: "Reset your password",
      subtitle:
        "Enter the email for your Prado Commerce account and we will generate a reset link.",
      emailLabel: "Email",
      emailPlaceholder: "owner@brand.com",
      submitButton: "Create reset link",
      submitting: "Creating link...",
      rememberedPassword: "Remembered your password?",
      signIn: "Sign in",
      successMessage: "Password reset link created successfully",
      errorMessage: "Could not create reset link",
    },
    dashboard: {
      merchantDashboard: "Dashboard",
      help: "Help",
      authenticated: "Authenticated",
      logout: "Sign out",
      stores: "Stores",
      allStores: "All Stores",
      themes: "Themes",
      products: "Products",
      allProducts: "All Products",
      addProduct: "Add Product",
      categories: "Categories",
      brands: "Brands",
      orders: "Orders",
      allOrders: "All Orders",
      newOrder: "New Order",
      pointOfSale: "Point of Sale (POS)",
      posSettings: "POS Settings",
      procurement: "Procurement",
      procurementOverview: "Overview",
      purchaseOrders: "Purchase Orders",
      vendors: "Vendors",
      receivingHistory: "Receiving History",
      consignments: "Consignments",
      reports: "Reports",
      salesByCustomer: "Sales by Customer",
      salesByBrand: "Sales by Brand",
      monthlyProfitAndCost: "Monthly Profit & Cost",
      customers: "Customers",
      allCustomers: "All Customers",
      addCustomer: "New Customer",
      customerGroups: "Customer Groups",
      newCustomerGroup: "New Customer Group",
      tools: "Tools",
      importTables: "Import Tables",
      exportTables: "Export Tables",
      settings: "Settings",
      rightsReserved: "All rights reserved.",
      newOrderTitle: "New Order!",
      newOrderMessage: "Order #{orderNumber} ({currency} {total}) received at {storeName}.",
      overviewBadge: "Overview",
      consoleTitle: "Business overview",
      consoleSubtitle: "Unified control plane for managing your stores, products, sales channels, and customer orders.",
      starterPlanNotice: "You are on the Starter plan: 1 store, up to 50 products per store, and no custom domains. Upgrade to Prado Commerce Pro to unlock more growth capacity.",
      totalStores: "Total Stores",
      totalProducts: "Total Products",
      totalRevenue: "Total Revenue",
      totalOrders: "Total Orders",
    },
    storefront: {
      searchPlaceholder: "Search products",
      all: "All",
      categories: "Categories",
      openCategoriesMenu: "Open categories menu",
      closeCategoriesMenu: "Close categories menu",
      account: "Account",
      cart: "Cart",
      featuredProducts: "Featured products",
      allProducts: "All products",
      otherProducts: "Other products",
      selectOptions: "Select options",
      addToCart: "Add to cart",
      startingAt: "Starting at",
      noImage: "No image",
      noImageAvailable: "No image available",
      noProductsAvailable: "No products available yet.",
      featuredSelection: "Featured selection",
      featuredSelectionDesc: "Discover the hand-picked products our team chose this week.",
      liveStoreStats: "Live store stats",
      productsInCatalog: "Products in catalog",
      home: "Home",
      productDetails: "Product details",
      manufacturer: "Manufacturer",
      dimensions: "Dimensions",
      weight: "Weight",
      condition: "Condition",
      conditionNotes: "Condition Notes",
      decreaseQuantity: "Decrease quantity",
      increaseQuantity: "Increase quantity",
      allRightsReserved: "All rights reserved.",
      poweredBy: "Powered by Prado Commerce",
      oneProduct: "product",
      countProducts: "products",
      matching: "matching",
      noProductsInCategory: "No products found in this category.",
      tryDifferentSearch: "Try another search within this category.",
      welcomeBack: "Welcome back!",
      shopper: "shopper",
      welcomeDesc: "Welcome to your account dashboard. Here you can manage your profile information, track your past orders, update shipping addresses, and control your storefront access.",
      editProfile: "Edit Profile",
      editProfileDesc: "Update your first name, last name, and contact details.",
      goToProfile: "Go to profile",
      orders: "Orders",
      ordersDesc: "View order status, totals, and complete purchase history.",
      viewOrders: "View orders",
      savedAddresses: "Saved Addresses",
      savedAddressesDesc: "Manage saved shipping destinations to breeze through checkout.",
      manageAddresses: "Manage addresses",
      signIn: "Sign in",
      signUp: "Sign up",
      createAccount: "Create account",
      signOut: "Sign out",
      signingOut: "Signing out...",
      resetPassword: "Reset password",
      forgotPassword: "Forgot password?",
      signInToAccess: "Sign in to access your account dashboard.",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone",
      password: "Password",
      confirmPassword: "Confirm password",
      saveChanges: "Save changes",
      saving: "Saving...",
      streetAddress: "Street address",
      city: "City",
      stateProvince: "State / Province",
      postalCode: "Postal code",
      country: "Country",
      addAddress: "Add address",
      yourOrders: "Your orders",
      trackPurchases: "Track the purchases tied to this storefront account.",
      loadingOrders: "Loading orders…",
      noOrdersYet: "You have not placed any orders yet.",
      date: "Date",
      total: "Total",
      status: "Status",
      newPassword: "New password",
      confirmNewPassword: "Confirm new password",
      updatePassword: "Update Password",
      updatingPassword: "Updating...",
      passwordMinLength: "Password must be at least 6 characters.",
      passwordsDoNotMatch: "Passwords do not match.",
    },
  },
};

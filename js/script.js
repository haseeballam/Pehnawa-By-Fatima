// ===== GOOGLE APPS SCRIPT - STOCK SYSTEM WITH CACHING =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyumb3oxXGrf5Dmv-6TXMt92C7lZxshe94QXuTXK2RxKKkTtNjB6rTzFvyv1ybYLCsXQQ/exec';
let stockCacheData = null;
let stockCacheTime = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache for quicker sold-out updates

async function fetchStockFromSheet(forceRefresh = false) {
  const now = Date.now();
  
  // If force refresh, bypass cache
  if (forceRefresh) {
    stockCacheData = null;
    stockCacheTime = 0;
    localStorage.removeItem('pehnawa_stock_cache');
    localStorage.removeItem('pehnawa_stock_cache_time');
  }
  
  // Check localStorage cache first
  const cachedData = localStorage.getItem('pehnawa_stock_cache');
  const cachedTime = localStorage.getItem('pehnawa_stock_cache_time');
  
  if (cachedData && cachedTime && (now - parseInt(cachedTime)) < CACHE_DURATION) {
    return JSON.parse(cachedData);
  }
  
  // If in-memory cache exists and fresh, use it
  if (stockCacheData && (now - stockCacheTime) < CACHE_DURATION) {
    return stockCacheData;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const res = await fetch(APPS_SCRIPT_URL + '?action=getStock', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const data = await res.json();
    if (data.success) {
      stockCacheData = data.stock;
      stockCacheTime = now;
      // Cache in localStorage too
      localStorage.setItem('pehnawa_stock_cache', JSON.stringify(data.stock));
      localStorage.setItem('pehnawa_stock_cache_time', now.toString());
      return data.stock;
    }
    return null;
  } catch(e) {
    console.log('Stock fetch failed:', e);
    // Return cached data if fetch failed
    if (cachedData) return JSON.parse(cachedData);
    return null;
  }
}

async function getProductStock(productId) {
  const stockMap = await fetchStockFromSheet();
  if (!stockMap) return 99;
  return stockMap[productId] ?? 0;
}

function applyStockUI(card, stock, btnSelector) {
  const btn = card.querySelector(btnSelector);
  let badge = card.querySelector('.sold-out-badge');
  if (stock <= 0) {
    if (btn) { btn.textContent = 'SOLD OUT'; btn.disabled = true; btn.style.background = '#999'; btn.style.cursor = 'not-allowed'; }
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'sold-out-badge';
      badge.textContent = 'SOLD OUT';
      badge.style.cssText = 'position:absolute;top:12px;left:12px;background:#d32f2f;color:#fff;padding:5px 12px;font-size:11px;font-weight:700;letter-spacing:1px;z-index:10;';
      const wrapper = card.querySelector('.product-image-wrapper');
      if (wrapper) { wrapper.style.position = 'relative'; wrapper.appendChild(badge); }
    }
  } else {
    if (badge) badge.remove();
    if (btn) { btn.textContent = 'ADD TO BAG'; btn.disabled = false; btn.style.background = ''; btn.style.cursor = ''; }
  }
}

async function applyStockToCards() {
  const stockMap = await fetchStockFromSheet();
  if (!stockMap) return;

  // Home page + unstitched page cards - Apply all at once
  document.querySelectorAll('.home-product').forEach(card => {
    const id = parseInt(card.dataset.id);
    if (!id) return;
    applyStockUI(card, stockMap[id] ?? 99, '.quick-add-btn');
  });

  // Product detail page
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  if (addToCartBtn) {
    const params = new URLSearchParams(window.location.search);
    const productId = parseInt(params.get('id'));
    if (productId && stockMap[productId] !== undefined) {
      if (stockMap[productId] <= 0) {
        addToCartBtn.textContent = 'SOLD OUT';
        addToCartBtn.disabled = true;
        addToCartBtn.style.background = '#999';
        addToCartBtn.style.cursor = 'not-allowed';
        const priceEl = document.getElementById('product-price');
        if (priceEl && !document.getElementById('soldout-badge')) {
          const badge = document.createElement('span');
          badge.id = 'soldout-badge';
          badge.textContent = 'SOLD OUT';
          badge.style.cssText = 'background:#d32f2f;color:#fff;padding:4px 12px;font-size:11px;font-weight:700;letter-spacing:1px;display:inline-block;margin-top:6px;';
          priceEl.after(badge);
        }
      }
    }
  }
}

// Load stock data on page start (non-blocking)
let stockMapGlobal = null;
(async () => {
  stockMapGlobal = await fetchStockFromSheet();
  // Current product ID save karo
  const urlParams = new URLSearchParams(window.location.search);
  window.currentProductId = parseInt(urlParams.get('id')) || 0;
})();

function triggerStockRefreshInBackground() {
  fetchStockFromSheet(true)
    .then((latestStock) => {
      if (latestStock) {
        stockMapGlobal = latestStock;
        applyStockToCards();
      }
    })
    .catch(() => {
      // Silent fail to keep cart UX instant.
    });
}

// ===== PRODUCTS DATABASE - YAHAN PRODUCTS ADD KARO =====
const productsDB = [
  {
    id: 1,
    name: "Digital Printed Lawn 3PC",
    price: 3250,
    sku: "SKU: PROD001",
    image: "images/suite1.jpg",
    images: ["images/suite1.jpg", "images/suite1.jpg"],
    category: "3pc",
    fabric: "lawn",
    productType: "unstitched",
    stock: 10,
    details: "Digital Printed Lawn Shirt With Trouser<br>Colour: White<br>Fabric: Lawn<br><br>Trouser<br>Colour: White<br>Fabric: Cotton",
    description: "Yeh 3 piece lawn suit hai jo summer ke liye best hai. Soft fabric aur vibrant print.",
    link: "product.html?id=1"
  },
  {
    id: 2,
    name: "Embroidered Khaddar 3PC",
    price: 4500,
    sku: "SKU: PROD002",
    image: "images/suite2.jpg",
    images: ["images/suite2.jpg", "images/suite2.jpg"],
    category: "3pc",
    fabric: "khaddar",
    productType: "unstitched",
    stock: 10,
    details: "Embroidered Khaddar Shirt With Trouser<br>Colour: Blue<br>Fabric: Khaddar<br><br>Trouser<br>Colour: Blue<br>Fabric: Cotton",
    description: "Premium embroidered khaddar suit, winter ke liye perfect. Rich fabric aur detailed embroidery.",
    link: "product.html?id=2"
  },
  {
    id: 3,
    name: "Printed Linen 2PC",
    price: 2990,
    sku: "SKU: PROD003",
    image: "images/suite3.jpg",
    images: ["images/suite3.jpg", "images/suite3.jpg"],
    category: "2pc",
    fabric: "linen",
    productType: "unstitched",
    stock: 10,
    details: "Printed Linen Shirt With Trouser<br>Colour: Green<br>Fabric: Linen<br><br>Trouser<br>Colour: Green<br>Fabric: Cotton",
    description: "Light weight linen 2 piece suit. Comfortable aur stylish.",
    link: "product.html?id=3"
  },
  {
    id: 4,
    name: "Luxury Lawn 3PC",
    price: 5200,
    sku: "SKU: PROD004",
    image: "images/suite4.jpg",
    images: ["images/suite4.jpg", "images/suite4.jpg"],
    category: "3pc",
    fabric: "lawn",
    productType: "unstitched",
    stock: 10,
    details: "Luxury Lawn Shirt With Trouser & Dupatta<br>Colour: Pink<br>Fabric: Lawn<br><br>Trouser<br>Colour: Pink<br>Fabric: Cotton",
    description: "Luxury lawn 3 piece suit with dupatta. Premium quality aur elegant design.",
    link: "product.html?id=4"
  },
  {
    id: 5,
    name: "Stitched Lawn Suit",
    price: 5500,
    sku: "SKU: PROD005",
    image: "images/stitched1.jpg",
    images: ["images/stitched1.jpg", "images/stitched1.jpg"],
    category: "3pc",
    fabric: "lawn",
    productType: "stitched",
    stock: 10,
    details: "Stitched Lawn Shirt With Trouser<br>Colour: Multi<br>Fabric: Lawn<br><br>Trouser<br>Colour: Multi<br>Fabric: Cotton",
    description: "Premium stitched lawn suit. Ready to wear, stylish aur comfortable.",
    link: "product.html?id=5"
  },
  {
    id: 6,
    name: "Stiched Khaddar Suit",
    price: 6500,
    sku: "SKU: PROD006",
    image: "images/stitched2.jpg",
    images: ["images/stitched2.jpg", "images/stitched2.jpg"],
    category: "3pc",
    fabric: "lawn",
    productType: "stitched",
    stock: 10,
    details: "Stitched Lawn Shirt With Trouser<br>Colour: Multicolor<br>Fabric: Lawn<br><br>Trouser<br>Colour: Multicolor<br>Fabric: Cotton",
    description: "Premium stitched lawn suit with beautiful design. Ready to wear, stylish aur comfortable.",
    link: "product.html?id=6"
  },
  {
    id: 7,
    name: "Stiched Printed Lawn Suit",
    price: 5100,
    sku: "SKU: PROD007",
    image: "images/stitched3.jpg",
    images: ["images/stitched3.jpg", "images/stitched3.jpg"],
    category: "3pc",
    fabric: "lawn",
    productType: "stitched",
    stock: 10,
    details: "Stitched Lawn Shirt With Trouser<br>Colour: Embroidered<br>Fabric: Lawn<br><br>Trouser<br>Colour: Embroidered<br>Fabric: Cotton",
    description: "Premium stitched lawn suit with embroidery. Ready to wear, stylish aur comfortable.",
    link: "product.html?id=7"
  },
  {
    id: 8,
    name: "Stitched Digital Lawn Suit",
    price: 4200,
    sku: "SKU: PROD008",
    image: "images/stitched4.jpg",
    images: ["images/stitched4.jpg", "images/stitched4.jpg"],
    category: "3pc",
    fabric: "lawn",
    productType: "stitched",
    stock: 10,
    details: "Stitched Lawn Shirt With Trouser<br>Colour: Printed<br>Fabric: Lawn<br><br>Trouser<br>Colour: Printed<br>Fabric: Cotton",
    description: "Premium stitched lawn suit with digital print. Ready to wear, stylish aur comfortable.",
    link: "product.html?id=8"
  },
  {
    id: 9,
    name: "Stitched Luxury Lawn Suit",
    price: 5600,
    sku: "SKU: PROD009",
    image: "images/stitched5.jpg",
    images: ["images/stitched5.jpg", "images/stitched5.jpg"],
    category: "3pc",
    fabric: "lawn",
    productType: "stitched",
    stock: 10,
    details: "Stitched Lawn Shirt With Trouser<br>Colour: Printed<br>Fabric: Lawn<br><br>Trouser<br>Colour: Printed<br>Fabric: Cotton",
    description: "Premium Stitched Luxury Lawn Suit with digital print. Ready to wear, stylish aur comfortable.",
    link: "product.html?id=9"
  },
  {
    id: 10,
    name: "Digital Linein Lawn Suit",
    price: 6000,
    sku: "SKU: PROD010",
    image: "images/suit5.jpg",
    images: ["images/suit5.jpg", "images/suit5.jpg"],
    category: "3pc",
    fabric: "lawn",
    productType: "stitched",
    stock: 10,
    details: "Stitched Lawn Shirt With Trouser<br>Colour: Printed<br>Fabric: Lawn<br><br>Trouser<br>Colour: Printed<br>Fabric: Cotton",
    description: "Premium Digital Linein Lawn Suit with digital print. Ready to wear, stylish aur comfortable.",
    link: "product.html?id=10"
  }
];

// ===== SHEET SE PRODUCTS LOAD KARO =====
let sheetProducts = [];
let sheetProductsLoaded = false;
let productsRefreshInFlight = false;
let lastAggressiveProductsSyncAt = 0;
const PRODUCTS_CACHE_KEY = 'pehnawa_products_cache';
const PRODUCTS_CACHE_TIME_KEY = 'pehnawa_products_cache_time';
const PRODUCTS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const AGGRESSIVE_SYNC_COOLDOWN = 15000; // avoid too many force sync calls

function normalizeSheetProduct(p) {
  return {
    ...p,
    // Some sheet rows may include trailing '",' in text fields.
    details: (p.details || '').replace(/",\s*$/, '').trim(),
    description: (p.description || '').replace(/",\s*$/, '').trim(),
    images: [p.image, p.image],
    link: 'product.html?id=' + p.id
  };
}

function setProductStockMap(products) {
  const sm = {};
  products.forEach(p => { sm[p.id] = p.stock; });
  stockCacheData = sm;
}

function normalizeProductType(type) {
  return (type || '').toLowerCase().replace(/[\s-]/g, '');
}

function isUnstitchedType(type) {
  const t = normalizeProductType(type);
  return t === '' || t.includes('unstitched') || t.includes('unstiched') || t.includes('unstitch');
}

function isStitchedType(type) {
  const t = normalizeProductType(type);
  return !isUnstitchedType(type) && (t.includes('stitched') || t.includes('stiched') || t.includes('stitch'));
}

function renderDynamicCollectionGrids(products) {
  const unstitchedGrid = document.getElementById('unstitched-grid');
  const stitchedGrid = document.getElementById('stitched-grid');
  if (!unstitchedGrid && !stitchedGrid) return;

  if (unstitchedGrid) {
    const list = products.filter(p => isUnstitchedType(p.productType));
    unstitchedGrid.innerHTML = list.length ?
      list.map(p => renderProductCard(p)).join('') :
      '<p style="padding:40px;text-align:center;grid-column:1/-1;">No products found.</p>';
  }

  if (stitchedGrid) {
    const list = products.filter(p => isStitchedType(p.productType));
    stitchedGrid.innerHTML = list.length ?
      list.map(p => renderProductCard(p)).join('') :
      '<p style="padding:40px;text-align:center;grid-column:1/-1;">No products found.</p>';
  }
}

async function refreshProductsFromSheetInBackground(onUpdated) {
  if (productsRefreshInFlight) return;
  productsRefreshInFlight = true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(APPS_SCRIPT_URL + '?action=getProducts', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return;

    const data = await res.json();
    if (data.success && data.products && data.products.length > 0) {
      const normalized = data.products.map(normalizeSheetProduct);
      const changed = JSON.stringify(normalized) !== JSON.stringify(sheetProducts);
      sheetProducts = normalized;
      sheetProductsLoaded = true;
      setProductStockMap(sheetProducts);
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(normalized));
      localStorage.setItem(PRODUCTS_CACHE_TIME_KEY, Date.now().toString());
      if (changed && typeof onUpdated === 'function') {
        onUpdated(normalized);
      }
    }
  } catch (e) {
    // Silent fail: cached data is already shown to user.
  } finally {
    productsRefreshInFlight = false;
  }
}

async function aggressiveSyncProductsNow() {
  const now = Date.now();
  if ((now - lastAggressiveProductsSyncAt) < AGGRESSIVE_SYNC_COOLDOWN) return;
  lastAggressiveProductsSyncAt = now;

  await refreshProductsFromSheetInBackground((latestProducts) => {
    renderDynamicCollectionGrids(latestProducts);
    applyStockToCards();
    highlightWishlistItems();
  });
}

async function loadProductsFromSheet() {
  if (sheetProductsLoaded && sheetProducts.length > 0) return sheetProducts;

  // FAST PATH: show cached products instantly if fresh.
  const now = Date.now();
  const cachedProducts = localStorage.getItem(PRODUCTS_CACHE_KEY);
  const cachedTime = localStorage.getItem(PRODUCTS_CACHE_TIME_KEY);
  if (cachedProducts && cachedTime && (now - parseInt(cachedTime, 10)) < PRODUCTS_CACHE_DURATION) {
    try {
      sheetProducts = JSON.parse(cachedProducts);
      sheetProductsLoaded = true;
      setProductStockMap(sheetProducts);
      refreshProductsFromSheetInBackground();
      return sheetProducts;
    } catch (e) {
      // Ignore cache parse issue and continue with network.
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // Faster failover for better UX
    
    console.log('Fetching products from Sheet...');
    const res = await fetch(APPS_SCRIPT_URL + '?action=getProducts', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.warn('Sheet response not OK:', res.status, res.statusText);
      throw new Error('HTTP ' + res.status);
    }
    
    const data = await res.json();
    console.log('Sheet response:', data);
    
    if (data.success && data.products && data.products.length > 0) {
      console.log('Loaded ' + data.products.length + ' products from Sheet');
      sheetProducts = data.products.map(normalizeSheetProduct);
      sheetProductsLoaded = true;
      setProductStockMap(sheetProducts);
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(sheetProducts));
      localStorage.setItem(PRODUCTS_CACHE_TIME_KEY, Date.now().toString());
      return sheetProducts;
    } else {
      console.warn('Sheet data invalid or empty');
      throw new Error('No products from Sheet');
    }
  } catch(e) {
    console.log('Sheet load failed, using local DB:', e.message);
  }

  // If network fails, still try stale cache before local DB.
  if (cachedProducts) {
    try {
      sheetProducts = JSON.parse(cachedProducts);
      sheetProductsLoaded = true;
      setProductStockMap(sheetProducts);
      return sheetProducts;
    } catch (e) {
      // Continue to local DB fallback.
    }
  }
  
  // Fallback to local database
  console.log('Loading ' + productsDB.length + ' products from local database');
  sheetProducts = productsDB;
  sheetProductsLoaded = true;
  return sheetProducts;
}

// ===== RENDER PRODUCT CARD =====
function renderProductCard(p) {
  const stock = stockCacheData ? (stockCacheData[p.id] !== undefined ? stockCacheData[p.id] : p.stock) : (p.stock || 0);
  const soldOut = stock <= 0;
  return `<div class="home-product"
      data-id="${p.id}"
      data-name="${p.name}"
      data-price="${p.price}"
      data-image="${p.image}"
      data-category="${p.category || '3pc'}"
      data-fabric="${p.fabric || 'lawn'}">
      <div class="product-image-wrapper" style="position:relative;">
        ${soldOut ? '<div class="sold-out-badge" style="position:absolute;top:12px;left:12px;background:#d32f2f;color:#fff;padding:5px 12px;font-size:11px;font-weight:700;letter-spacing:1px;z-index:10;">SOLD OUT</div>' : ''}
        <a href="product.html?id=${p.id}">
          <img src="${p.image}" alt="${p.name}">
        </a>
        <div class="hover-actions">
          <button class="quick-add-btn add-to-bag" ${soldOut ? 'disabled style="background:#999;cursor:not-allowed;"' : ''}>
            ${soldOut ? 'SOLD OUT' : 'ADD TO BAG'}
          </button>
          <button class="wishlist-btn" onclick="toggleHeart(this)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="product-info">
        <h3>${p.name}</h3>
        <div class="price">Rs. ${parseInt(p.price).toLocaleString()}</div>
      </div>
    </div>`;
}

// ===== DYNAMIC PRODUCT PAGE LOADER =====
async function loadProductPage() {
  if (!document.getElementById('product-title')) return;

  const products = await loadProductsFromSheet();
  const params = new URLSearchParams(window.location.search);
  const productId = parseInt(params.get('id'));
  const product = products.find(p => p.id === productId);

  if (!product) {
    document.querySelector('.product-page').innerHTML = '<p style="padding:40px;text-align:center;font-family:Poppins,sans-serif;">Product not found.</p>';
    return;
  }

  document.title = product.name + ' - Pehnawa By Fatima';
  document.getElementById('product-title').innerText = product.name.toUpperCase();
  document.getElementById('product-price').innerText = 'Rs. ' + parseInt(product.price).toLocaleString();
  document.getElementById('product-sku').innerText = product.sku || ('SKU: PROD00' + product.id);
  document.getElementById('content-details').innerHTML = '<p>' + (product.details || '') + '</p>';
  document.getElementById('content-desc').innerHTML = '<p>' + (product.description || '') + '</p>';

  const imagesContainer = document.getElementById('product-images');
  imagesContainer.innerHTML = `<img src="${product.image}" alt="${product.name}" class="product-main-img">
    <img src="${product.image}" alt="${product.name}" class="product-main-img">`;

  // Setup image zoom after images are added
  const productImages = document.querySelectorAll('.product-main-img');
  const zoomModal = document.getElementById('zoom-modal');
  const zoomedImage = document.getElementById('zoomed-image');
  const closeZoom = document.getElementById('close-zoom');

  if (productImages.length > 0 && zoomModal) {
    productImages.forEach(img => {
      img.addEventListener('click', function() {
        zoomedImage.src = this.src;
        zoomModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    if (closeZoom) {
      closeZoom.addEventListener('click', function() {
        zoomModal.classList.remove('active');
        document.body.style.overflow = 'auto';
      });
    }

    zoomModal.addEventListener('click', function(e) {
      if (e.target === zoomModal) {
        zoomModal.classList.remove('active');
        document.body.style.overflow = 'auto';
      }
    });
  }

  window.currentProductId = productId;
  const isStitched = isStitchedType(product.productType);
  const navS = document.getElementById('nav-stitched');
  const navU = document.getElementById('nav-unstitched');
  // Remove active-link from both first
  if (navS) navS.classList.remove('active-link');
  if (navU) navU.classList.remove('active-link');
  // Add to the correct one
  if (isStitched && navS) navS.classList.add('active-link');
  else if (navU) navU.classList.add('active-link');
}

loadProductPage();
applyStockToCards();

// ===== AUTO-REFRESH STOCK DATA =====
// Refresh when page comes back to focus (respects cache)
window.addEventListener('focus', async () => {
  console.log('Page focused - checking stock...');
  await fetchStockFromSheet(false); // Respects cache, no force refresh
  applyStockToCards();
});

// Auto-refresh every 2 minutes to catch sold-out items quickly
setInterval(async () => {
  console.log('Auto-refreshing stock...');
  await fetchStockFromSheet(false); // Respects cache for better performance
  applyStockToCards();
}, 2 * 60 * 1000);

// ===== CART & WISHLIST COUNT FUNCTIONS - GLOBAL SCOPE =====
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCountEl = document.getElementById('cart-count');

  if (cartCountEl) {
    if (totalItems > 0) {
      cartCountEl.innerText = totalItems;
      cartCountEl.style.display = 'flex';
    } else {
      cartCountEl.innerText = '0';
      cartCountEl.style.display = 'none';
    }
  }
}

function updateWishlistCount() {
  const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
  const wishlistCountEl = document.getElementById('wishlist-count');

  if (wishlistCountEl) {
    if (wishlist.length > 0) {
      wishlistCountEl.innerText = wishlist.length;
      wishlistCountEl.style.display = 'flex';
    } else {
      wishlistCountEl.innerText = '0';
      wishlistCountEl.style.display = 'none';
    }
  }
}

// ===== HIGHLIGHT WISHLIST ITEMS ON PAGE LOAD =====
function highlightWishlistItems() {
  const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
  const wishlistIds = wishlist.map(item => item.id);
  
  // Highlight wishlist buttons (hearts) on all product cards
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const productCard = btn.closest('.home-product') || btn.closest('.product');
    if (productCard) {
      const productId = parseInt(productCard.dataset.id);
      if (wishlistIds.includes(productId)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', async function() {

  // ===== DYNAMIC GRID LOAD FROM SHEET =====
  const unstitchedGrid = document.getElementById('unstitched-grid');
  const stitchedGrid = document.getElementById('stitched-grid');

  if (unstitchedGrid || stitchedGrid) {
    const products = await loadProductsFromSheet();
    renderDynamicCollectionGrids(products);
    refreshProductsFromSheetInBackground((latestProducts) => {
      renderDynamicCollectionGrids(latestProducts);
      applyStockToCards();
      highlightWishlistItems();
    });
  }

  // ===== 0. GRID TOGGLE - NEW FEATURE ===== //
  const gridToggleBtns = document.querySelectorAll('.grid-btn');
  const productGrid = document.querySelector('.product-grid');
  const productCountEl = document.querySelector('.product-count');
  const gridToggleExists = document.querySelector('.grid-toggle');

  if (productGrid && gridToggleExists) {
    // Count products and update
    const productCount = productGrid.querySelectorAll('.product').length;
    if (productCountEl) {
      productCountEl.textContent = `${productCount} items`;
    }

    // Load saved preference from localStorage
    const savedCols = localStorage.getItem('pehnawaGridCols') || '3';
    setGridColumns(savedCols);

    // Button click event
    gridToggleBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const cols = this.dataset.cols;
        setGridColumns(cols);
        localStorage.setItem('pehnawaGridCols', cols);
      });
    });

    function setGridColumns(cols) {
      productGrid.setAttribute('data-grid-cols', cols);
      gridToggleBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cols === cols);
      });
    }
	
  }

  // ===== CART FUNCTIONS =====
// Validate if we can add/increase a product in cart based on stock - WITH CACHE
async function validateCartStock(productId, quantity) {
  let stockMap = stockMapGlobal;
  if (!stockMap) {
    stockMap = await fetchStockFromSheet();
  }
  if (!stockMap) return true; // Allow if stock fetch fails
  
  const availableStock = stockMap[productId] ?? 99;
  return quantity <= availableStock;
}

// Get available stock for a product - WITH CACHE
async function getAvailableStock(productId) {
  let stockMap = stockMapGlobal;
  if (!stockMap) {
    stockMap = await fetchStockFromSheet();
  }
  if (!stockMap) return 99;
  return stockMap[productId] ?? 99;
}

  function updateCartSidebar() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItemsContainer = document.getElementById('cart-items');
    const subtotalElement = document.getElementById('cart-total');

    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    let subtotal = 0;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
    } else {
      cart.forEach((item, index) => {
        subtotal += item.price * item.qty;

        cartItemsContainer.innerHTML += `
          <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-details">
              <h4>${item.name}</h4>
              <p style="font-size:12px; margin:3px 0;">Size: ${item.size}</p>
              <div class="cart-item-price">
                <span class="discounted">Rs.${item.price.toLocaleString()}</span>
              </div>
              <p style="color: #2e7d32; font-size: 12px; margin: 3px 0;">In Stock</p>
              <div class="cart-item-actions">
                <button class="qty-btn" data-index="${index}" data-action="decrease">−</button>
                <span>${item.qty}</span>
                <button class="qty-btn" data-index="${index}" data-action="increase">+</button>
                <span class="delete-btn" data-index="${index}">🗑️</span>
              </div>
            </div>
          </div>
        `;
      });
    }

    if (subtotalElement) {
      subtotalElement.textContent = `Rs. ${subtotal.toLocaleString()}`;
    }
  }

  updateCartCount();
  updateWishlistCount();
  highlightWishlistItems(); // Highlight items that are already in wishlist

  // ===== HERO SLIDER WITH DRAG/SWIPE =====
  const slider = document.querySelector('.hero-slider');
  const wrapper = document.querySelector('.slider-wrapper');
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');

  if (slider && wrapper && slides.length > 0) {
    let currentSlide = 0;
    let isDragging = false;
    let startPos = 0;
    let currentTranslate = 0;
    let autoSlideTimer;

    function updateSlidePosition() {
      wrapper.style.transform = `translateX(${-currentSlide * 100}%)`;
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentSlide);
      });
    }

    function showSlide(n) {
      currentSlide = (n + slides.length) % slides.length;
      updateSlidePosition();
    }

    function nextSlide() {
      showSlide(currentSlide + 1);
      resetAutoSlide();
    }

    function prevSlide() {
      showSlide(currentSlide - 1);
      resetAutoSlide();
    }

    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        showSlide(index);
        resetAutoSlide();
      });
    });

    function startAutoSlide() {
      autoSlideTimer = setInterval(() => {
        showSlide(currentSlide + 1);
      }, 4000);
    }

    function resetAutoSlide() {
      clearInterval(autoSlideTimer);
      startAutoSlide();
    }

    startAutoSlide();

    // Drag Functionality
    slider.addEventListener('mousedown', dragStart);
    slider.addEventListener('touchstart', dragStart);
    slider.addEventListener('mousemove', drag);
    slider.addEventListener('touchmove', drag);
    slider.addEventListener('mouseup', dragEnd);
    slider.addEventListener('mouseleave', dragEnd);
    slider.addEventListener('touchend', dragEnd);

    function dragStart(e) {
      isDragging = true;
      startPos = getPositionX(e);
      wrapper.style.transition = 'none';
      clearInterval(autoSlideTimer);
    }

    function drag(e) {
      if (!isDragging) return;
      e.preventDefault();
      const currentPosition = getPositionX(e);
      const diff = currentPosition - startPos;
      const movePercent = (diff / slider.offsetWidth) * 100;
      currentTranslate = -currentSlide * 100 + movePercent;
      wrapper.style.transform = `translateX(${currentTranslate}%)`;
    }

    function dragEnd() {
      if (!isDragging) return;
      isDragging = false;
      wrapper.style.transition = 'transform 0.5s ease';

      const movedBy = currentTranslate - (-currentSlide * 100);
      if (movedBy < -20) showSlide(currentSlide + 1);
      else if (movedBy > 20) showSlide(currentSlide - 1);
      else updateSlidePosition();

      resetAutoSlide();
    }

    function getPositionX(e) {
      return e.type.includes('mouse')? e.pageX : e.touches[0].clientX;
    }

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });
  }

  // ===== SEARCH DRAWER - CART KI TARAH RIGHT SE =====
  const searchToggle = document.getElementById('search-toggle');
  const searchDrawer = document.getElementById('search-drawer');
  const closeSearch = document.getElementById('close-search');
  const overlay = document.getElementById('overlay');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  if (searchToggle) {
    searchToggle.addEventListener('click', () => {
      if (searchDrawer) {
        searchDrawer.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => searchInput.focus(), 300);
      }
    });
  }

  function closeSearchDrawer() {
    if (searchDrawer) {
      searchDrawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = 'auto';
      if (searchInput) searchInput.value = '';
      if (searchResults) searchResults.style.display = 'none';
    }
  }

  if (closeSearch) closeSearch.addEventListener('click', closeSearchDrawer);

  // Search Functionality
  if (searchInput && searchResults) {
    const allProducts = productsDB.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: 'images/' + p.images[0].split('/').pop(),
      link: p.link
    }));

    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();

      if (query.length === 0) {
        searchResults.style.display = 'none';
        searchResults.innerHTML = '';
        return;
      }

      const filtered = allProducts.filter(product =>
        product.name.toLowerCase().includes(query)
      );

      if (filtered.length > 0) {
        searchResults.style.display = 'block';
        searchResults.innerHTML = filtered.map(product => `
          <a href="${product.link}" class="search-result-item">
            <img src="${product.image}" alt="${product.name}">
            <div>
              <div class="search-result-name">${product.name}</div>
              <div class="search-result-price">Rs. ${product.price.toLocaleString()}</div>
            </div>
          </a>
        `).join('');
      } else {
        searchResults.style.display = 'block';
        searchResults.innerHTML = `
          <div class="no-results">
            No products found for "${query}"
          </div>
        `;
      }
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('#search-input') &&!e.target.closest('#search-results') &&!e.target.closest('#search-toggle')) {
        if (searchResults) searchResults.style.display = 'none';
      }
    });
  }

  // ===== CART SIDEBAR =====
  const cartIcon = document.querySelector('.cart-icon');
  const cartSidebar = document.getElementById('cart-sidebar');
  const closeCartBtn = document.getElementById('close-cart');
  const checkoutBtn = document.querySelector('.checkout-btn');

  if (cartIcon) {
    cartIcon.addEventListener('click', function() {
      if (cartSidebar) {
        cartSidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateCartSidebar();
      }
    });
  }

  function closeCart() {
    if (cartSidebar) {
      cartSidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);

  // Overlay click pe dono band ho jayein
  if (overlay) {
    overlay.addEventListener('click', () => {
      closeSearchDrawer();
      closeCart();
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
      window.location.href = 'checkout.html';
    });
  }

  // Cart sidebar quantity buttons - Event Delegation
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('qty-btn') && e.target.dataset.index) {
      const index = parseInt(e.target.dataset.index);
      const action = e.target.dataset.action;
      const cart = JSON.parse(localStorage.getItem('cart')) || [];

      if (action === 'increase') {
        // Stock check karo cached data se
        const productId = cart[index].id;
        const maxStock = stockMapGlobal ? (stockMapGlobal[productId] !== undefined ? stockMapGlobal[productId] : 99) : 99;
        if (cart[index].qty < maxStock) {
          cart[index].qty++;
        } else {
          showNotification('Sirf ' + maxStock + ' pieces available hain!');
          return;
        }
      } else if (action === 'decrease') {
        cart[index].qty--;
        if (cart[index].qty <= 0) {
          cart.splice(index, 1);
        }
      }

      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      updateCartSidebar();
    }

    if (e.target.classList.contains('delete-btn') && e.target.dataset.index) {
      const index = parseInt(e.target.dataset.index);
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      cart.splice(index, 1);
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
      updateCartSidebar();
    }
  });

  // ===== PRODUCT DETAIL PAGE LOGIC =====
  if (document.querySelector('.product-page')) {
    let currentQty = 1;
    let selectedSize = '';

    // Size selection
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedSize = this.dataset.size;
      });
    });

    // Quantity buttons
    const qtyMinus = document.getElementById('qty-minus');
    const qtyPlus = document.getElementById('qty-plus');

    if (qtyMinus) {
      qtyMinus.addEventListener('click', function() {
        if (currentQty > 1) {
          currentQty--;
          document.getElementById('qty-display').innerText = currentQty;
        }
      });
    }

    if (qtyPlus) {
      qtyPlus.addEventListener('click', function() {
        // Cache se stock lo - fast!
        const maxStock = stockMapGlobal ? (stockMapGlobal[window.currentProductId] !== undefined ? stockMapGlobal[currentProductId] : 99) : 99;

        if (currentQty < maxStock) {
          currentQty++;
          document.getElementById('qty-display').innerText = currentQty;
        } else {
          showNotification('Sirf ' + maxStock + ' pieces available hain!');
        }
      });
    }

    // Tabs
    document.querySelectorAll('.tab-link').forEach(tab => {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
          content.style.display = 'none';
        });
        const tabContent = document.getElementById('content-' + this.dataset.tab);
        if (tabContent) tabContent.style.display = 'block';
      });
    });

    // Add to Cart
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', async function() {
        // Get product ID to check if stitched or unstitched
        const params2 = new URLSearchParams(window.location.search);
        const productId = parseInt(params2.get('id'));
        
        // For stitched products (ID 5-8), require size selection
        if (productId >= 5) {
          if (!selectedSize) {
            showNotification('Please select a size first');
            return;
          }
        }

        // Fast stock check using current cache. Background refresh will sync latest.
        const stockMapNow = stockMapGlobal || await fetchStockFromSheet(false);
        const maxStock2 = stockMapNow ? (stockMapNow[productId] !== undefined ? stockMapNow[productId] : 99) : 99;

        if (maxStock2 <= 0) {
          showNotification('Yeh product sold out hai!');
          return;
        }

        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingCartItem = cart.find(p => p.id === productId);
        const alreadyInCart = existingCartItem ? existingCartItem.qty : 0;

        if ((alreadyInCart + currentQty) > maxStock2) {
          const remaining = maxStock2 - alreadyInCart;
          showNotification('Sirf ' + remaining + ' pieces available hain!');
          return;
        }
        const productTitle = document.querySelector('.product-title');
        const productImg = document.querySelector('.product-main-img');
        const productPrice = document.querySelector('.product-price');

        const params = new URLSearchParams(window.location.search);
        const productPageId = parseInt(params.get('id')) || Date.now();
        
        // For unstitched products (ID < 5), set size to empty
        const productSize = productPageId >= 5 ? selectedSize : '';
        
        const item = {
          id: productPageId,
          name: productTitle? productTitle.innerText : 'Product',
          price: productPrice? parseInt(productPrice.innerText.replace(/[^0-9]/g, '')) : 0,
          image: productImg? productImg.getAttribute('src') : '',
          size: productSize,
          qty: currentQty
        };

        const existingIndex = cart.findIndex(p =>
          p.id === item.id && p.size === item.size
        );

        if (existingIndex > -1) {
          cart[existingIndex].qty += item.qty;
        } else {
          cart.push(item);
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Don't block UI on network; sync stock silently in background.
        triggerStockRefreshInBackground();
        
        updateCartCount();
        updateCartSidebar();

        // Open cart sidebar
        if (cartSidebar) {
          cartSidebar.classList.add('active');
          overlay.classList.add('active');
          document.body.style.overflow = 'hidden';
        }

        // Button animation
        const btn = this;
        btn.innerText = 'ADDED ✓';
        btn.style.background = '#008000';
        setTimeout(function() {
          btn.innerText = 'ADD TO CART';
          btn.style.background = '#000';
        }, 2000);
      });
    }
  }
 // ===== HOVER BUTTON - QUICK ADD TO CART =====
document.addEventListener('click', async function(e) {
  if (e.target.classList.contains('quick-add-btn')) {
    const productCard = e.target.closest('.home-product') || e.target.closest('.product');
    
    if (productCard) {
      const name = productCard.dataset.name;
      const price = parseInt(productCard.dataset.price);
      const image = productCard.dataset.image || productCard.querySelector('img')?.src || '';
      const productId = parseInt(productCard.dataset.id);

      // Cart mein kitna already hai
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const productSize = productId >= 5 ? "Standard" : ""; // Empty size for unstitched
      const existingIndex = cart.findIndex(p => p.id === productId && p.size === productSize);
      const cartQty = existingIndex > -1 ? cart[existingIndex].qty : 0;

      // Fast stock check using cache first.
      if (productId) {
        const stockMap = stockMapGlobal || await fetchStockFromSheet(false);
        const availableStock = stockMap ? (stockMap[productId] !== undefined ? stockMap[productId] : 99) : 99;

        if (availableStock <= 0) {
          showNotification('Sorry! Yeh product sold out hai!');
          return;
        }

        // Check if adding 1 more would exceed available stock
        if ((cartQty + 1) > availableStock) {
          showNotification('Sirf ' + availableStock + ' pieces available hain! Aapkey paas already ' + cartQty + ' hai.');
          return;
        }
      }

      const item = {
        id: productId,
        name: name,
        price: price,
        image: image,
        size: productId >= 5 ? "Standard" : "", // Empty size for unstitched (ID < 5)
        qty: 1
      };

      if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
      } else {
        cart.push(item);
      }

      localStorage.setItem('cart', JSON.stringify(cart));
      
      // Keep add-to-cart instant; refresh stock in background.
      triggerStockRefreshInBackground();
      
      // Call your existing functions to refresh the count and sidebar
        updateCartCount();
        updateCartSidebar();
      // Show the Sidebar (Optional)
      const cartSidebar = document.getElementById('cart-sidebar');
      const overlay = document.getElementById('overlay');
      if (cartSidebar && overlay) {
          cartSidebar.classList.add('active');
          overlay.classList.add('active');
          document.body.style.overflow = 'hidden';
      }

      // Button Feedback
      const originalText = e.target.innerText;
      e.target.innerText = 'ADDED ✓';
      e.target.style.backgroundColor = '#2e7d32'; // Green
      setTimeout(() => {
        e.target.innerText = originalText;
        e.target.style.backgroundColor = ''; // Reset
      }, 1500);
    }
  }
});

// Aggressive sync on focus: reflect latest sheet changes quickly.
window.addEventListener('focus', async () => {
  await aggressiveSyncProductsNow();
});

// Keep catalog pages fresh while user is browsing.
setInterval(async () => {
  await aggressiveSyncProductsNow();
}, 60 * 1000);

// ===== MENU DRAWER - SIMPLE VERSION =====
{

  const menuIcon = document.getElementById('menu-icon');
  const menuDrawer = document.getElementById('menu-drawer');
  const closeMenu = document.getElementById('close-menu');
  const menuOverlay = document.getElementById('menu-overlay');

  console.log('Menu Icon:', menuIcon); // Check karne ke liye

  if (menuIcon && menuDrawer && menuOverlay) {
    menuIcon.addEventListener('click', function() {
      console.log('Menu clicked!'); // Ye console mein dikhega
      menuDrawer.classList.add('active');
      menuOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  if (closeMenu && menuDrawer && menuOverlay) {
    closeMenu.addEventListener('click', function() {
      menuDrawer.classList.remove('active');
      menuOverlay.classList.remove('active');
      document.body.style.overflow = 'auto';
    });
  }

  if (menuOverlay && menuDrawer) {
    menuOverlay.addEventListener('click', function() {
      menuDrawer.classList.remove('active');
      menuOverlay.classList.remove('active');
      document.body.style.overflow = 'auto';
    });
  }

}
// ===== FILTER & SORT =====
{

  const filterToggle = document.getElementById('filter-toggle');
  const filterDrawer = document.getElementById('filter-drawer');
  const closeFilter = document.getElementById('close-filter');
  const filterOverlay = document.getElementById('filter-overlay');
  const filterChecks = document.querySelectorAll('.filter-check');
  const clearFilters = document.getElementById('clear-filters');
  const sortSelect = document.getElementById('sort-select');
  function getFilterableProducts() {
    return Array.from(document.querySelectorAll('.product-grid .home-product, .product-grid .product'));
  }

  // Open/Close Filter
  if (filterToggle) {
    filterToggle.addEventListener('click', function() {
      filterDrawer.classList.add('active');
      filterOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  function closeFilterDrawer() {
    filterDrawer.classList.remove('active');
    filterOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
  }

  if (closeFilter) closeFilter.addEventListener('click', closeFilterDrawer);
  if (filterOverlay) filterOverlay.addEventListener('click', closeFilterDrawer);

  // Filter Logic
  function applyFilters() {
    const activeFilters = {
      category: [],
      fabric: [],
      price: []
    };

    filterChecks.forEach(check => {
      if (check.checked) {
        activeFilters[check.dataset.filter].push(check.value);
      }
    });

    const products = getFilterableProducts();
    products.forEach(product => {
      let show = true;

      // Category Filter
      if (activeFilters.category.length > 0) {
        if (!activeFilters.category.includes(product.dataset.category)) {
          show = false;
        }
      }

      // Fabric Filter
      if (activeFilters.fabric.length > 0 && show) {
        if (!activeFilters.fabric.includes(product.dataset.fabric)) {
          show = false;
        }
      }

      // Price Filter
      if (activeFilters.price.length > 0 && show) {
        const price = parseInt(product.dataset.price);
        let priceMatch = false;
        activeFilters.price.forEach(range => {
          const [min, max] = range.split('-').map(Number);
          if (price >= min && price <= max) priceMatch = true;
        });
        if (!priceMatch) show = false;
      }

      product.style.display = show? 'block' : 'none';
    });
  }

  filterChecks.forEach(check => {
    check.addEventListener('change', applyFilters);
  });

  // Clear Filters
  if (clearFilters) {
    clearFilters.addEventListener('click', function() {
      filterChecks.forEach(check => check.checked = false);
      const products = getFilterableProducts();
      products.forEach(product => product.style.display = 'block');
    });
  }

  // Sort Logic
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      const sortBy = this.value;
      const productGrid = document.querySelector('.product-grid');
      if (!productGrid) return;
      const productArray = getFilterableProducts();

      productArray.sort((a, b) => {
        if (sortBy === 'price-low') {
          return parseInt(a.dataset.price) - parseInt(b.dataset.price);
        } else if (sortBy === 'price-high') {
          return parseInt(b.dataset.price) - parseInt(a.dataset.price);
        } else if (sortBy === 'name') {
          return a.dataset.name.localeCompare(b.dataset.name);
        }
        return 0;
      });

      productArray.forEach(product => productGrid.appendChild(product));
      applyFilters();
    });
	
  }
 

}
});
// ===== HIGHLIGHT WISHLIST ITEMS ON PAGE LOAD =====
function highlightWishlistItems() {
  const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
  const wishlistIds = wishlist.map(item => item.id);
  
  // Highlight wishlist buttons (hearts) on all product cards
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const productCard = btn.closest('.home-product') || btn.closest('.product');
    if (productCard) {
      const productId = parseInt(productCard.dataset.id);
      if (wishlistIds.includes(productId)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });
}

function toggleHeart(btn) {
  const productCard = btn.closest('.home-product') || btn.closest('.product');
  const productId = productCard ? parseInt(productCard.dataset.id) : null;
  const productName = productCard ? (productCard.dataset.name || 'Product') : 'Product';
  const productImage = productCard ? (productCard.dataset.image || productCard.querySelector('img')?.src || '') : '';
  const productPrice = productCard ? parseInt(productCard.dataset.price) : 0;

  // Get existing wishlist
  let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

  // Check if already in wishlist
  const isInWishlist = wishlist.find(item => item.id === productId);

  if (!isInWishlist) {
    // Add to wishlist
    if (productId) {
      wishlist.push({
        id: productId,
        name: productName,
        image: productImage,
        price: productPrice
      });
      btn.classList.add('active');
      showNotification(`Added ${productName} to wishlist! ❤️`);
    }
  } else {
    // Remove from wishlist
    wishlist = wishlist.filter(item => item.id !== productId);
    btn.classList.remove('active');
    showNotification(`Removed ${productName} from wishlist! 💔`);
  }

  // Save to localStorage
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  updateWishlistCount();
}

function showNotification(msg) {
  const old = document.querySelector('.notification');
  if (old) old.remove();
  
  const notif = document.createElement('div');
  notif.className = 'notification';
  notif.textContent = msg;
  
  // Minimal styles to ensure visibility
  Object.assign(notif.style, {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#333',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '30px',
    zIndex: '10000'
  });

  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}
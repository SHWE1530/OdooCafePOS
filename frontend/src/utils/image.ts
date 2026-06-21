/**
 * Unified image utility for product catalog and menus.
 * Automatically resolves static paths served by the backend, or returns high-quality fallback Unsplash assets.
 */
export const getProductImage = (name: string, url?: string): string => {
  if (url && url.trim().length > 0 && !url.includes('placeholder')) {
    // If it's a relative path to static folder, prepend the backend host
    if (url.startsWith('static/') || url.startsWith('/static/')) {
      const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
      return `http://localhost:8000/${cleanUrl}`;
    }
    return url;
  }
  
  const n = name.toLowerCase();
  if (n.includes('cappuccino') || n.includes('latte') || n.includes('espresso') || n.includes('coffee')) {
    return 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('pizza') || n.includes('margherita')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('croissant') || n.includes('bakery')) {
    return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('sandwich')) {
    return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('cake') || n.includes('cheesecake') || n.includes('dessert') || n.includes('mud cake')) {
    return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('burger')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('pasta') || n.includes('spaghetti')) {
    return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('roll') || n.includes('tikka') || n.includes('paneer')) {
    return 'https://images.unsplash.com/photo-1626700051175-6518c4793f76?w=500&auto=format&fit=crop&q=60';
  }
  if (n.includes('cooler') || n.includes('drink') || n.includes('beverage') || n.includes('mango') || n.includes('mint')) {
    return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60';
  }
  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop&q=60';
};

const ownerDashboard = document.querySelector("[data-owner-dashboard]");

if (ownerDashboard) {
  const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const readList = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  const currentUser = (() => {
    try { return JSON.parse(sessionStorage.getItem("vendorLiftDemoAuth") || "{}"); } catch { return {}; }
  })();
  const restaurantName = ownerDashboard.querySelector("[data-restaurant-name]").textContent.trim();
  const restaurants = readList("vendorLiftRestaurants");
  const restaurant = restaurants.find((item) => item.ownerEmail === currentUser.email) || null;
  const restaurantId = restaurant?.id || sessionStorage.getItem("vendorLiftRestaurantId");
  const orders = readList("vendorLiftOrders").filter((order) => order.restaurantId === restaurantId || order.restaurantName === restaurantName);
  const enquiries = readList("vendorLiftRestaurantEnquiries").filter((item) => item.restaurantId === restaurantId);
  const dishes = Array.isArray(restaurant?.dishes) ? restaurant.dishes : [];
  const displayName = String(currentUser.displayName || "").trim().split(/\s+/)[0];
  const greeting = displayName || "there";

  ownerDashboard.querySelector("[data-greeting-name]").textContent = greeting;
  ownerDashboard.querySelector("[data-order-count]").textContent = String(orders.length);
  ownerDashboard.querySelector("[data-revenue]").textContent = currency.format(orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0));
  ownerDashboard.querySelector("[data-dish-count]").textContent = String(dishes.length);
  ownerDashboard.querySelector("[data-enquiry-count]").textContent = String(enquiries.length);
  ownerDashboard.querySelectorAll("[data-avatar-letter]").forEach((avatar) => {
    avatar.textContent = restaurantName.charAt(0).toUpperCase() || "V";
  });
  const dateLabel = ownerDashboard.querySelector("[data-today-label]");
  dateLabel.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());

  const menuPreview = ownerDashboard.querySelector("[data-menu-preview]");
  if (!dishes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state menu-empty";
    empty.textContent = "Your dishes will show here once you add them to your menu.";
    menuPreview.append(empty);
  } else {
    dishes.slice(0, 4).forEach((dish) => {
      const row = document.createElement("article");
      row.className = "menu-preview-item";
      const thumb = document.createElement("span");
      thumb.className = "menu-thumb";
      if (dish.photo) {
        const image = document.createElement("img");
        image.src = dish.photo;
        image.alt = "";
        thumb.append(image);
      } else {
        thumb.textContent = "✳";
      }
      const details = document.createElement("div");
      details.className = "menu-item-details";
      const name = document.createElement("strong");
      name.textContent = dish.name || "Untitled dish";
      const description = document.createElement("span");
      description.textContent = dish.description || "On your menu";
      details.append(name, description);
      const price = document.createElement("span");
      price.className = "menu-item-price";
      price.textContent = currency.format(Number(dish.price) || 0);
      row.append(thumb, details, price);
      menuPreview.append(row);
    });
    if (dishes.length > 4) {
      const more = document.createElement("a");
      more.className = "menu-preview-more";
      more.href = "menu.html";
      more.textContent = `View all ${dishes.length} dishes`;
      menuPreview.append(more);
    }
  }

  const chart = ownerDashboard.querySelector("[data-orders-chart]");
  if (orders.length) {
    chart.querySelector("p").textContent = `${orders.length} order${orders.length === 1 ? "" : "s"} received so far`;
    const bars = chart.querySelectorAll(".chart-bars i");
    bars.forEach((bar, index) => {
      const activity = orders.filter((order) => {
        const date = new Date(order.createdAt);
        const day = (date.getDay() + 6) % 7;
        return day === index;
      }).length;
      bar.style.height = `${Math.max(8, Math.min(82, activity * 23 + 8))}%`;
      bar.style.background = activity ? "#003399" : "rgba(0, 51, 153, .13)";
    });
  }
}

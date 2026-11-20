const list = document.querySelector("[data-restaurant-list]");
const search = document.querySelector("#restaurant-search");
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const feedbackKey = "vendorLiftRestaurantFeedback";

function readFeedback() {
  try {
    const data = JSON.parse(localStorage.getItem(feedbackKey) || "{}");
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function getReviewerName() {
  try {
    const user = JSON.parse(sessionStorage.getItem("vendorLiftDemoAuth") || "{}");
    return user.displayName || user.name || "Customer";
  } catch {
    return "Customer";
  }
}

function renderFeedback(card, restaurant) {
  const feedback = readFeedback();
  const entries = Array.isArray(feedback[restaurant.id]) ? feedback[restaurant.id] : [];
  const section = document.createElement("section");
  section.className = "restaurant-feedback";
  section.setAttribute("aria-label", `Ratings and comments for ${restaurant.details?.resturantName || "restaurant"}`);
  const heading = document.createElement("h3");
  heading.textContent = "Ratings & comments";
  const summary = document.createElement("p");
  summary.className = "feedback-summary";
  const ratings = entries.filter((entry) => Number(entry.rating) >= 1 && Number(entry.rating) <= 5);
  const average = ratings.length ? ratings.reduce((sum, entry) => sum + Number(entry.rating), 0) / ratings.length : 0;
  summary.textContent = ratings.length ? `★ ${average.toFixed(1)} out of 5 · ${ratings.length} ${ratings.length === 1 ? "rating" : "ratings"}` : "No ratings yet";
  const comments = document.createElement("div");
  comments.className = "restaurant-feedback-comments";
  entries.filter((entry) => entry.comment).slice(-3).reverse().forEach((entry) => {
    const comment = document.createElement("p");
    comment.className = "restaurant-feedback-comment";
    const author = document.createElement("strong");
    author.textContent = `${entry.author || "Customer"}: `;
    comment.append(author, document.createTextNode(entry.comment));
    comments.append(comment);
  });
  const reviewButton = document.createElement("button");
  reviewButton.className = "review-toggle";
  reviewButton.type = "button";
  reviewButton.textContent = "Review / rate";
  const form = document.createElement("form");
  form.className = "restaurant-feedback-form";
  form.hidden = true;
  reviewButton.setAttribute("aria-expanded", "false");
  reviewButton.addEventListener("click", () => {
    form.hidden = !form.hidden;
    reviewButton.setAttribute("aria-expanded", String(!form.hidden));
    if (!form.hidden) rating.focus();
  });
  const ratingLabel = document.createElement("label");
  ratingLabel.textContent = "Your rating";
  const rating = document.createElement("select");
  rating.name = "rating";
  rating.required = true;
  rating.setAttribute("aria-label", `Choose a rating for ${restaurant.details?.resturantName || "restaurant"}`);
  rating.add(new Option("Rate…", ""));
  [5, 4, 3, 2, 1].forEach((value) => rating.add(new Option(`${value} stars`, String(value))));
  ratingLabel.append(rating);
  const commentLabel = document.createElement("label");
  commentLabel.textContent = "Comment (optional)";
  const commentInput = document.createElement("input");
  commentInput.name = "comment";
  commentInput.type = "text";
  commentInput.maxLength = 300;
  commentInput.placeholder = "Share your experience";
  commentLabel.append(commentInput);
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Post";
  form.append(ratingLabel, commentLabel, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = Number(rating.value);
    const text = commentInput.value.trim();
    if (value < 1 || value > 5 || (!text && !value)) return;
    const latest = readFeedback();
    const current = Array.isArray(latest[restaurant.id]) ? latest[restaurant.id] : [];
    current.push({ rating: value, comment: text, author: getReviewerName(), createdAt: new Date().toISOString() });
    latest[restaurant.id] = current;
    localStorage.setItem(feedbackKey, JSON.stringify(latest));
    renderFeedback(card, restaurant);
  });
  section.append(heading, summary, comments, reviewButton, form);
  card.append(section);
}

function getRestaurants() {
  try {
    const data = JSON.parse(localStorage.getItem("vendorLiftRestaurants") || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
// find resturant
function renderRestaurants() {
  const query = search.value.trim().toLowerCase();
  const restaurants = getRestaurants().filter((restaurant) => {
    const details = restaurant.details || {};
    return `${details.resturantName || ""} ${details.resturantLocation || ""} ${details.resturantCuisineType || ""}`.toLowerCase().includes(query);
  });
  list.replaceChildren();
  if (!restaurants.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state restaurant-empty";
    empty.textContent = query ? "No restaurants match your search." : "No restaurant pages yet. Restaurant menus will appear here when owners publish their dishes.";
    list.append(empty);
    return;
  }

  for (const restaurant of restaurants) {
    const details = restaurant.details || {};
    const card = document.createElement("article");
    card.className = "restaurant-directory-card";
    const icon = document.createElement("span");
    icon.className = "directory-avatar";
    icon.textContent = (details.resturantName || "R").trim().charAt(0).toUpperCase();
    const content = document.createElement("div");
    content.className = "directory-card-copy";
    const title = document.createElement("h2");
    const titleLink = document.createElement("a");
    titleLink.className = "directory-title-link";
    titleLink.href = `restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
    titleLink.textContent = details.resturantName || "Restaurant";
    title.append(titleLink);
    const meta = document.createElement("p");
    meta.className = "post-meta";
    meta.textContent = [details.resturantCuisineType, details.resturantLocation].filter(Boolean).join(" · ") || "Local restaurant";
    const description = document.createElement("p");
    description.textContent = details.resturantDescription || `${(restaurant.dishes || []).length} menu items available.`;
    const link = document.createElement("a");
    link.className = "community-submit directory-link";
    link.href = `restaurant.html?id=${encodeURIComponent(restaurant.id)}`;
    link.textContent = "View menu and order";
    content.append(title, meta, description, link);
    card.append(icon, content);
    renderFeedback(card, restaurant);
    list.append(card);
  }
}

search.addEventListener("input", renderRestaurants);
renderRestaurants();

const dishList = document.querySelector("#dish-list");
const dishTemplate = document.querySelector("#dish-template");
const addDishButton = document.querySelector("#add-dish");
const dishForm = document.querySelector("#dish-form");
let nextDishId = 1;
// Update the dish controls (legend and remove button state) based on the current number of dishes
function updateDishControls() {
  const dishCards = dishList.querySelectorAll(".dish-card");

  dishCards.forEach((card, index) => {
    card.querySelector(".dish-legend").textContent = `Dish ${index + 1}`;
    card.querySelector(".remove-dish").disabled = dishCards.length === 1;
  });
}

function addDish(dish = {}) {
  const dishId = nextDishId++;
  const fragment = dishTemplate.content.cloneNode(true);
  const dishCard = fragment.querySelector(".dish-card");

  for (const field of dishCard.querySelectorAll("[data-field]")) {
    const fieldName = field.dataset.field;
    const fieldId = `dish-${dishId}-${fieldName}`;
    field.id = fieldId;
    field.name = `dishes[${dishId}][${fieldName}]`;
    dishCard.querySelector(`[data-label="${fieldName}"]`).htmlFor = fieldId;
  }

  dishCard.querySelector('[data-field="name"]').value = dish.name || "";
  dishCard.querySelector('[data-field="description"]').value = dish.description || "";
  dishCard.querySelector('[data-field="ingredients"]').value = dish.ingredients || "";
  dishCard.querySelector('[data-field="price"]').value = dish.price ?? "";
  dishCard.dataset.savedPhoto = dish.photo || "";
  const preview = dishCard.querySelector(".image-preview");
  if (dish.photo) {
    preview.src = dish.photo;
    preview.alt = `Current photo for ${dish.name || "dish"}`;
    preview.hidden = false;
  }

  dishList.append(fragment);
  updateDishControls();
}

addDishButton.addEventListener("click", addDish);

function saveDishPhoto(file, existingPhoto = "") {
  if (!file) return Promise.resolve(existingPhoto);
  if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type) || file.size > 1024 * 1024) {
    return Promise.reject(new Error("Dish photos must be JPG, PNG, GIF, or WebP files smaller than 1 MB."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(new Error("A dish photo could not be read.")));
    reader.readAsDataURL(file);
  });
}

dishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  let currentUser = {};
  let restaurants = [];
  try {
    currentUser = JSON.parse(sessionStorage.getItem("vendorLiftDemoAuth") || "{}");
    restaurants = JSON.parse(localStorage.getItem("vendorLiftRestaurants") || "[]");
    if (!Array.isArray(restaurants)) throw new Error("Saved restaurants are not a list.");
  } catch {
    window.alert("Your saved restaurant data could not be read. Please reload and try again.");
    return;
  }
  const existingRestaurant = currentUser.email
    ? restaurants.find((item) => item.ownerEmail === currentUser.email)
    : restaurants.find((item) => item.id === sessionStorage.getItem("vendorLiftRestaurantId"));
  let sessionDetails = {};
  try { sessionDetails = JSON.parse(sessionStorage.getItem("vendorLiftRestaurantDetails") || "{}"); } catch {}
  const details = Object.keys(sessionDetails).length ? sessionDetails : (existingRestaurant?.details || {});
  const name = String(details.resturantName || "").trim();
  if (!name) {
    window.location.href = "forms.html";
    return;
  }

  try {
    const ownerEmail = currentUser.email || "";
    const id = existingRestaurant?.id || `restaurant-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem("vendorLiftRestaurantId", id);
    const dishes = await Promise.all([...dishList.querySelectorAll(".dish-card")].map(async (card) => ({
      name: card.querySelector('[data-field="name"]').value.trim(),
      description: card.querySelector('[data-field="description"]').value.trim(),
      ingredients: card.querySelector('[data-field="ingredients"]').value.trim(),
      price: Number(card.querySelector('[data-field="price"]').value),
      photo: await saveDishPhoto(card.querySelector('[data-field="photo"]').files[0], card.dataset.savedPhoto),
    })));
    const restaurant = { id, ownerEmail, details, dishes, updatedAt: new Date().toISOString() };
    const index = restaurants.findIndex((item) => item.id === id);
    if (index === -1) restaurants.push(restaurant);
    else restaurants[index] = restaurant;
    localStorage.setItem("vendorLiftRestaurants", JSON.stringify(restaurants));
    window.location.href = "dashboard.html";
  } catch (error) {
    window.alert(error.message || "Your restaurant menu could not be saved.");
  }
});

dishList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-dish");
  if (!removeButton) {
    return;
  }

  const dishCard = removeButton.closest(".dish-card");
  const preview = dishCard.querySelector(".image-preview");
  if (preview.dataset.objectUrl) {
    URL.revokeObjectURL(preview.dataset.objectUrl);
  }

  dishCard.remove();
  updateDishControls();
});

dishList.addEventListener("change", (event) => {
  const imageInput = event.target.closest('input[type="file"]');
  if (!imageInput) {
    return;
  }

  const preview = imageInput.closest(".dish-card").querySelector(".image-preview");
  if (preview.dataset.objectUrl) {
    URL.revokeObjectURL(preview.dataset.objectUrl);
    delete preview.dataset.objectUrl;
  }

  const [image] = imageInput.files;
  if (!image) {
    preview.hidden = true;
    preview.removeAttribute("src");
    return;
  }

  if (!image.type.startsWith("image/") || image.size > 1024 * 1024) {
    imageInput.value = "";
    preview.hidden = true;
    preview.removeAttribute("src");
    window.alert("Choose an image file smaller than 1 MB.");
    return;
  }

  const objectUrl = URL.createObjectURL(image);
  preview.src = objectUrl;
  preview.alt = `Preview of ${image.name}`;
  preview.dataset.objectUrl = objectUrl;
  preview.hidden = false;

});

let savedDishes = [];
try {
  const currentUser = JSON.parse(sessionStorage.getItem("vendorLiftDemoAuth") || "{}");
  const restaurants = JSON.parse(localStorage.getItem("vendorLiftRestaurants") || "[]");
  const restaurant = currentUser.email
    ? restaurants.find((item) => item.ownerEmail === currentUser.email)
    : restaurants.find((item) => item.id === sessionStorage.getItem("vendorLiftRestaurantId"));
  if (Array.isArray(restaurant?.dishes)) savedDishes = restaurant.dishes;
} catch (error) {
  console.error("Could not load the saved restaurant menu.", error);
}

if (savedDishes.length) savedDishes.forEach((dish) => addDish(dish));
else addDish();

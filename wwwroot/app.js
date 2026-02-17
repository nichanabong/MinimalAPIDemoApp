const output = document.getElementById("output");
const productsDiv = document.getElementById("products");

let allProducts = [];
let images = [];
let filtered = [];

let pickingForProductId = null;

const modal = document.getElementById("imageModal");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const modalBackdrop = document.getElementById("modalBackdrop");

function openModal() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    pickingForProductId = null;
}

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

// Escape key closes modal
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});


// Initial load
loadProducts();

// Client-side search
function applySearch(query) {
    const term = query.trim().toLowerCase();

    filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(term));

    applySort(document.getElementById("sort").value);
}

// Search
document.getElementById("search").addEventListener("input", (e) => {
    applySearch(e.target.value);
});

// Sort
document.getElementById("sort").addEventListener("change", (e) => {
    applySort(e.target.value)
});

function applySort(criteria) {
    let sorted = [];

    switch (criteria) {
        case "name-asc":
            sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;

        case "name-desc":
            sorted = filtered.sort((a, b) => b.name.localeCompare(a.name));
            break;

        case "price-asc":
            sorted = filtered.sort((a, b) => a.price - b.price);
            break;

        case "price-desc":
            sorted = filtered.sort((a, b) => b.price - a.price);
            break;
        default:
            sorted = filtered.sort((a, b) => b.id - a.id);
    }
    
    renderProducts(sorted);
}

function handleRefreshClick() {
    applySearch("");
    document.getElementById("search").value = "";

    applySort("");
    document.getElementById("sort").value = "";
}

// Clear filters
document.getElementById("refresh").addEventListener("click", handleRefreshClick);

// Get product by ID
async function getProductById(id) {
    const res = await fetch(`/products/${id}`);
    return await res.json();
}

// Load all products
async function loadProducts() {
    if (output) output.textContent = "Loading...";

    const res = await fetch("/products");
    allProducts = await res.json();

    if (output) output.textContent = "";

    applySearch(document.getElementById("search").value);
}

// Create product
async function createProduct() {
    const name = prompt("Enter product name:");
    const price = prompt("Enter product price:");

    if (!name || !price) return;

    const res = await fetch("/products", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: name,
            price: parseFloat(price),
            createdAt: new Date().toISOString()
        })
    });

    if (!res.ok) {
        alert("Failed to create product.");
        return;
    }

    loadProducts();
}

document.getElementById("add").addEventListener("click", createProduct);

// Update product
async function updateProduct(id) {
    const product = await getProductById(id);

    const newNameInput = prompt("Enter new product name:", product.name);
    const newPriceInput = prompt("Enter new product price:", product.price);

    const name =
        newNameInput && newNameInput.trim() !== ""
            ? newNameInput.trim()
            : product.name;

    let price = product.price;
    if (newPriceInput !== null && newPriceInput.trim() !== "") {
        const parsed = Number(newPriceInput);
        if (Number.isNaN(parsed)) {
            alert("Price must be a number.");
            return;
        }
        price = parsed;
    }

    const updatedProduct = { name, price };

    const res = await fetch(`/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProduct),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("Update failed:", res.status, text);
        alert("Failed to update product.");
        return;
    }

    loadProducts();
}

// Delete product
async function deleteProduct(id) {
    const confirmed = confirm("Delete this product?");
    if (!confirmed) return;

    const res = await fetch(`/products/${id}`, { method: "DELETE" });

    if (!res.ok) {
        alert("Failed to delete product.");
        return;
    }

    loadProducts();
}

// Upload image
document.getElementById("img").addEventListener("change", async () => {
  const input = document.getElementById("img");

  const form = new FormData();
  form.append("file", input.files[0]); // key must match endpoint param name: file

  const res = await fetch("/uploadimage", {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    const err = await res.text();
    return alert(err);
  }

  const data = await res.json();
  document.getElementById("uploaded").innerHTML = `
    <p>Uploaded: ${data.fileName} (${data.size} bytes)</p>
    <img src="${data.url}" style="max-width:300px; border:1px solid #ddd;" />
  `;
});


// Select image for product
async function openImagePicker(productId) {
    pickingForProductId = productId;
    openModal();

    modalBody.innerHTML = `<p class="muted">Loading images…</p>`;

    const res = await fetch("/images-list");
    if (!res.ok) {
        modalBody.innerHTML = `<p class="muted">Failed to load images.</p>`;
        return;
    }

    const imgs = await res.json(); // [{url, fileName}, ...]

    if (!imgs.length) {
        modalBody.innerHTML = `<p class="muted">No images uploaded yet.</p>`;
        return;
    }

    const grid = document.createElement("div");
    grid.className = "image-grid";

    imgs.forEach(img => {
        const tile = document.createElement("div");
        tile.className = "image-tile";

        const image = document.createElement("img");
        image.src = img.url;
        image.alt = img.fileName;

        const cap = document.createElement("div");
        cap.className = "caption";
        cap.textContent = img.fileName;

        tile.appendChild(image);
        tile.appendChild(cap);

        tile.addEventListener("click", async () => {
            await setProductImage(pickingForProductId, img.url);
            closeModal();
            loadProducts();
        });

        grid.appendChild(tile);
    });

    modalBody.innerHTML = "";
    modalBody.appendChild(grid);
}

async function setProductImage(productId, imageUrl) {
    const res = await fetch(`/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl })
    });

    if (!res.ok) {
        const text = await res.text();
        alert(`Failed to set image: ${res.status} ${text}`);
    }
}

// Render products in the UI
function renderProducts(products) {
    productsDiv.innerHTML = "";

    products.forEach((p) => {
        const card = document.createElement("div");
        card.className = "product-card";

        const title = document.createElement("h3");
        title.textContent = p.name;

        const price = document.createElement("p");
        price.textContent = `Price: $${p.price}`;

        const date = document.createElement("span");
        date.textContent = `Created: ${new Date(p.createdAt).toLocaleDateString()}`;

        const image = document.createElement("img");
        image.src = "http://localhost:5245/images/xlyh535g.3n2.jpg"

        const chooseImageBtn = document.createElement("button");
        chooseImageBtn.textContent = "🖼 Choose Image";
        chooseImageBtn.addEventListener("click", () => openImagePicker(p.id));

        card.appendChild(chooseImageBtn);

        if (p.imageUrl) {
            const img = document.createElement("img");
            img.src = p.imageUrl;
            img.alt = p.name;
            img.style.width = "100%";
            img.style.maxHeight = "160px";
            img.style.objectFit = "cover";
            img.style.borderRadius = "12px";
            img.style.marginTop = "8px";
            card.appendChild(img);
        }

        const updateBtn = document.createElement("button");
        updateBtn.textContent = "Update";
        updateBtn.addEventListener("click", () => updateProduct(p.id));

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "danger";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deleteProduct(p.id));

        // Actions
        const actions = document.createElement("div");
        actions.className = "product-card-actions";

        actions.appendChild(updateBtn);
        actions.appendChild(deleteBtn);

        // Build card
        card.appendChild(title);
        card.appendChild(price);
        card.appendChild(date);
        card.appendChild(actions);

        // Add card to container
        productsDiv.appendChild(card);
    });
}

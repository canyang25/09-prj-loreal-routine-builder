/* Global variables */
let selectedProducts = [];
let expandedDescriptions = {};
let chatHistory = [{
  role: "system",
  content: "You are Lourie, a dedicated beauty advisor and skincare expert who specializes in creating personalized beauty and skincare routines. You will focus exclusively on providing guidance about skincare/beauty routines and the specific products selected. You will structure your recommendations as follows: 1. A clear morning routine with numbered steps and sub-steps, 2. A detailed evening routine with numbered steps and sub-steps, 3. Specific instructions for how to properly use each product, 4. Important recommendations and any safety warnings to keep in mind. You will only assist with beauty and skincare related questions. You will help create perfect personalized routines with clear, concise, numbered steps that are easy to follow. When providing information about L'Oréal products, use web search to find the most current and accurate information, including latest formulations, reviews, and recommendations. Always cite your sources and include relevant links when sharing information from the web."
}];
// Initialize clear button reference
let clearBtn = null;

// DOM element references - will be initialized when DOM is ready
let categoryFilter;
let productsContainer;
let chatForm;
let chatWindow;
let selectedProductsList;
let generateRoutineBtn;

/* Set up all event listeners */
function setupEventListeners() {
  // Category filter change
  categoryFilter.addEventListener("change", async (e) => {
    const products = await loadProducts();
    const selectedCategory = e.target.value;
    const filteredProducts = products.filter(
      (product) => product.category === selectedCategory
    );
    displayProducts(filteredProducts);
    updateSelectedProductsList();
  });
  
  // Generate routine button
  generateRoutineBtn.addEventListener("click", async () => {
    if (selectedProducts.length === 0) {
      chatWindow.innerHTML = `<div class="chat-message">
        <p>Please select at least one product to generate a routine.</p>
      </div>`;
      return;
    }

    // Show loading state
    chatWindow.innerHTML = `<div class="chat-message">
      <p><i class="fa-solid fa-spinner fa-spin"></i> Generating your personalized routine...</p>
    </div>`;

    try {
      // Prepare full product data for the model
      const productData = selectedProducts.map(product => ({
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description || "No description available"
      }));

      // Get just the product names for display in the prompt
      const productNames = selectedProducts.map(product => product.name);

      // Create a prompt for the OpenAI API
      const prompt = `
        Create a personalized skincare/beauty routine using these products:
        ${JSON.stringify(productNames)}
        
        Please search for the latest information about these L'Oréal products to provide the most current recommendations, including any recent formulation updates, reviews, or expert advice. Include relevant links and citations from your web search.
      `;

      // Add the user's initial request to chat history
      chatHistory = chatHistory.slice(0, 1); // keep only system message
      chatHistory.push({ role: "user", content: prompt });

      // Call the OpenAI API with the full chat history
      const response = await callOpenAIWithHistory(chatHistory);

      // Add assistant's response to chat history
      chatHistory.push({ role: "assistant", content: response });

      // Display the full conversation
      renderChatHistory();
    } catch (error) {
      console.error("Error generating routine:", error);
      chatWindow.innerHTML = `<div class="chat-message error">
        <p>Error: ${error.message || 'An unknown error occurred'}</p>
        <p>Please try again in a moment.</p>
      </div>`;
    }
  });
  
  // Chat form submission
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userInput = document.getElementById("userInput").value.trim();
    if (!userInput) return;

    // Add user message to chat history
    chatHistory.push({ role: "user", content: userInput });
    renderChatHistory();

    // Show loading state
    chatWindow.innerHTML += `<div class="chat-message"><i class="fa-solid fa-spinner fa-spin"></i> Thinking...</div>`;

    try {
      // Call the OpenAI API with the full chat history
      const response = await callOpenAIWithHistory(chatHistory);
      // Add assistant's response to chat history
      chatHistory.push({ role: "assistant", content: response });
      renderChatHistory();
    } catch (error) {
      console.error("Error generating follow-up:", error);
      chatWindow.innerHTML += `<div class="chat-message error"><p>Error: ${error.message || 'An unknown error occurred'}</p></div>`;
    }
    chatForm.reset();
  });
}

/* Initialize the app when DOM is fully loaded */
document.addEventListener('DOMContentLoaded', () => {
  // Get references to DOM elements
  categoryFilter = document.getElementById("categoryFilter");
  productsContainer = document.getElementById("productsContainer");
  chatForm = document.getElementById("chatForm");
  chatWindow = document.getElementById("chatWindow");
  selectedProductsList = document.getElementById("selectedProductsList");
  generateRoutineBtn = document.getElementById("generateRoutine");
  
  // Show initial placeholder
  productsContainer.innerHTML = `
    <div class="placeholder-message">
      Select a category to view products
    </div>
  `;
  
  // Set up event listeners
  setupEventListeners();
  
  // Load saved products
  loadSelectedProductsFromStorage();
  updateSelectedProductsList();
});

// Remove the direct initialization that was added as a fallback
// since we're now properly structuring everything in DOMContentLoaded

/* Show initial placeholder until user selects a category */
// This is now handled inside DOMContentLoaded

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Utility: Save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem('selectedProducts', JSON.stringify(selectedProducts));
}

// Utility: Load selected products from localStorage
function loadSelectedProductsFromStorage() {
  const data = localStorage.getItem('selectedProducts');
  if (data) {
    try {
      selectedProducts = JSON.parse(data);
    } catch (e) {
      selectedProducts = [];
    }
  } else {
    selectedProducts = [];
  }
}

// Update selected products list and persist to localStorage
function updateSelectedProductsList() {
  saveSelectedProducts();
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = '<div class="placeholder-message">No products selected</div>';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product, idx) => `
        <div class="selected-product-item">
          <img src="${product.image}" alt="${product.name}" />
          <span>${product.name}</span>
          <button class="remove-selected-product" data-idx="${idx}" title="Remove">
            &times;
          </button>
        </div>
      `
    )
    .join("");

  // Add click listeners for remove buttons
  document.querySelectorAll(".remove-selected-product").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering card click
      const idx = parseInt(btn.getAttribute("data-idx"), 10);
      selectedProducts.splice(idx, 1);
      saveSelectedProducts();
      updateSelectedProductsList();
      // Optionally re-render products grid to update selection state
      const currentCards = document.querySelectorAll(".product-card");
      if (currentCards.length > 0) {
        const products = Array.from(currentCards).map(card => ({
          name: card.getAttribute('data-name'),
          brand: card.getAttribute('data-brand'),
          image: card.querySelector('img').src,
        }));
        displayProducts(products);
      }
    });
  });
  addClearAllButton();
  if (clearBtn) clearBtn.style.display = 'inline-block';
}

function addClearAllButton() {
  if (!clearBtn) {
    clearBtn = document.createElement('button');
    clearBtn.id = 'clearSelectedProducts';
    clearBtn.className = 'clear-selected-btn';
    clearBtn.innerHTML = 'Clear All';
    clearBtn.addEventListener('click', () => {
      selectedProducts = [];
      saveSelectedProducts();
      updateSelectedProductsList();
      // Optionally re-render products grid to update selection state
      const currentCards = document.querySelectorAll('.product-card');
      if (currentCards.length > 0) {
        const products = Array.from(currentCards).map(card => ({
          name: card.getAttribute('data-name'),
          brand: card.getAttribute('data-brand'),
          image: card.querySelector('img').src,
        }));
        displayProducts(products);
      }
    });
    const selectedProductsDiv = document.querySelector('.selected-products');
    selectedProductsDiv.appendChild(clearBtn);
  }
}

function isProductSelected(product) {
  return selectedProducts.some((p) => p.name === product.name && p.brand === product.brand);
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product, idx) => `
    <div class="product-card${isProductSelected(product) ? ' selected' : ''}" data-name="${product.name}" data-brand="${product.brand}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="toggle-description-btn" data-idx="${idx}" aria-expanded="${!!expandedDescriptions[idx]}">
          ${expandedDescriptions[idx] ? 'Hide' : 'Show'} Description
        </button>
        <div class="product-description" style="display: ${expandedDescriptions[idx] ? 'block' : 'none'};">
          <p>${product.description || 'No description available.'}</p>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  // Add click listeners for selection
  document.querySelectorAll(".product-card").forEach((card, idx) => {
    card.addEventListener("click", (e) => {
      // Prevent card click if toggle-description-btn was clicked
      if (e.target.classList.contains("toggle-description-btn")) return;
      
      // If description is open, check if text is selected before closing
      if (expandedDescriptions[idx]) {
        // Check if there's any text selected
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
          // Text is selected, don't close
          return;
        }
        
        // No text selected, close the description
        expandedDescriptions[idx] = false;
        displayProducts(products);
        return;
      }
      
      const product = products[idx];
      if (isProductSelected(product)) {
        selectedProducts = selectedProducts.filter(
          (p) => !(p.name === product.name && p.brand === product.brand)
        );
      } else {
        // Make sure we capture all necessary product properties
        selectedProducts.push({
          id: product.id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          image: product.image,
          description: product.description
        });
      }
      saveSelectedProducts();
      displayProducts(products); // re-render to update selection state
      updateSelectedProductsList();
    });
  });

  // Add click listeners for description toggle buttons
  document.querySelectorAll(".toggle-description-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute("data-idx"), 10);
      expandedDescriptions[idx] = !expandedDescriptions[idx];
      displayProducts(products);
    });
  });
}

/**
 * Call OpenAI API with full chat history through Cloudflare worker
 * @param {Array} history - The full chat history
 * @returns {string} - The AI-generated response
 */
async function callOpenAIWithHistory(history) {
  try {
    // Use the Cloudflare worker URL instead of calling OpenAI directly
    const cloudflareWorkerUrl = 'https://loreal.czhao255.workers.dev';
    
    const response = await fetch(cloudflareWorkerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: history
      }),
      mode: 'cors' // Explicitly set CORS mode
    });
    
    const data = await response.json();
    
    // Check for API error
    if (data.error) {
      console.error("API returned an error:", data.error);
      
      // Map API errors to user-friendly messages
      if (data.error.code === "unsupported_country_region_territory") {
        throw new Error("This service is not available in your region.");
      } else {
        throw new Error("Unable to generate routine at this time. Please try again later.");
      }
    }
    
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Invalid API response format:", data);
      throw new Error("Received an unexpected response. Please try again.");
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error("API error:", error);
    // Only show the error message, not the technical details
    throw new Error(error.message || "Unable to connect to the service. Please check your connection and try again.");
  }
}

/**
 * Format the AI response with proper HTML
 * @param {string} response - The raw AI response
 * @returns {string} - Formatted HTML
 */
function formatAIResponse(response) {
  // Convert line breaks to <br> tags
  let formatted = response.replace(/\n/g, '<br>');
  
  // Convert markdown-style headers (e.g., "## Morning Routine")
  formatted = formatted.replace(/#{1,3} (.*?)(<br>|$)/g, '<h4>$1</h4>');
  
  // Convert markdown-style lists
  formatted = formatted.replace(/(\d+\. )(.*?)(<br>|$)/g, '<li>$2</li>');
  
  // Wrap lists in <ol> tags if they contain <li> elements
  if (formatted.includes('<li>')) {
    formatted = formatted.replace(/((<li>.*?<\/li>)+)/g, '<ol>$1</ol>');
  }
  
  // Convert URLs to clickable links
  formatted = formatted.replace(
    /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g, 
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="web-link">$1</a>'
  );
  
  // Style citations and sources
  formatted = formatted.replace(
    /(Source[s]?:|Citation[s]?:|Reference[s]?:)(.*?)(<br>|$)/gi,
    '<div class="citation"><strong>$1</strong>$2</div>'
  );
  
  return formatted;
}

// On page load, restore selected products
// loadSelectedProductsFromStorage(); // Moved to DOMContentLoaded
// updateSelectedProductsList(); // Moved to DOMContentLoaded

// Render the full chat history in the chat window
function renderChatHistory() {
  chatWindow.innerHTML = chatHistory
    .filter(msg => msg.role !== "system")
    .map(msg => {
      if (msg.role === "user") {
        return `<div class="chat-message user"><strong>You:</strong> ${msg.content}</div>`;
      } else {
        return `<div class="chat-message">${formatAIResponse(msg.content)}</div>`;
      }
    })
    .join("");
}

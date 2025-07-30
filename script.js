/* Global variables */
let selectedProducts = [];
let expandedDescriptions = {};
let chatHistory = [{
  role: "system",
  content: `Background Information:
You're Lourie, a cheerful and enthusiastic beauty advisor and skincare expert who specializes in creating personalized beauty and skincare routines. Your goal is to help users develop effective, easy-to-follow routines primarily using the L'Oréal products they provide.

Rules to Follow:
1. Write in a concise, direct manner with short, clear sentences.
2. Do not use bold, italics, or any special formatting.
3. You'll only assist with beauty and skincare related questions.
4. If a user provides unclear or insufficient information for a required step, politely ask for clarification or additional details, ensuring you explain why that information is needed. You'll allow up to two re-attempts for clarification before offering a generic routine based on assumptions or suggesting suitable L'Oréal alternatives if products were missing.
5. Consolidate turns efficiently: When information is clear or the next step is a direct, non-question action, combine responses to reduce unnecessary back-and-forth and make the conversation flow more naturally. Don't wait for explicit user confirmation if the next action is a direct continuation based on prior input.

Formal Dialogue Process:
Step 1: Routine Formulation & Presentation using Provided Products Upon receiving the user's initial message with L'Oréal products, immediately provide the warm greeting and then formulate and present a personalized beauty and skincare routine based solely on the provided products.
* If the provided products do not go hand-in-hand or are incompatible for a single cohesive routine (e.g., multiple strong actives meant for different purposes without clear synergy), generate separate, distinct routines for subsets of products or provide a "mix-and-match" guide explaining the incompatibilities and how to choose. You must still provide a usable routine (or routines) based on the given products.
* Structure recommendations as follows:
    1. A clear morning routine with numbered steps and sub-steps.
    2. A detailed evening routine with numbered steps and sub-steps.
    3. Specific instructions for how to properly use each product.
    4. Important recommendations and any safety warnings to keep in mind.
* 1.1 If the user requests clarification on a specific product or step within the provided routine or asks a general beauty/skincare question, provide the clarification or answer directly. Then, guide the user back to reviewing the routine, for example: "Now that we've covered that, let's look back at your routine. Do you have any other questions about the steps or products I recommended?" If the user has no more questions by giving a confirmation, proceed to step 1.2.
* 1.2 If the user has no questions about the routine or indicates they are satisfied with the routine, proceed to Step 2.
* 1.3 If the user indicates they are busy or want to end the conversation, politely thank them and end the conversation.
Step 2: Refine Routine: Understand Skin Type & Sensitivities After presenting the initial routine, ask the user about their skin type (e.g., oily, dry, combination, normal) and any known sensitivities or allergies. Explain that this helps personalize the routine further.
* 2.1 If the user provides clear skin type and sensitivity information, proceed to Step 3.
* 2.2 If the user is unsure about their skin type or doesn't provide enough detail (e.g., "I don't know," "It's just normal"), politely explain why knowing their skin type is important for effective routine creation and ask clarifying questions (e.g., "Does your skin feel tight after washing?", "Do you get shiny in your T-zone?"). This initiates a clarification loop.
    * 2.2.1 (Loop Condition): If the user provides clarification after the prompt, return to Step 2.1.
    * 2.2.2 (Loop Termination): If the user remains unable or unwilling to provide skin type after two re-attempts, state that you'll assume "normal" skin for any further recommendations. Then, proceed to Step 3.
Step 3: Refine Routine: Lifestyle & Preferences Check Inquire about any lifestyle factors or additional preferences (e.g., time available for routine, specific concerns like hyperpigmentation or fine lines). Explain how this helps make the routine even better.
* 3.1 If the user provides relevant lifestyle and preference information, proceed to Step 4.
* 3.2 If the user gives an unhelpful response (e.g., "Nothing special," "I don't care") or asks an unrelated question (that is not an FAQ), gently explain how these details help tailor the routine and re-ask for preferences or concerns. This initiates a clarification loop.
    * 3.2.1 (Loop Condition): If the user provides clarification after the prompt, return to Step 3.1.
    * 3.2.2 (Loop Termination): If the user remains unhelpful after two re-attempts, acknowledge their response and state that you'll provide general tips. Then, proceed to Step 4.
Step 4: Provide Additional Personalization/Tips & Final Check Based on the information gathered in Steps 2 and 3, provide additional personalized tips, product recommendations (if necessary, complementing the initial products), or adjustments to the initial routine. Confirm if the user has any more questions.
* 4.1 If the user has further questions about the refined routine or new tips, or asks another FAQ question, provide the answer, then return to Step 4.
* 4.2 If the user indicates they are satisfied and have no more questions, proceed to Step 5.
* 4.3 If the user indicates they are busy or want to end the conversation, politely thank them and end the conversation.
Step 5: Follow-Up & Conclusion Offer to answer any final questions or provide general beauty tips. Politely end the conversation.`
}];


// DOM element references - will be initialized when DOM is ready
let categoryFilter;
let productsContainer;
let chatForm;
let chatWindow;
let selectedProductsList;
let generateRoutineBtn;
let clearChatBtn;

// RTL languages
const rtlLanguages = ['ar', 'he', 'fa', 'ur'];



// Single function to set direction based on language
function setDirectionFromLanguage(langCode) {
  const direction = rtlLanguages.includes(langCode) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', direction);
  return direction;
}

/* Set up all event listeners */
function setupEventListeners() {
  // Set up Google Translate observer
  setupGoogleTranslateObserver();
  
  // Clear chat button
  clearChatBtn.addEventListener("click", () => {
    // Reset chat history to only include the system message
    chatHistory = chatHistory.slice(0, 1);
    // Clear the chat window
    chatWindow.innerHTML = '';
  });

  // Category filter change
  categoryFilter.addEventListener("change", async (e) => {
    const selectedCategory = e.target.value;
    
    // If no category selected, show placeholder
    if (!selectedCategory) {
      productsContainer.innerHTML = `
        <div class="placeholder-message">
          Select a category to view products
        </div>
      `;
      // Clear display, ready for next category selection
      return;
    }
    
    const products = await loadProducts();
    const filteredProducts = products.filter(
      (product) => product.category === selectedCategory
    );
    displayProducts(filteredProducts, true); // Enable animation for new category
    updateSelectedProductsList();
  });
  
  // Generate routine button
  generateRoutineBtn.addEventListener("click", async () => {
    if (selectedProducts.length === 0) {
      chatWindow.innerHTML = `<div class="chat-message">
        <p>Hi! I'm Lourie, your personal beauty advisor. I'll help create your perfect routine, but first I need you to select some products from above!</p>
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
        ${productNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}
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
  clearChatBtn = document.getElementById("clearChat");
  
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

}



function isProductSelected(product) {
  return selectedProducts.some((p) => p.name === product.name && p.brand === product.brand);
}

/* Create HTML for displaying product cards */
function displayProducts(products, shouldAnimate = false) {
  productsContainer.innerHTML = products
    .map(
      (product, idx) => `
    <div class="product-card${isProductSelected(product) ? ' selected' : ''}" data-name="${product.name}" data-brand="${product.brand}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3 title="${product.name}">${product.name}</h3>
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

  // Set cascade animation delays and add click listeners
  document.querySelectorAll(".product-card").forEach((card, idx) => {
    // Only animate when explicitly requested
    if (shouldAnimate) {
      card.classList.add('animate-in');
      card.style.setProperty('--card-index', idx + 1);
    }
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
 * Call Mistral API with full chat history through Cloudflare worker
 * @param {Array} history - The full chat history
 * @returns {string} - The AI-generated response
 */
async function callOpenAIWithHistory(history) {
  try {
    // Use the Cloudflare worker URL instead of calling Mistral directly
    const cloudflareWorkerUrl = 'https://loreal-mistral.czhao255.workers.dev';
    
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
      throw new Error("Unable to generate routine at this time. Please try again later.");
    }
    
    // Mistral API format is similar to OpenAI's
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

// Set up language detection and accessibility
function setupGoogleTranslateObserver() {
  // Set initial state (page content is English)
  document.documentElement.setAttribute('lang', 'en');
  document.documentElement.setAttribute('dir', 'ltr');
  
  // Listen for language changes via MutationObserver (more accessible)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
        const currentLang = document.documentElement.getAttribute('lang');
        if (currentLang) {
          const langCode = currentLang.split('-')[0];
          setDirectionFromLanguage(langCode);
        }
      }
    });
  });
  
  // Observe changes to the html element's lang attribute
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang']
  });
  

}

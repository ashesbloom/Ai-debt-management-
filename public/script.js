// public/script.js
const debtForm = document.getElementById('debt-form');
const debtListDiv = document.getElementById('debt-list');
const clearDebtsBtn = document.getElementById('clear-debts-btn');

// Chat elements
const chatHistoryDiv = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
// REMOVED: const extraPaymentInput = document.getElementById('extra-payment');

// Indicators and Error messages
const loadingIndicator = document.getElementById('loading-indicator');
const errorFormDiv = document.getElementById('error-message-form');
const errorChatDiv = document.getElementById('error-message-chat');

const API_BASE_URL = 'http://localhost:3000/api';

// --- Helper Functions ---

function displayError(message, location = 'chat') {
    const errorDiv = location === 'form' ? errorFormDiv : errorChatDiv;
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    if (location === 'chat') {
        hideLoading(); // Ensure loading is hidden if chat error occurs
    }
    // Auto-hide error after some time
     setTimeout(() => clearError(location), 5000);
}

function clearError(location = 'all') {
     if (location === 'form' || location === 'all') {
        errorFormDiv.textContent = '';
        errorFormDiv.style.display = 'none';
     }
      if (location === 'chat' || location === 'all') {
        errorChatDiv.textContent = '';
        errorChatDiv.style.display = 'none';
     }
}

function showLoading() {
    clearError('chat');
    loadingIndicator.style.display = 'flex'; // Use flex for spinner alignment
    chatInput.disabled = true;
    sendChatBtn.disabled = true;
    // REMOVED: extraPaymentInput.disabled = true;
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
    chatInput.disabled = false;
    sendChatBtn.disabled = false;
    // REMOVED: extraPaymentInput.disabled = false;
}

// --- Chat UI Functions ---

// --- Chat UI Functions ---

function addMessageToHistory(text, sender = 'user') {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

    // Basic Markdown-like formatting
    const formattedText = text
       .replace(/&/g, '&amp;')
       .replace(/</g, '&lt;')
       .replace(/>/g, '&gt;')
       .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
       .replace(/\*(.*?)\*/g, '<em>$1</em>')
       .replace(/\n/g, '<br>');

    messageDiv.innerHTML = `<p>${formattedText}</p>`;
    chatHistoryDiv.appendChild(messageDiv);

    // Trigger CSS animation - slightly different timing
    // Force reflow before adding class to ensure transition happens
    void messageDiv.offsetWidth; // Read offsetWidth to trigger reflow

    // Apply styles that transition will animate FROM (set by CSS initially)
    messageDiv.style.opacity = 0;
    messageDiv.style.transform = 'translateY(15px) scale(0.95)';

    // Add class that transitions TO the final state
    requestAnimationFrame(() => { // Ensure styles are applied before class change
         messageDiv.style.opacity = 1;
         messageDiv.style.transform = 'translateY(0) scale(1)';
    });


    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

// --- API Interaction ---

async function fetchDebts() {
    // ... (fetchDebts implementation remains the same)
     try {
        const response = await fetch(`${API_BASE_URL}/debts`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const debts = await response.json();
        renderDebtList(debts);
    } catch (error) {
        console.error('Error fetching debts:', error);
        debtListDiv.innerHTML = '<p class="error-text">Could not load debts.</p>'; // Use class for styling error text
        clearDebtsBtn.style.display = 'none';
        displayError('Could not load debt list.', 'form');
    }
}


async function addDebt(event) {
    // ... (addDebt implementation remains the same)
    event.preventDefault();
    clearError('form');

    const nameInput = document.getElementById('debt-name');
    const balanceInput = document.getElementById('debt-balance');
    const aprInput = document.getElementById('debt-apr');
    const minPaymentInput = document.getElementById('debt-min-payment');

    const debtData = {
        name: nameInput.value.trim(),
        balance: parseFloat(balanceInput.value),
        apr: parseFloat(aprInput.value),
        min_payment: parseFloat(minPaymentInput.value),
    };

    if (!debtData.name || isNaN(debtData.balance) || isNaN(debtData.apr) || isNaN(debtData.min_payment) || debtData.balance < 0 || debtData.apr < 0 || debtData.min_payment < 0) {
        displayError('Please fill in all debt fields correctly with non-negative numbers.', 'form');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/debts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(debtData),
        });

        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        debtForm.reset();
        fetchDebts();
        addMessageToHistory(`Okay, I've added the "${debtData.name}" debt to your list. Ask me anything about it!`, 'ai');

    } catch (error) {
        console.error('Error adding debt:', error);
        displayError(`Error adding debt: ${error.message}`, 'form');
    }
}


// --- Send Chat Message Function ---
async function sendChatMessage() {
    const userMessage = chatInput.value.trim();
    // REMOVED: const extraPaymentValue = extraPaymentInput.value.trim();

    if (!userMessage) {
        // Maybe just visually indicate error briefly without persistent message
        chatInput.style.border = '1px solid red';
        setTimeout(() => { chatInput.style.border = ''; }, 1000);
        return;
    }

    clearError('chat');
    addMessageToHistory(userMessage, 'user');
    chatInput.value = '';
    showLoading();

    try {
        const response = await fetch(`${API_BASE_URL}/coach/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userMessage: userMessage
                // REMOVED: extraPayment field
             }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        hideLoading();
        addMessageToHistory(result.aiResponse, 'ai');

    } catch (error) {
        console.error('Error sending chat message:', error);
        hideLoading();
        // Add AI error message to chat for better UX
        addMessageToHistory("I seem to be having trouble connecting right now. Please try again in a moment.", 'ai');
        // Keep detailed error for console / error div
        displayError(`Connection Error: ${error.message}`, 'chat');
    }
}


async function clearAllDebts() {
    // ... (clearAllDebts implementation remains the same)
     if (!confirm("Are you sure you want to clear all added debts? The coach will lose this context.")) {
        return;
    }
    try {
         const response = await fetch(`${API_BASE_URL}/debts`, {
             method: 'DELETE',
         });
         if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status}`);
         }
         fetchDebts();
         clearError();
         chatHistoryDiv.innerHTML = ''; // Clear previous messages
         addMessageToHistory("All debts cleared. Add new debts to get started again.", 'ai');

     } catch (error) {
         console.error('Error clearing debts:', error);
         displayError(`Error clearing debts: ${error.message}`, 'form');
     }
}


// --- Rendering ---

function renderDebtList(debts) {
    // ... (renderDebtList implementation remains mostly the same, maybe tweak li style)
     clearError('form');
    if (debts.length === 0) {
        debtListDiv.innerHTML = '<p>No debts added yet.</p>';
        clearDebtsBtn.style.display = 'none';
    } else {
        let listHtml = '<ul>';
        // Sort debts perhaps? E.g., by balance or APR for clarity
        // debts.sort((a, b) => b.apr - a.apr); // Example sort by APR descending
        debts.forEach(debt => {
            listHtml += `
                <li class="debt-item">
                    <span class="debt-name">${debt.name}</span>
                    <span class="debt-details">Rs.${debt.balance.toFixed(2)} @ ${debt.apr.toFixed(2)}% (Min: Rs.${debt.min_payment.toFixed(2)})</span>
                </li>
            `;
        });
        listHtml += '</ul>';
        debtListDiv.innerHTML = listHtml;
        clearDebtsBtn.style.display = 'inline-block';
    }
}


// --- Event Listeners ---

debtForm.addEventListener('submit', addDebt);
clearDebtsBtn.addEventListener('click', clearAllDebts);

sendChatBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) { // Send on Enter, allow Shift+Enter for newline (though input is single line)
        event.preventDefault();
        sendChatMessage();
    }
});

// --- Initial Load ---
fetchDebts();
hideLoading(); // Ensure loading hidden on start
// Optional: Add initial AI greeting after slight delay for effect
setTimeout(() => {
   if (chatHistoryDiv.children.length === 0) { // Only if no messages yet
      addMessageToHistory("Hello! Add your debts above. Then, ask me questions like \"Explain the Snowball method\", \"Which strategy should I use?\", or \"What if I pay an extra Rs. 500 per month?\".", 'ai');
   }
}, 500);
// public/script.js
const debtForm = document.getElementById('debt-form');
const debtListDiv = document.getElementById('debt-list');
const clearDebtsBtn = document.getElementById('clear-debts-btn');
const downloadDebtsBtn = document.getElementById('download-debts-btn'); // New button

// Chat elements
const chatHistoryDiv = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

// Indicators and Error messages
const loadingIndicator = document.getElementById('loading-indicator');
const errorFormDiv = document.getElementById('error-message-form');
const errorChatDiv = document.getElementById('error-message-chat');

// Use relative path for API calls, assuming frontend and backend are served from the same origin
// If they are on different ports during development (e.g., Vite/React frontend), keep the full URL.
const API_BASE_URL = '/api'; // Use relative path

// --- Helper Functions ---

function displayError(message, location = 'chat') {
    const errorDiv = location === 'form' ? errorFormDiv : errorChatDiv;
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    // Add ARIA role for accessibility
    errorDiv.setAttribute('role', 'alert');
    if (location === 'chat') {
        hideLoading(); // Ensure loading is hidden if chat error occurs
    }
    // Auto-hide error after some time
     setTimeout(() => clearError(location), 6000); // Increased timeout slightly
}

function clearError(location = 'all') {
     if (location === 'form' || location === 'all') {
        errorFormDiv.textContent = '';
        errorFormDiv.style.display = 'none';
        errorFormDiv.removeAttribute('role'); // Remove ARIA role
     }
      if (location === 'chat' || location === 'all') {
        errorChatDiv.textContent = '';
        errorChatDiv.style.display = 'none';
        errorChatDiv.removeAttribute('role'); // Remove ARIA role
     }
}

function showLoading() {
    clearError('chat');
    loadingIndicator.style.display = 'flex'; // Use flex for spinner alignment
    chatInput.disabled = true;
    sendChatBtn.disabled = true;
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
    chatInput.disabled = false;
    sendChatBtn.disabled = false;
}

// --- Chat UI Functions ---

function addMessageToHistory(text, sender = 'user') {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

    // Basic Markdown-like formatting (improved slightly)
    // Convert potential HTML entities first
    let formattedText = text
       .replace(/&/g, '&amp;')
       .replace(/</g, '&lt;')
       .replace(/>/g, '&gt;');

    // Apply formatting
    formattedText = formattedText
       .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
       .replace(/\*(.*?)\*/g, '<em>$1</em>')       // Italic
       .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // Code blocks
       .replace(/`(.*?)`/g, '<code>$1</code>')         // Inline code
       .replace(/\n/g, '<br>');                       // Newlines

    messageDiv.innerHTML = `<p>${formattedText}</p>`;
    chatHistoryDiv.appendChild(messageDiv);

    // Trigger CSS animation (ensure smooth transition)
    requestAnimationFrame(() => {
        messageDiv.style.opacity = 1;
        messageDiv.style.transform = 'translateY(0) scale(1)';
    });

    // Scroll to bottom
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
}

// --- API Interaction ---

async function fetchDebts() {
     try {
        const response = await fetch(`${API_BASE_URL}/debts`);
        if (!response.ok) {
            // Try to parse error from backend if available
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                 const errData = await response.json();
                 errorMsg = errData.error || errorMsg;
            } catch (e) { /* Ignore parsing error */ }
            throw new Error(errorMsg);
        }
        const debts = await response.json();
        renderDebtList(debts);
    } catch (error) {
        console.error('Error fetching debts:', error);
        debtListDiv.innerHTML = '<p class="error-text">Could not load debts.</p>';
        // Hide buttons if fetch fails
        clearDebtsBtn.style.display = 'none';
        downloadDebtsBtn.style.display = 'none';
        displayError(`Failed to load debts: ${error.message}`, 'form');
    }
}

async function addDebt(event) {
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

    // More robust validation
    if (!debtData.name || debtData.name.length < 1) {
        displayError('Please enter a valid creditor name.', 'form');
        nameInput.focus();
        return;
    }
     if (isNaN(debtData.balance) || debtData.balance < 0) {
        displayError('Please enter a valid, non-negative balance.', 'form');
        balanceInput.focus();
        return;
    }
     if (isNaN(debtData.apr) || debtData.apr < 0) {
        displayError('Please enter a valid, non-negative APR.', 'form');
        aprInput.focus();
        return;
    }
    if (isNaN(debtData.min_payment) || debtData.min_payment < 0) {
        displayError('Please enter a valid, non-negative minimum payment.', 'form');
        minPaymentInput.focus();
        return;
    }
    // Optional: Check if min payment exceeds balance (might be valid for some loans, but often an error)
    // if (debtData.min_payment > debtData.balance) { ... }

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
        await fetchDebts(); // Ensure list is updated before showing message
        addMessageToHistory(`Okay, I've added the "${debtData.name}" debt (Rs.${debtData.balance.toFixed(2)}) to your list. What would you like to discuss?`, 'ai');
        nameInput.focus(); // Set focus back to name for easier next entry

    } catch (error) {
        console.error('Error adding debt:', error);
        displayError(`Error adding debt: ${error.message}`, 'form');
    }
}

// --- Send Chat Message Function ---
async function sendChatMessage() {
    const userMessage = chatInput.value.trim();

    if (!userMessage) {
        // Add a subtle visual shake to the input as feedback
        chatInput.classList.add('shake-input');
        setTimeout(() => { chatInput.classList.remove('shake-input'); }, 500);
        return;
    }

    clearError('chat');
    addMessageToHistory(userMessage, 'user');
    chatInput.value = ''; // Clear input after sending
    showLoading();

    try {
        const response = await fetch(`${API_BASE_URL}/coach/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage: userMessage }), // Only send the message
        });

        const result = await response.json();

        if (!response.ok) {
            // Use the error message from the AI response if available
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        hideLoading();
        addMessageToHistory(result.aiResponse, 'ai');

    } catch (error) {
        console.error('Error sending chat message:', error);
        hideLoading();
        // Display a user-friendly error in the chat
        addMessageToHistory(`Sorry, I encountered an issue trying to respond. (${error.message}). Please try again.`, 'ai');
        // Keep detailed error for console / dedicated error div if needed
        // displayError(`Chat Error: ${error.message}`, 'chat');
    } finally {
        // Ensure input is re-enabled even if an error occurred before hiding loading
        hideLoading();
    }
}

async function clearAllDebts() {
     if (!confirm("Are you sure you want to clear all added debts? This action cannot be undone.")) {
        return;
    }
    try {
         const response = await fetch(`${API_BASE_URL}/debts`, {
             method: 'DELETE',
         });
         if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
         }
         await fetchDebts(); // Update the list (will show empty)
         clearError();
         // Clear chat history and add a confirmation message
         chatHistoryDiv.innerHTML = '';
         addMessageToHistory("All debts have been cleared. Add new debts above to get started again.", 'ai');

     } catch (error) {
         console.error('Error clearing debts:', error);
         displayError(`Error clearing debts: ${error.message}`, 'form');
     }
}

// --- NEW: Download Debts Function ---
function downloadDebts() {
    // Simple approach: Redirect the browser to the download endpoint.
    // The browser will handle the file download based on the Content-Disposition header set by the server.
    clearError('form'); // Clear any previous form errors
    console.log('Attempting to download debt report...');
    window.location.href = `${API_BASE_URL}/debts/download`;

    // Note: We don't get direct success/failure feedback here easily with this method.
    // A more complex approach using fetch could handle errors better but is trickier for file downloads.
}

// --- Rendering ---

function renderDebtList(debts) {
     clearError('form'); // Clear form errors when list renders successfully
    if (!debts || debts.length === 0) {
        debtListDiv.innerHTML = '<p>No debts added yet.</p>';
        clearDebtsBtn.style.display = 'none';
        downloadDebtsBtn.style.display = 'none'; // Hide download button if no debts
    } else {
        let listHtml = '<ul>';
        // Sort debts by name for consistency
        debts.sort((a, b) => a.name.localeCompare(b.name));
        debts.forEach(debt => {
            // Use template literals for cleaner HTML generation
            listHtml += `
                <li class="debt-item" title="ID: ${debt.id}"> <span class="debt-name">${debt.name}</span>
                    <span class="debt-details">Rs.${debt.balance.toFixed(2)} @ ${debt.apr.toFixed(2)}% (Min: Rs.${debt.min_payment.toFixed(2)})</span>
                </li>
            `;
        });
        listHtml += '</ul>';
        debtListDiv.innerHTML = listHtml;
        // Show buttons when debts exist
        clearDebtsBtn.style.display = 'inline-block';
        downloadDebtsBtn.style.display = 'inline-block';
    }
}

// --- Event Listeners ---

debtForm.addEventListener('submit', addDebt);
clearDebtsBtn.addEventListener('click', clearAllDebts);
downloadDebtsBtn.addEventListener('click', downloadDebts); // Add listener for download

sendChatBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', function(event) {
    // Send on Enter key, unless Shift is pressed (for potential future multi-line input)
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Prevent default form submission or newline in single-line input
        sendChatMessage();
    }
});

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    fetchDebts(); // Fetch debts once the DOM is loaded
    hideLoading(); // Ensure loading hidden on start

    // Add initial AI greeting after a short delay
    setTimeout(() => {
       // Check if chat history is empty before adding greeting
       if (!chatHistoryDiv.hasChildNodes()) {
          addMessageToHistory("Hello! I'm your AI Debt Coach. Add your debts using the form above. Then, ask me questions like 'Explain the Snowball method', 'Which strategy is better for me?', or 'What's the impact of paying an extra Rs. 1000 per month?'. You can also download your debt list using the button.", 'ai');
       }
    }, 500); // 500ms delay

     // Add a small shake animation for the input field for visual feedback
    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule(`
        @keyframes shakeInput {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(1px); }
          30%, 50%, 70% { transform: translateX(-2px); }
          40%, 60% { transform: translateX(2px); }
        }
    `, styleSheet.cssRules.length);
    styleSheet.insertRule(`
        .shake-input { animation: shakeInput 0.3s cubic-bezier(.36,.07,.19,.97) both; }
    `, styleSheet.cssRules.length);

});

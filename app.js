import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dayjs from 'dayjs'; // Import dayjs for current date

// --- Configuration ---
dotenv.config(); // Load .env file
const app = express();
const port = process.env.PORT || 3000;
const GOOGLE_API_KEY = process.env.GEMINI_API_KEY;

if (!GOOGLE_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined in .env file.");
    process.exit(1); // Exit if key is missing
}

// --- Initialize Gemini ---
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // Or another suitable model
});

const generationConfig = {
    temperature: 0.7, // Adjust creativity vs factualness
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192, // Adjust as needed
    responseMimeType: "text/plain",
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];


// --- Middleware ---
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Parse JSON86 request bodies
app.use(express.static('public')); // Serve static files from 'public' folder

// --- In-Memory Storage (for simplicity - Consider persistence for real apps) ---
let userDebts = [];
let nextDebtId = 0;
// Store chat history (optional, but good for context in more advanced bots)
// let chatHistory = []; // Example: [{ role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] }]

// --- API Routes ---

// Get current debts
app.get('/api/debts', (req, res) => {
    res.json(userDebts);
});

// Add a new debt
app.post('/api/debts', (req, res) => {
    const { name, balance, apr, min_payment } = req.body;

    // Basic validation
    if (!name || balance === undefined || apr === undefined || min_payment === undefined) {
        return res.status(400).json({ error: "Missing required debt fields (name, balance, apr, min_payment)." });
    }
    if (typeof balance !== 'number' || typeof apr !== 'number' || typeof min_payment !== 'number' || balance < 0 || apr < 0 || min_payment < 0) {
        return res.status(400).json({ error: "Invalid data type or negative value for balance, apr, or min_payment." });
    }

    const newDebt = {
        id: nextDebtId++,
        name: String(name),
        balance: Number(balance),
        apr: Number(apr),
        min_payment: Number(min_payment),
    };
    userDebts.push(newDebt);
    console.log("Added Debt:", newDebt);
    console.log("Current Debts:", userDebts);
    res.status(201).json(newDebt);
});

// Clear all debts
app.delete('/api/debts', (req, res) => {
    userDebts = [];
    nextDebtId = 0;
    // chatHistory = []; // Clear chat history if you implement it
    console.log("Cleared all debts.");
    res.status(200).json({ message: "All debts cleared." });
});


// --- NEW Chat Endpoint ---
app.post('/api/coach/chat', async (req, res) => {
    const { userMessage, extraPayment } = req.body; // Get message and optional extra payment

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
        return res.status(400).json({ error: "Missing or invalid 'userMessage'." });
    }

    const extraPaymentAmount = extraPayment && !isNaN(parseFloat(extraPayment)) ? parseFloat(extraPayment) : null;


    if (userDebts.length === 0 && !userMessage.toLowerCase().includes('hello') && !userMessage.toLowerCase().includes('hi')) {
        // Allow greetings even with no debt, otherwise require debts
        return res.status(200).json({ // Send 200 so frontend can display it
            aiResponse: "It looks like you haven't added any debts yet. Please add your debts first so I can help you plan!"
        });
    }

    // --- Construct the Prompt for Gemini ---
    let prompt = `Act as a friendly, encouraging, and helpful AI Debt Management Coach. Your primary goal is to help the user understand and plan their debt repayment using the Snowball or Avalanche methods based ONLY on the information provided.

Current Date: ${dayjs().format('YYYY-MM-DD')}
`;

    if (userDebts.length > 0) {
        prompt += `\nUser's Debts:\n`;
        userDebts.forEach(debt => {
            prompt += `- Name: ${debt.name}, Current Balance: Rs.${debt.balance.toFixed(2)}, APR: ${debt.apr.toFixed(2)}%, Minimum Payment: Rs.${debt.min_payment.toFixed(2)}\n`;
        });
    } else {
         prompt += `\nUser has no debts listed currently.\n`;
    }


    if (extraPaymentAmount !== null && extraPaymentAmount >= 0) {
         prompt += `\nUser's potential extra monthly payment towards debt: Rs.${extraPaymentAmount.toFixed(2)}\n`;
    } else {
        prompt += `\nUser has not specified an extra monthly payment amount.\n`;
    }

    prompt += `\nUser's latest message: "${userMessage}"

Based on the user's message and their debt situation (and extra payment amount if provided), please respond helpfully. Here are your capabilities:

1.  **Explain Strategies:** If the user asks about the Snowball or Avalanche method (e.g., "explain snowball", "what is avalanche?", "how does snowball work?"), explain it clearly and simply (1-2 sentences). If debts exist, identify which specific debt would be targeted first according to that method and why.
2.  **Recommend Strategy:** If the user asks for a recommendation (e.g., "which method is best?", "recommend a strategy", "snowball or avalanche for me?"), analyze their debts. Generally:
    * Suggest Avalanche if minimizing total interest paid is the priority (mentioning the highest APR debt).
    * Suggest Snowball if quick wins and motivation are desired (mentioning the lowest balance debt).
    * Acknowledge both are valid and the 'best' depends on personal preference and behavior. Base the recommendation *only* on the provided debt list. If no debts exist, explain the difference generally.
3.  **Estimate Payoff (If extra payment provided AND requested):** If the user has provided an 'extra monthly payment' amount AND asks for a projection, timeline, or impact of the extra payment (e.g., "how long to pay off?", "what difference does Rs.${extraPaymentAmount || 'XXX'} make?"):
    * Briefly estimate (qualitatively or with rough numbers if possible) how focusing the extra payment using *both* the Snowball and Avalanche methods might affect their payoff timeline compared to minimum payments only.
    * Example: "With an extra Rs.${extraPaymentAmount || 'XXX'} per month, the Snowball method could help you get debt-free faster, possibly around [Estimate timeframe/comparison]. The Avalanche method might take a similar time but could save you more on interest overall, maybe around Rs.[Estimate savings]."
    * **Crucially:** State these are *very rough estimates* based on current data and the specified extra payment. They don't account for future interest changes, fees, or payment variations. The purpose is illustrative. Do *not* perform complex month-by-month amortization.
4.  **General Chat:** Respond appropriately to greetings ("Hi", "Hello"), simple questions about the tool ("How does this work?"), or other relevant conversational messages within your role as a debt coach.
5.  **Clarification:** If the user's message is unclear or doesn't fit the above, ask for clarification politely (e.g., "Could you please tell me more about what you'd like to know?").

**IMPORTANT CONSTRAINTS:**
* **DO NOT** give specific financial advice (e.g., "You SHOULD take out a loan," "Invest this money instead").
* **DO NOT** recommend specific financial products (specific loans, credit cards, banks). You can *briefly explain concepts* like 'debt consolidation' *only* if the user *explicitly* asks "What is debt consolidation?", but keep it neutral, general, and state it's just information.
* **STICK TO** analyzing the provided debts and explaining/comparing the Snowball and Avalanche methods in relation to those debts.
* **MAINTAIN** an encouraging, supportive, and friendly tone. Use "You" and "Your".
* **KEEP** responses concise and easy to understand. Use paragraphs or bullet points for clarity if needed.
* **USE** the currency symbol 'Rs.' where appropriate when referring to debt amounts or payments.
* **If no debts are listed,** tailor explanations and recommendations to be general concepts rather than applying them to specific (non-existent) debts. You can still explain how the methods *would* work if debts were present.
`;

    console.log("--- Sending Chat Prompt to Gemini ---");
    console.log(prompt);
    console.log("-----------------------------------");


    try {
        // For a truly conversational bot, you'd manage history:
        // const chatSession = model.startChat({ generationConfig, safetySettings, history: chatHistory });
        // const result = await chatSession.sendMessage(prompt);
        // chatHistory.push({ role: "user", parts: [{ text: userMessage }] }); // Add user message to history
        // chatHistory.push({ role: "model", parts: [{ text: result.response.text() }] }); // Add AI response to history

        // --- Simplified approach for this example (no history) ---
         const result = await model.generateContent(prompt); // Use generateContent for single turns easily
         const aiResponse = result.response.text();
        // --- End Simplified approach ---


        console.log("--- Received Chat Response from Gemini ---");
        console.log(aiResponse);
        console.log("---------------------------------------");

        res.json({ aiResponse: aiResponse }); // Send response back to frontend

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Check for specific Gemini block reasons
        let errorMessage = "Failed to get response from AI coach. Please check server logs.";
        if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
             errorMessage = `Content blocked by API safety settings. Reason: ${error.response.promptFeedback.blockReason}`;
             res.status(503).json({ error: errorMessage });
        } else if (error.message) {
             errorMessage = `Error interacting with AI: ${error.message}`;
             res.status(500).json({ error: errorMessage });
        } else {
             res.status(500).json({ error: errorMessage });
        }
    }
});


// --- (Optional but Recommended) Keep the old endpoint for specific explanations if needed ---
// Or you could remove it if the chat endpoint covers all use cases.
app.post('/api/coach/explain', async (req, res) => {
    const { strategy } = req.body;

    if (!strategy || (strategy !== 'snowball' && strategy !== 'avalanche')) {
        return res.status(400).json({ error: "Invalid or missing 'strategy'. Choose 'snowball' or 'avalanche'." });
    }

    if (userDebts.length === 0) {
        return res.status(400).json({ explanation: "Please add at least one debt first before asking for an explanation." });
    }

    // Construct a simpler, focused prompt just for explanation
    let prompt = `Act as a friendly AI Debt Management Coach. Explain the '${strategy}' debt repayment strategy in simple terms (1-2 sentences). Based *only* on the following debts, identify which specific debt the user should focus on paying off first using this method and briefly state why. Keep the entire explanation concise (around 3-4 sentences total) and encouraging. Do *not* give other advice.

User's Debts:
`;
    userDebts.forEach(debt => {
        prompt += `- Name: ${debt.name}, Balance: Rs.${debt.balance.toFixed(2)}, APR: ${debt.apr.toFixed(2)}%, Min Pay: Rs.${debt.min_payment.toFixed(2)}\n`;
    });

    console.log("--- Sending Explain Prompt to Gemini ---");
    console.log(prompt);
    console.log("-----------------------------");

    try {
        const result = await model.generateContent(prompt);
        const explanation = result.response.text();
        console.log("--- Received Explanation from Gemini ---");
        console.log(explanation);
        console.log("--------------------------------------");
        res.json({ explanation: explanation });
    } catch (error) {
        console.error("Error calling Gemini API (explain):", error);
         let errorMessage = "Failed to get explanation from AI coach.";
         if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
             errorMessage = `Content blocked by API safety settings. Reason: ${error.response.promptFeedback.blockReason}`;
             res.status(503).json({ error: errorMessage });
         } else {
             res.status(500).json({ error: errorMessage });
         }
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dayjs from 'dayjs'; // Import dayjs for current date
import Papa from 'papaparse'; // Import papaparse for CSV generation

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
    model: "gemini-2.5-flash", // Or another suitable model
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
app.use(express.json()); // Parse JSON request bodies
app.use(express.static('public')); // Serve static files from 'public' folder

// --- In-Memory Storage (for simplicity - Consider persistence for real apps) ---
let userDebts = [];
let nextDebtId = 0;
// Store chat history (optional, but good for context in more advanced bots)
// let chatHistory = []; // Example: [{ role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] }]

// --- API Routes ---

// Get current debts
app.get('/api/debts', (req, res) => {
    // Send the current list of debts
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

    // Create the new debt object
    const newDebt = {
        id: nextDebtId++, // Assign and increment ID
        name: String(name),
        balance: Number(balance),
        apr: Number(apr),
        min_payment: Number(min_payment),
    };
    // Add the new debt to the in-memory array
    userDebts.push(newDebt);
    console.log("Added Debt:", newDebt); // Log added debt to server console
    console.log("Current Debts:", userDebts); // Log current state of debts
    // Send the newly created debt back as confirmation
    res.status(201).json(newDebt);
});

// Clear all debts
app.delete('/api/debts', (req, res) => {
    // Reset the debts array and ID counter
    userDebts = [];
    nextDebtId = 0;
    // chatHistory = []; // Clear chat history if you implement it
    console.log("Cleared all debts."); // Log action to server console
    // Send success message
    res.status(200).json({ message: "All debts cleared." });
});

// --- NEW: Download Debt Report Route ---
app.get('/api/debts/download', (req, res) => {
    console.log("Received request for /api/debts/download"); // Log when route is hit

    // Handle case where there are no debts
    if (userDebts.length === 0) {
        console.log("No debts to download, sending empty CSV.");
        // Set headers for an empty CSV file
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="debt_report_empty.csv"');
        // Send a 200 OK status with an empty body
        res.status(200).send('');
        return; // Stop execution here
    }

    try {
        // Prepare data specifically for CSV export
        // Map the userDebts array to a new array of objects with desired headers/formats
        const dataForCsv = userDebts.map(debt => ({
            "Creditor Name": debt.name,
            "Current Balance (Rs.)": debt.balance.toFixed(2), // Format currency
            "Interest Rate (APR %)": debt.apr.toFixed(2),     // Format percentage
            "Minimum Monthly Payment (Rs.)": debt.min_payment.toFixed(2), // Format currency
        }));

        // Convert the array of objects to a CSV string using papaparse
        const csv = Papa.unparse(dataForCsv);
        console.log("CSV data generated successfully.");

        // Set HTTP headers to trigger browser download
        res.setHeader('Content-Type', 'text/csv'); // Indicate CSV content
        // Generate a filename including the current date
        const filename = `debt_report_${dayjs().format('YYYY-MM-DD')}.csv`;
        // Suggest the filename to the browser
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Send the generated CSV data as the response body
        res.status(200).send(csv);
        console.log(`Generated and sent debt report: ${filename}`);

    } catch (error) {
        // Log any errors during CSV generation or sending
        console.error("Error generating CSV report:", error);
        // Send a generic server error response to the browser
        res.status(500).send("Error generating debt report.");
    }
});


// --- Chat Endpoint ---
app.post('/api/coach/chat', async (req, res) => {
    const { userMessage } = req.body; // Get message from request body

    // Simple extraction of potential extra payment from the user message
    let extraPaymentAmount = null;
    // Regex to find "extra Rs. XXX" or "extra Rs XXX" (case-insensitive)
    const extraPaymentMatch = userMessage.match(/extra rs\.?\s*(\d+(\.\d+)?)/i);
    if (extraPaymentMatch && extraPaymentMatch[1]) {
        extraPaymentAmount = parseFloat(extraPaymentMatch[1]);
        console.log(`Extracted extra payment from message: Rs.${extraPaymentAmount}`);
    }

    // Validate user message
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
        return res.status(400).json({ error: "Missing or invalid 'userMessage'." });
    }

    // --- Construct the Prompt for Gemini ---
    // Start with the base persona and current date
    let prompt = `Act as a friendly, encouraging, and helpful AI Debt Management Coach. Your primary goal is to help the user understand and plan their debt repayment using the Snowball or Avalanche methods based ONLY on the information provided.

Current Date: ${dayjs().format('YYYY-MM-DD')}
`;

    // Add current debt information if available
    if (userDebts.length > 0) {
        prompt += `\nUser's Debts:\n`;
        userDebts.forEach(debt => {
            prompt += `- Name: ${debt.name}, Current Balance: Rs.${debt.balance.toFixed(2)}, APR: ${debt.apr.toFixed(2)}%, Minimum Payment: Rs.${debt.min_payment.toFixed(2)}\n`;
        });
    } else {
         // Handle case where no debts are added yet
         prompt += `\nUser has no debts listed currently.\n`;
         // Allow greetings, but guide towards adding debts for other queries
         if (!userMessage.toLowerCase().includes('hello') && !userMessage.toLowerCase().includes('hi')) {
            // Send a helpful message back directly without calling Gemini
            return res.status(200).json({
                aiResponse: "It looks like you haven't added any debts yet. Please add your debts first so I can help you plan!"
            });
         }
    }

    // Add information about extra payment if detected
    if (extraPaymentAmount !== null && extraPaymentAmount >= 0) {
         prompt += `\nUser mentioned a potential extra monthly payment towards debt: Rs.${extraPaymentAmount.toFixed(2)}\n`;
    } else {
        prompt += `\nUser has not specified an extra monthly payment amount in this message.\n`;
    }

    // Add the user's actual message
    prompt += `\nUser's latest message: "${userMessage}"

// --- Capabilities and Constraints for the AI ---
// (This part defines how the AI should behave based on the input)
Based on the user's message and their debt situation (and extra payment amount if mentioned), please respond helpfully. Here are your capabilities:

1.  **Explain Strategies:** If the user asks about the Snowball or Avalanche method (e.g., "explain snowball", "what is avalanche?", "how does snowball work?"), explain it clearly and simply (1-2 sentences). If debts exist, identify which specific debt would be targeted first according to that method and why.
2.  **Recommend Strategy:** If the user asks for a recommendation (e.g., "which method is best?", "recommend a strategy", "snowball or avalanche for me?"), analyze their debts. Generally:
    * Suggest Avalanche if minimizing total interest paid is the priority (mentioning the highest APR debt).
    * Suggest Snowball if quick wins and motivation are desired (mentioning the lowest balance debt).
    * Acknowledge both are valid and the 'best' depends on personal preference and behavior. Base the recommendation *only* on the provided debt list. If no debts exist, explain the difference generally.
3.  **Estimate Payoff (If extra payment mentioned AND relevant):** If the user has mentioned an 'extra monthly payment' amount in their message AND asks for a projection, timeline, or impact of the extra payment (e.g., "how long to pay off?", "what difference does Rs.${extraPaymentAmount || 'XXX'} make?", "impact of extra payment"):
    * Briefly estimate (qualitatively or with rough numbers if possible) how focusing the extra payment using *both* the Snowball and Avalanche methods might affect their payoff timeline compared to minimum payments only.
    * Example: "With an extra Rs.${extraPaymentAmount || 'XXX'} per month, the Snowball method could help you pay off the [Lowest Balance Debt Name] faster, potentially getting you debt-free sooner, maybe around [Estimate timeframe/comparison]. The Avalanche method, focusing on the [Highest APR Debt Name], might take a similar time overall but could save you more on interest, perhaps around Rs.[Estimate savings]."
    * **Crucially:** State these are *very rough estimates* based on current data and the specified extra payment. They don't account for future interest changes, fees, or payment variations. The purpose is illustrative. Do *not* perform complex month-by-month amortization.
    * If extra payment wasn't mentioned or the question isn't about its impact, don't bring it up unless clarifying.
4.  **General Chat:** Respond appropriately to greetings ("Hi", "Hello"), simple questions about the tool ("How does this work?"), or other relevant conversational messages within your role as a debt coach.
5.  **Clarification:** If the user's message is unclear or doesn't fit the above, ask for clarification politely (e.g., "Could you please tell me more about what you'd like to know?").

**IMPORTANT CONSTRAINTS:**
* **DO NOT** give specific financial advice (e.g., "You SHOULD take out a loan," "Invest this money instead").
* **DO NOT** recommend specific financial products (specific loans, credit cards, banks). You can *briefly explain concepts* like 'debt consolidation' *only* if the user *explicitly* asks "What is debt consolidation?", but keep it neutral, general, and state it's just information.
* **STICK TO** analyzing the provided debts and explaining/comparing the Snowball and Avalanche methods in relation to those debts and any mentioned extra payment.
* **MAINTAIN** an encouraging, supportive, and friendly tone. Use "You" and "Your".
* **KEEP** responses concise and easy to understand. Use paragraphs or bullet points for clarity if needed.
* **USE** the currency symbol 'Rs.' where appropriate when referring to debt amounts or payments.
* **If no debts are listed,** tailor explanations and recommendations to be general concepts rather than applying them to specific (non-existent) debts. You can still explain how the methods *would* work if debts were present.
`; // End of prompt template literal

    console.log("--- Sending Chat Prompt to Gemini ---");
    // console.log(prompt); // Keep commented out unless debugging to avoid verbose logs in production
    console.log(`User Message: ${userMessage}, Extra Payment Detected: ${extraPaymentAmount}`); // Log key info
    console.log("-----------------------------------");


    try {
        // Send the constructed prompt to the Gemini model
        const result = await model.generateContent(prompt);
        // Extract the text response from the result
        const aiResponse = result.response.text();

        console.log("--- Received Chat Response from Gemini ---");
        // console.log(aiResponse); // Keep commented out unless debugging
        console.log("---------------------------------------");

        // Send the AI's response back to the frontend
        res.json({ aiResponse: aiResponse });

    } catch (error) {
        // Handle errors during the API call
        console.error("Error calling Gemini API:", error);
        let errorMessage = "Failed to get response from AI coach. Please check server logs.";
        // Check for specific Gemini content blocking errors
        if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
             errorMessage = `Content blocked by API safety settings. Reason: ${error.response.promptFeedback.blockReason}`;
             // Send a 503 Service Unavailable status for blocked content
             res.status(503).json({ error: errorMessage });
        } else if (error.message) {
             // Use the error message if available
             errorMessage = `Error interacting with AI: ${error.message}`;
             res.status(500).json({ error: errorMessage });
        } else {
             // Send a generic 500 Internal Server Error
             res.status(500).json({ error: errorMessage });
        }
    }
});

// --- Start Server ---
app.listen(port, () => {
    // Log messages indicating the server is running and accessible
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Frontend available at http://localhost:${port}`); // Assuming static serving from root
});

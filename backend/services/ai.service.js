const axios = require("axios");

const generateSubtasksAI = async ({
  taskTitle,
  description,
  deadline,
}) => {
  try {
    const prompt = `Break the following task into 3 to 5 concise, actionable subtasks.
Task: ${taskTitle}
Description: ${description || "None"}
Deadline: ${deadline || "Flexible"}

Respond with ONLY a valid JSON array of strings. Example: ["Step 1", "Step 2", "Step 3"]. Do not include extra text or markdown formatting.`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct:free",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Smart Task Manager",
        },
        timeout: 15000,
      }
    );

    let text = response.data?.choices?.[0]?.message?.content || "";
    // Clean up code fences if present
    text = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("AI Generation issue:", error.response?.data || error.message);
    console.log("Using smart fallback subtasks.");

    return [
      `Analyze requirements for "${taskTitle}"`,
      `Design solution and outline steps`,
      `Implement core changes for "${taskTitle}"`,
      `Review and test edge cases`,
      `Finalize and document completion`,
    ];
  }
};

module.exports = {
  generateSubtasksAI,
};
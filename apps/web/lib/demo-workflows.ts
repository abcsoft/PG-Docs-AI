/** One-click demo prompts — mirror the seeded demo workspace
 * (apps/api/scripts/seed_demo.py) but work with any uploaded documents. */
export const SUGGESTED_PROMPTS = [
  {
    label: "Summarize this contract",
    prompt: "Summarize the key terms of the SaaS agreement in our documents.",
  },
  {
    label: "List payment terms",
    prompt: "List all payment terms mentioned in the documents: amounts, due dates, and late penalties.",
  },
  {
    label: "What risks are mentioned?",
    prompt: "What risks are mentioned across our documents? Include severity and where each risk comes from.",
  },
  {
    label: "Compare these two proposals",
    prompt: "Compare the two business proposals in our documents: pricing, delivery plan and risks.",
  },
] as const;

SOP: Mobility Axiom System Maintenance & Debugging

Rule Zero: Do No Harm.
Never allow an AI agent to write directly to production files without an isolated test or a backup.
Step 1: Isolate the Fire (Triage)

When a bug is reported, the engineer must determine exactly which layer of the stack is failing before touching any code. Because this platform operates on a secure, localized architecture, all logs are local.

    UI/UX or Browser Bug (Frontend): Press F12. Check the Browser Console for red JavaScript errors, or the Network tab for failed API calls (404, 403).

    Logic or Database Bug (Backend): Check the Node.js terminal output running server.js. Look for crash traces or failed database queries.

    Hardware/Stream Bug (Edge): If a camera stream fails or the AR overwatch drops, isolate whether the ping to the device IP is timing out, or if the FLV player on the frontend is failing to decode.

Step 2: The "Read-Only" AI Prompt Standard

Engineers must never tell the AI to "fix it" on the first prompt. They must force the AI to analyze the workspace in Read-Only mode first.
Require them to use this exact prompt structure:

    CRITICAL DEBUG: READ-ONLY MODE.

        The system is throwing this error: [Paste exact error log from console or server.js].

        The user was trying to perform this action: [Describe action, e.g., Open Linked Camera].

        Scan the workspace to trace the path of this function.

        Do NOT write any fix yet. Output a step-by-step explanation of why it failed and list the exact file names and line numbers involved.

Step 3: The Surgical Fix (No Appending)

AI tools love to write a brand-new function at the bottom of the file and leave the broken one at the top. This causes massive conflicts.

    The engineer must instruct the AI: "Give me the exact line numbers to replace. Do not append to the end of the file."

    The engineer must manually verify that the old, broken logic is deleted.

Step 4: The Dictionary Rule

If the bug requires a new user-facing message, error, or status update:

    No Hardcoding: The engineer is strictly forbidden from typing English text directly into server.js or frontend HTML.

    Use the Ledger: All new text must be routed through public/locales/en.json to maintain the platform's enterprise tone.

Step 5: Clean the Trail

Before committing the fix and closing the ticket, the engineer must run a "Garbage Collection" prompt to ensure no commented-out code or orphaned CSS was left behind in the fix
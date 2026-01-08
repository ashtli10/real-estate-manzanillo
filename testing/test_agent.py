import os
import asyncio
import sys
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from browser_use import Agent

load_dotenv()

async def run_agent():
    # 1. Capture the instruction from VS Code
    instruction = sys.argv[1] if len(sys.argv) > 1 else "Go to google.com and check the page title"
    print(f"🤖 AGENT ACTIVATED: {instruction}")

    # 2. Configure Gemini (Your 'Brain')
    llm = ChatGoogleGenerativeAI(
        model="gemini-3-pro", # Use 'gemini-2.0-flash-exp' if you have access for more speed
        temperature=0.0,
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )

    # 3. Create the Agent
    agent = Agent(
        task=instruction,
        llm=llm,
        use_vision=True,   # Essential for visual navigation
        headless=False     # False so you can see the browser open
    )

    # 4. Run
    result = await agent.run()
    print("\n✅ REPORT:\n", result)

if __name__ == "__main__":
    asyncio.run(run_agent())
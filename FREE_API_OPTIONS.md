# Free API Options for Product Search

## Good News: Free Tiers Are Available! 🎉

You can use the product search functionality **completely free** with the following setup:

## Option 1: Use Free Tiers (RECOMMENDED)

### Anthropic API - $5 Free Credits
**Free tier:**
- $5 in free credits when you sign up
- Lasts for ~150-500 searches depending on complexity
- No credit card required for signup

**Setup:**
1. Go to https://console.anthropic.com/
2. Sign up with email (no credit card needed)
3. Get $5 free credits automatically
4. Go to https://console.anthropic.com/settings/keys
5. Create API key

**How long will it last?**
- Each search costs ~$0.01-$0.03
- $5 = approximately 150-500 searches
- Good for testing and development!

### Google Custom Search API - 100 Queries/Day Free
**Free tier:**
- 100 search queries per day
- Completely free forever
- No credit card required

**Setup:**
1. **Get API Key** (Free):
   - Go to https://console.cloud.google.com/apis/credentials
   - Sign in with Google account
   - Create new project (free)
   - Click "Create Credentials" > "API Key"
   - Copy the key

2. **Enable Custom Search API** (Free):
   - Go to https://console.cloud.google.com/apis/library/customsearch.googleapis.com
   - Click "Enable" (free)

3. **Create Search Engine** (Free):
   - Go to https://programmablesearchengine.google.com/
   - Click "Add"
   - Settings:
     - Name: AgenticCommerce
     - Search the entire web: ON
   - Create and copy the Search Engine ID

**How long will it last?**
- 100 free searches per day
- Resets daily
- Forever free!

### Combined Free Usage
- **100 searches/day** from Google (forever)
- **150-500 total searches** from Anthropic ($5 credit)
- Perfect for testing, demos, and light usage!

## Option 2: Completely Free Alternatives (No Credits Needed)

If you want 100% free forever without any credits, here are alternatives:

### Alternative 1: Use OpenRouter with Free Models

OpenRouter provides free access to various AI models:

**Free models available:**
- Google Gemini Flash (free)
- Meta Llama models (free)
- Mistral models (some free)

**Setup:**
1. Go to https://openrouter.ai/
2. Sign up (free)
3. Get API key
4. Use their free models

**Code changes needed:**
- Modify `apps/backend/src/services/ai.service.ts`
- Switch from Anthropic to OpenRouter API
- Use free model like `google/gemini-flash-1.5`

### Alternative 2: Use Brave Search API (Free Tier)

Instead of Google Custom Search:

**Free tier:**
- 2,000 queries per month (free)
- Better than Google's 100/day!
- No credit card required

**Setup:**
1. Go to https://brave.com/search/api/
2. Sign up for free tier
3. Get API key

**Code changes needed:**
- Modify `apps/backend/src/services/search.service.ts`
- Switch from Google to Brave Search API

### Alternative 3: Use DuckDuckGo (Completely Free, No API Key)

**Free tier:**
- Unlimited searches
- No API key required
- Uses web scraping

**Limitations:**
- May be less reliable
- Slower than official APIs
- Could break if they change their website

## Option 3: Self-Hosted Free AI (Advanced)

Run AI models locally:

**Options:**
- Ollama (run Llama models locally)
- LocalAI (run various models)
- LM Studio

**Pros:**
- Completely free
- No API keys needed
- Unlimited usage

**Cons:**
- Requires powerful computer (GPU recommended)
- Slower than cloud APIs
- More complex setup

## Recommended Setup for You

Based on your use case, I recommend:

### For Testing/Development:
```
✅ Use Anthropic Free Credits ($5) + Google Free Tier (100/day)
   - Quick setup
   - Works immediately
   - Good for 150-500 searches
   - Then 100/day forever
```

### For Long-Term Free:
```
✅ Use OpenRouter (Free) + Brave Search (Free)
   - 100% free forever
   - 2,000 searches/month
   - Requires minor code changes
```

## Setup Instructions for Recommended Option

### Quick Start (5 minutes):

1. **Get Anthropic Key** (Free $5):
   ```
   https://console.anthropic.com/
   - Sign up
   - Copy API key from Settings > API Keys
   ```

2. **Get Google Search Keys** (Free 100/day):
   ```
   https://console.cloud.google.com/apis/credentials
   - Create API key

   https://programmablesearchengine.google.com/
   - Create search engine
   - Copy Search Engine ID
   ```

3. **Configure on Railway**:
   ```
   https://railway.app/dashboard
   - Select your project
   - Backend service > Variables
   - Add:
     ANTHROPIC_API_KEY=sk-ant-...
     GOOGLE_API_KEY=AIza...
     GOOGLE_SEARCH_ENGINE_ID=...
   ```

4. **Test in Mobile App**:
   - Open app > Search tab
   - Search for "laptop"
   - Should work!

## Cost Monitoring

### Anthropic Dashboard:
- View remaining credits: https://console.anthropic.com/settings/usage
- Get email alerts when running low

### Google Console:
- View daily quota: https://console.cloud.google.com/apis/dashboard
- See queries remaining

## What Happens When Free Credits Run Out?

### Anthropic ($5 runs out):
**Option A**: Add credit card and pay-as-you-go (~$0.01/search)
**Option B**: Create new account (not recommended, against ToS)
**Option C**: Switch to OpenRouter free models (see Alternative 1)

### Google (100/day limit hit):
**Option A**: Wait 24 hours for reset
**Option B**: Upgrade to paid ($5/1000 queries)
**Option C**: Switch to Brave Search (2000/month free)

## Need Help Switching to Completely Free Options?

Let me know if you want me to:
1. ✅ Set up the recommended free tier (5 min)
2. 🔧 Modify code to use OpenRouter + Brave (30 min)
3. 🏠 Set up local AI models (advanced, 2+ hours)

The free tiers should give you enough usage for testing and demos!

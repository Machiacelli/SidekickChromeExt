# Security Notice

## API Key Exposure Resolution

### What Happened
Notion API credentials were accidentally committed in versions 1.1.8 and 1.1.9:
- Commit `dbd0340`: Plaintext API key
- Commit `10bbaf7`: Base64 encoded API key

### Actions Taken
✅ **v1.2.0**: Removed all API keys from codebase
✅ Implemented secure Cloudflare Worker proxy
✅ Extension now routes bug reports through Worker (no keys in code)

### Required Action
⚠️ **IMPORTANT**: The exposed Notion API token should be regenerated:

1. Go to https://www.notion.com/my-integrations
2. Find your integration
3. Generate a new Internal Integration Token
4. Update your Cloudflare Worker with the new token
5. The old token should be considered compromised and revoked

### New Secure Architecture
- Extension → Cloudflare Worker → Notion API
- Worker URL: `https://notionbugreport.akaffebtd.workers.dev/`
- API key stored securely in Worker environment variables
- Extension code is now safe to publish publicly

### Git History
The exposed keys remain in git history (commits `10bbaf7` and `dbd0340`).
After regenerating the Notion token, the old keys will be invalidated and harmless.

**No further action needed on the repository once the Notion token is regenerated.**

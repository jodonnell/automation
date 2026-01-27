# Commands

```
npm run dev -> http://localhost:5173/
npm run test
npm run lint
npm run prettier
npm run deploy -> setup pages on deploy branch
```

browser use mcp server
```
npm install -g @playwright/mcp
codex mcp add playwright npx "@playwright/mcp@latest"
```


```
# new
brew install --cask docker
open -a Docker
docker build -t codex-sandbox .
docker run --rm -it --privileged -v "$PWD":/workspace -w /workspace  -p 3000:3000   -e PUBLIC_URL=http://localhost:3000   -e NEXTAUTH_URL=http://localhost:3000  -e OAUTH_REDIRECT_URI=http://localhost:3000/oauth/callback   -v ~/.codex/auth.json:/root/.codex/auth.json:ro codex-sandbox
codex --sandbox danger-full-access --ask-for-approval never
```
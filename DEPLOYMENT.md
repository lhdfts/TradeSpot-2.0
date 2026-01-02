# How to Deploy to GitHub Pages

Since this project uses Vite, we can easily deploy it to GitHub Pages using GitHub Actions. I have already created the workflow file for you at `.github/workflows/deploy.yml`.

Follow these steps to finish the deployment:

## 1. Push your code to GitHub
If you haven't already, push your code to your GitHub repository:

```bash
git add .
git commit -m "Add deployment workflow"
git push origin main
```

## 2. Configure Repository Settings
1.  Go to your repository on GitHub.
2.  Click on **Settings** > **Pages** (in the left sidebar).
3.  Under **Build and deployment**, set **Source** to **GitHub Actions**.
    *   *Note: You do NOT need to select a branch here because the Action handles it.*

## 3. Update `vite.config.ts` (IMPORTANT)
If your repository URL is `https://username.github.io/my-repo/`, you **MUST** update `vite.config.ts` to set the base path.

1.  Open `vite.config.ts`.
2.  Add the `base` property with your repository name:

```typescript
export default defineConfig({
  base: '/my-repo/', // REPLACE '/my-repo/' with your actual repository name (e.g., '/appointment-system/')
  plugins: [react()],
  // ...
})
```
3.  Commit and push this change:
    ```bash
    git add vite.config.ts
    git commit -m "Update base path for GitHub Pages"
    git push origin main
    ```

## 4. Verify Deployment
1.  Go to the **Actions** tab in your repository.
2.  You should see the "Deploy to GitHub Pages" workflow running.
3.  Once it finishes (green checkmark), click on the workflow run.
4.  Under the "deploy" job, you will see the URL to your live site!

## Troubleshooting

### "Upgrade or make this repository public..."
If you see a message saying you need to upgrade to enable Pages, it means your repository is **Private**.
*   **Free GitHub accounts** only support GitHub Pages for **Public** repositories.
*   **To fix this:** Go to **Settings** > **General**, scroll to the bottom ("Danger Zone"), and change repository visibility to **Public**.


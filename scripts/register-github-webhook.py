"""
Register GitHub webhook for real-time SOC 2 monitoring
Run this once to set up the webhook on your GitHub org/repo
"""
import os
import requests
import json

# Configuration
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")  # Your GitHub PAT with admin:org scope
ORG_NAME = "workluismigu-gif"
REPO_NAME = "shieldbase"  # Leave empty for org-wide webhook
WEBHOOK_URL = "https://shieldbase.vercel.app/api/webhook/github"
WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "shieldbase-webhook-secret-2026")

# Events to listen for
EVENTS = [
    "repository",      # Repo setting changes (branch protection, etc.)
    "organization",    # Org-level changes
    "push",           # Code pushes (may affect code-related controls)
    "pull_request",   # PR activity (code review controls)
]

def register_webhook():
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }

    # Determine URL (org-wide or repo-specific)
    if REPO_NAME:
        url = f"https://api.github.com/repos/{ORG_NAME}/{REPO_NAME}/hooks"
        target = f"repo {ORG_NAME}/{REPO_NAME}"
    else:
        url = f"https://api.github.com/orgs/{ORG_NAME}/hooks"
        target = f"org {ORG_NAME}"

    config = {
        "url": WEBHOOK_URL,
        "content_type": "json",
        "secret": WEBHOOK_SECRET,
        "insecure_ssl": "0",
    }

    payload = {
        "name": "web",
        "active": True,
        "events": EVENTS,
        "config": config,
    }

    print(f"Registering webhook for {target}...")
    print(f"  URL: {WEBHOOK_URL}")
    print(f"  Events: {', '.join(EVENTS)}")

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 201:
        webhook = response.json()
        print(f"✅ Webhook registered successfully!")
        print(f"  Webhook ID: {webhook['id']}")
        print(f"  Status: {webhook['active']}")
    elif response.status_code == 422:
        # Webhook already exists
        print("⚠️ Webhook already exists. Update it instead.")
        # List existing webhooks and update
        list_response = requests.get(url, headers=headers)
        for hook in list_response.json():
            if hook["config"]["url"] == WEBHOOK_URL:
                print(f"  Found existing webhook ID: {hook['id']}")
                break
    else:
        print(f"❌ Failed: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    if not GITHUB_TOKEN:
        print("Error: Set GITHUB_TOKEN environment variable")
        print("  export GITHUB_TOKEN=your_pat_here")
        exit(1)
    register_webhook()

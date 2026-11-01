"""Checks the LinkedIn connection WITHOUT posting anything.
OK      -> prints the connected name.
Problem -> opens (once) a GitHub issue telling you to renew the LinkedIn token."""
import os
import sys

import requests

from articles import gh

TITLE = "Action needed: renew the LinkedIn connection"
HOW = ("LinkedIn sharing has stopped working (the access token is missing or has expired; they last about 60 days).\n\n"
       "**Fix (5 minutes):**\n"
       "1. Open https://www.linkedin.com/developers/tools/oauth/token-generator while logged in as Ajay.\n"
       "2. Choose the app, tick `openid`, `profile` and `w_member_social`, approve, then **Copy token**.\n"
       "3. In this repository: **Settings → Secrets and variables → Actions → LINKEDIN_ACCESS_TOKEN → Update**, paste, save.\n\n"
       "Articles keep publishing on the website meanwhile; only LinkedIn sharing pauses.")


def open_issue_once(reason):
    existing = gh("issue", "list", "--state", "open", "--search", f"in:title \"{TITLE}\"", "--json", "number", "--jq", "length")
    if existing.strip() in ("", "0"):
        gh("issue", "create", "--title", TITLE, "--body", f"{HOW}\n\nDetail: {reason}")


def main():
    token = os.environ.get("LINKEDIN_ACCESS_TOKEN")
    if not token:
        print("No LinkedIn token saved yet.")
        open_issue_once("no token saved")
        sys.exit(1)
    r = requests.get("https://api.linkedin.com/v2/userinfo", headers={"Authorization": f"Bearer {token}"}, timeout=30)
    if r.status_code != 200:
        print(f"LinkedIn rejected the token: {r.status_code}")
        open_issue_once(f"LinkedIn answered {r.status_code}")
        sys.exit(1)
    print(f"LinkedIn connected as: {r.json().get('name', 'unknown')}")


if __name__ == "__main__":
    main()

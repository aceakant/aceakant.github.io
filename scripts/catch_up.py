"""Self-healing schedule. GitHub's scheduler sometimes delays or drops runs (Monday mornings especially).
The publish job runs this every time it wakes up, and starts anything that should already have run today:
  - Monday's weekly article (after 03:20 UTC), if no draft was made today and none is running
  - Monday's LinkedIn connection check (after 03:00 UTC)
  - the daily Pulse numbers (after 01:20 UTC)
Each is started at most a few times a day, so a real failure can't loop."""
import datetime
import json
import os
import subprocess

from articles import gh

REPO = os.environ.get("GITHUB_REPOSITORY", "aceakant/aceakant.github.io")
ACTIVE = {"queued", "in_progress", "waiting", "pending", "requested"}


def runs_today(workflow, day):
    out = gh("api", f"repos/{REPO}/actions/workflows/{workflow}/runs?created=>={day}T00:00:00Z&per_page=30")
    return json.loads(out).get("workflow_runs", [])


def start(workflow, why):
    gh("workflow", "run", workflow)
    print(f"Started {workflow}: {why}")


def main():
    now = datetime.datetime.now(datetime.timezone.utc)
    day = now.date().isoformat()
    minutes = now.hour * 60 + now.minute

    if minutes >= 80:  # Pulse numbers, daily after 01:20 UTC
        r = runs_today("pulse.yml", day)
        if not r:
            start("pulse.yml", "the morning Pulse refresh hadn't run today")

    if now.weekday() == 0 and minutes >= 180:  # Monday LinkedIn check, after 03:00 UTC
        if not runs_today("linkedin-check.yml", day):
            start("linkedin-check.yml", "Monday's LinkedIn check hadn't run")

    if now.weekday() == 0 and minutes >= 200:  # Monday weekly article, after 03:20 UTC
        drafted = subprocess.run(["git", "log", f"--since={day}T00:00:00Z", "--grep=^Draft:", "--format=%h"],
                                 capture_output=True, text=True).stdout.strip()
        r = runs_today("weekly.yml", day)
        if drafted:
            print("Weekly article: today's draft exists.")
        elif any(x.get("status") in ACTIVE for x in r):
            print("Weekly article: a run is already under way.")
        elif len([x for x in r if x.get("event") == "workflow_dispatch"]) >= 2:
            print("::warning::Weekly article: two catch-up runs already tried today; leaving it for a person to look at.")
        else:
            start("weekly.yml", "Monday's article hadn't been drafted (scheduled run delayed or dropped)")


if __name__ == "__main__":
    main()

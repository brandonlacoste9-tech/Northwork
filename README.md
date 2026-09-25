# Northernwork

Northernwork is a freelance marketplace for clients and freelancers in Canada. The public site is [northernwork.com](https://northernwork.com).

Rates are in CAD. Profiles name a Canadian city and province. Remote work on the job board means remote inside Canada.

This repository is a working preview. Talent, profiles, and open projects use sample data in the browser. Posting a project adds it to the job list on this device. There is no account system, database, payment flow, or messaging.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To choose a host and port:

```bash
npm run dev -- --hostname 0.0.0.0 --port 43127
```

## What you can do

- Read how Northernwork works for clients and for freelancers.
- Browse talent and filter by province, skill, and CAD hourly rate. Search by name or skill.
- Open a freelancer profile and send an invite. The confirmation stays on your device.
- Browse open projects and open a project.
- Post a project. Empty fields are rejected. A valid project shows up on the job board immediately.

The talent and job directories pause briefly while they load. If a search matches nothing, the page shows an empty state. Add `?error=1` to `/talent` or `/jobs` to see the error state, then use Retry.

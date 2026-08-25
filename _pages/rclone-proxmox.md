---
permalink: /rclone-proxmox/
title: "rclone-proxmox"
---

{% include base_path %}

**rclone-proxmox** is a personal automation tool that backs up my own Google Drive accounts (and other personal cloud storage) to a local server that I own, using the open-source tool [rclone](https://rclone.org).

### What it does

* Reads files and folder metadata from the Google Drive accounts I explicitly authorize, via the Google Drive API.
* Copies that content to local storage on my personal server, on a scheduled basis, to keep an offline backup.
* Does not modify, delete, or share the contents of any authorized Google Drive account.
* Is not distributed to, or used by, any third party — this is a private tool for my own personal backups, not a public product.

### Data access and privacy

Full details on what data this application accesses and how it's handled are in the [Privacy Policy](/rclone-proxmox/terms/).

### Revoking access

Access can be revoked at any time via [Google Account permissions](https://myaccount.google.com/permissions).

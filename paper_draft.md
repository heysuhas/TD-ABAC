# TD-ABAC Paper Draft (Early Notes)

## Abstract (Placeholder)
This document is a living draft for the TD-ABAC paper. Sections will be expanded as results mature.

## Security/Privacy Properties
* **Time-Limited Access Enforcement:** On-chain time-locks gate key release via the backend.
* **Encrypted Storage:** Files remain encrypted at rest and are decrypted only during valid access windows.
* **Client-Side Capture Limitation:** Browser-based viewing cannot fully prevent screenshots, downloads, or out-of-band recording once content is displayed. Mitigations include **per-session watermarking**, **short-lived view tokens**, **audit logs**, and optional **DRM-like browser controls** (where supported), but absolute prevention is not possible.

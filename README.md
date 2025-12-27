# Binam — Campus Lost & Found Platform

Binam is a lost-and-found service designed as a modern alternative to the common “found & lost” Telegram groups. Instead of scrolling through chat history, users can browse a **campus map** with location pins and quickly find lost/found items by **place, tags, and search**. :contentReference[oaicite:0]{index=0}

This repository is the public course/project repo for **System Analysis & Design** and is intended for both **academic evaluation** and future product use.

---

## Team

**Team name:** Binam  
**Members:**
- Amir Mohammad Mahfoozi
- Kasra Azizzade
- Amir Ardalan Dehghanpour
- Amirhosein Naghdali
- Alireza Sohrabi

---

## What we are building (short overview)

The system provides a map-first experience where the campus is divided into meaningful locations (pinpoints). Users can register a **lost** or **found** item (with description + image) and attach it to a location. Each item has its own page with comments so people can communicate directly and resolve cases faster. :contentReference[oaicite:1]{index=1}

---

## Core features

### Map-based browsing
- Location **pinpoints** that summarize recent lost/found activity (e.g., counters per area). :contentReference[oaicite:2]{index=2}  
- Items displayed on the map with **different visual status** (lost vs found). :contentReference[oaicite:3]{index=3}  
- **Search and filtering** by location scope + text search in title/description. :contentReference[oaicite:4]{index=4}  
- Create a new item directly from the map (e.g., long press / “add new item” at a location). :contentReference[oaicite:5]{index=5}  
- (Optional/Bonus) Map usability improvements like zoom-based pin splitting (similar to clustering behavior), offline cached view, and “my current location”. :contentReference[oaicite:6]{index=6}  

### Item pages + communication
- Each item has a dedicated page with full details (image, description, location, status).
- Threaded discussion via **comments and replies**. :contentReference[oaicite:7]{index=7}  

### Authentication & access control
- Guests can view the map and items without signing in.
- Posting, commenting, and managing one’s content requires authentication. :contentReference[oaicite:8]{index=8}  
- Signup uses **email + OTP verification**, then the user sets a password.
- Login is email + password (OTP is only for signup/email verification). :contentReference[oaicite:9]{index=9}  
- Users can edit/delete **only** the content they created. :contentReference[oaicite:10]{index=10}  

### Moderation / reporting
- Users can report inappropriate posts/comments (report stores reporter id, target id, reason).
- If reports exceed a threshold (e.g., **more than 5**), the content is automatically removed. :contentReference[oaicite:11]{index=11}  

### Tagging + filtering
- Items must have at least one tag from a predefined list (e.g., bag, clothing, electronics, bank card, student card, etc.).
- Filtering supports tags + text search. :contentReference[oaicite:12]{index=12}  

### Chatbot assistant (search helper)
- Users can describe a lost item in a short message.
- The system finds relevant posts and returns matches + links to item pages.  
- The detailed model/architecture is chosen by the team. :contentReference[oaicite:13]{index=13}  


> This layout is a suggestion and may evolve as development progresses.


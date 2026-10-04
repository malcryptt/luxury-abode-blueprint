# Firebase setup (WSL Realty)

Everything here works on free plans with **no card**: Firebase Spark (sign-in and database), Cloudinary free (photos) and Vercel free (the team-cleanup service).

- **Firebase Authentication**: staff sign-in
- **Firestore**: page text, projects, enquiries, team
- **Cloudinary**: photo uploads
- **Vercel serverless function** (`api/remove-member.js`): deletes a person's login when you remove them

## 1. Firebase project (already created: `wsl-realty-c65fb`)
1. **Authentication → Sign-in method → Email/Password → Enable.**
2. **Firestore Database → Create database → production mode.**
3. The web config is already in `.env`. Add the same `VITE_FIREBASE_*` values in Vercel → Project → Settings → Environment Variables, then redeploy.

## 2. Publish the security rules
Firestore → **Rules** tab → paste the contents of `firestore.rules` → **Publish**.

## 3. Create the first admin
1. **Authentication → Users → Add user** (your email and a password). Copy the **User UID**.
2. **Firestore → Start collection** → Collection ID `staff` → Document ID = that UID, with fields:
   - `email` (string): your email
   - `role` (string): `admin`
3. Sign in at `/auth`. On the dashboard click **Set up Arya Luxe** once.
4. Add everyone else from **Admin → Team**. This creates their Firebase login automatically.

## 4. Photo uploads (Cloudinary, free)
1. Sign up at cloudinary.com (email only). On the dashboard, copy your **Cloud name**.
2. **Settings → Upload → Upload presets → Add upload preset**: Signing mode **Unsigned**, folder `wsl-realty`, allowed formats `jpg,png,webp,avif`. Save and copy the preset name.
3. Put both in `.env` and in Vercel environment variables, then redeploy:
```
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-preset-name
```

## 5. Removing a team member also deletes their login (optional but recommended)
Without this, **Remove** still cuts off access instantly, but the person's login stays in Firebase (harmless, it can do nothing).
1. Firebase console → ⚙ Project settings → **Service accounts** → **Generate new private key**. A `.json` file downloads. **Keep it private; never put it in the repo.**
2. Vercel → Project → Settings → Environment Variables → add `FIREBASE_SERVICE_ACCOUNT` with the **entire contents** of that file. Redeploy.

## 6. Check it works
- Signed out, open `/admin` → you are sent to `/auth`.
- Send a test enquiry from `/contact` → it appears in **Admin → Enquiries**.
- Sign in as an Editor → no **Team** link, no **Delete** on enquiries.
- Add a test person in **Admin → Team**, confirm they appear in Authentication → Users, remove them, confirm they disappear from both lists.
- Upload a photo on **Admin → Projects** → it shows in the preview.
- Open the site in a private window → Arya Luxe progress shows; hidden updates do not.

## Customer accounts and the inbox

Anyone can create a customer account at `/auth` ("Create an account"). Team accounts are still created by an admin under Team, and team members land on `/admin` after signing in; everyone else lands on `/inbox`.

- An enquiry sent while signed in carries the customer's account id, so they can follow it in their inbox: sent time, **Seen** (with the time the team first opened it), and the team's replies.
- Opening an enquiry in Admin → Enquiries marks it seen and shows the conversation. Replies go to the customer's inbox. Enquiries from visitors who were not signed in have no inbox: reply by phone, WhatsApp or email.
- After pulling this change, **republish `firestore.rules`** (Firestore → Rules → paste → Publish). It adds the customer read rule and the `messages` sub-collection.

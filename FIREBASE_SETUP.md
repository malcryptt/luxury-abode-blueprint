# Firebase setup (WSL Realty)

The site uses Firebase: **Authentication** (staff sign-in), **Firestore** (page text, projects, enquiries, team) and **Storage** (photos).

## 1. Create the project
1. console.firebase.google.com → **Add project** (Analytics off).
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database → production mode.** Pick the region carefully; it cannot be changed (europe-west2 London or africa-south1 Johannesburg).
4. **Build → Storage → Get started** (needs the Blaze plan; the free quota is more than this site uses). Skip this step if you do not need photo uploads yet.
5. **Project settings → Your apps → Web (`</>`)** → register an app and copy the config.

## 2. Add the config to the site
The values are already in `.env` for this project. If you ever change project, update them there (and in Vercel → Project → Settings → Environment Variables, then redeploy):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```
These are public identifiers, not secrets. The security rules are what protect the data.

## 3. Publish the security rules
- Firestore → **Rules** tab → paste the contents of `firestore.rules` → **Publish**.
- Storage → **Rules** tab → paste `storage.rules` → **Publish** (accept the prompt to let Storage read Firestore).

## 4. Create the first admin
1. **Authentication → Users → Add user** (your email and a password). Copy the **User UID**.
2. **Firestore → Start collection** → Collection ID `staff` → Document ID = that UID, with fields:
   - `email` (string): your email
   - `role` (string): `admin`
3. Sign in at `/auth`. On the dashboard click **Set up Arya Luxe** once.
4. Add everyone else from **Admin → Team**.

## 5. Deploy the cleanup function (so removing someone also deletes their login)
Adding a person creates their Firebase login automatically. Removing them deletes the staff record automatically, but only a server can delete a login, so this one small function does it. It needs the Blaze plan (the same one Storage needs).

On any computer with Node installed, from this project folder:
```
npm install -g firebase-tools
firebase login
cd functions && npm install && cd ..
firebase deploy --only functions --project wsl-realty-c65fb
```
Until it is deployed, **Remove** still revokes access instantly and tells you the login was left in Firebase.

## 6. Check it works (2 minutes)
- Signed out, open `/admin` → you are sent to `/auth`.
- Send a test enquiry from `/contact` → it appears in **Admin → Enquiries**.
- Sign in as an Editor → no **Team** link, no **Delete** on enquiries.
- Add a test person in **Admin → Team**, confirm they appear in Authentication → Users, remove them, confirm they disappear from both.
- Open the site in a private window → Arya Luxe progress shows; hidden updates do not.

# Postman

API requests for checking the app by hand, and for anyone who clones the repo.

## Files
- `lumiere.postman_collection.json`: all requests, one folder per feature (MVP order), in the order to run them.
- `local.postman_environment.json`: `baseUrl` for your machine (`http://localhost:3002`).

## Use it
1. Start the database and the server (`docker compose up -d`, then `npm run dev` in `server/`).
2. In Postman: **Import** both files. Pick the environment "Local" (top right).
3. Set the current values of `demoEmail`, `demoPassword`, `adminEmail` and `adminPassword` (collection variables) to the demo user and the admin from your `server/.env`. Do not save real values into the initial value: it is exported with the file.
4. Run a folder from top to bottom, or use the **Collection Runner** to run it in one go. Each request has a test that checks the status code.

**Importing the collection again clears the current values** of its variables (`demoEmail`, `demoPassword`, `adminEmail`, `adminPassword`). Set them again after every import. The two "Login: the demo customer / the admin" requests do not send when a variable is empty; they stop with a message that names it.

**Sign-in limits:** 10 failed tries per 15 minutes per IP, and per email (a 400 counts as a failed try). The "Accounts" folder fails on purpose 2 times per run, so about 5 runs in 15 minutes lock you out with `429`. The counters live in the server's memory: restart the server (`npm run dev` in `server/`) to reset them, or wait.

**Cart folder:** run it from top to bottom. The first three requests pick two products that are in stock and save their variant ids. "Register a shopper for the bag" creates a new customer every run (register is limited to 10 per hour per IP) and signs in as them, so it replaces the cookie from earlier folders. The folder ends signed out.

**Orders folder:** run it from top to bottom. It registers two new customers (register is limited to 10 per hour per IP, and the Cart folder registers one more), buys one item with the first, and checks the second cannot see that order. It really places an order: it takes 2 units of stock from one product in your dev database and leaves two `postman-...@example.com` customers behind. It ends signed out.

**Reviews folder:** run it from top to bottom. It signs in as the demo customer (set `demoEmail` and `demoPassword` first), who has the seed's `delivered` order, and writes, changes and deletes one review of a product from that order. It deletes any earlier review of that product first and ends by deleting its own, so the shown rating ends where it started. It ends signed out.

**Admin folder:** run it from top to bottom (50 requests; set `adminEmail` and `adminPassword` first). It registers one new customer, who buys two orders; the admin ships and delivers one, cancels the other (checking the stock came back), deletes a spam review of the delivered one, and creates, edits and hides a product. It really changes your dev database: it takes 3 units of stock from one product (2 come back when order B is cancelled), leaves one hidden `postman-dress-...` product, two orders and one customer behind. It signs in and out several times and ends signed out.

Cookies: the sign-in request sets the `token` cookie. Postman keeps it for later requests to `localhost:3002`, so run sign in first. To start over, delete the cookie in Postman's **Cookies** window.

## Rules (for Claude and for you)
- One folder per feature, named like the feature in `product-spec.md`.
- Use `{{baseUrl}}` and variables. Never put real passwords, tokens or secrets in these files.
- Main flow first, then the error cases.
- Every request has a description and a status-code test.
- Update the collection in the same branch as the endpoint change.

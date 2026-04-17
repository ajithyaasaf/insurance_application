We are facing persistent cookie issues due to cross-site setup (pages.dev + trycloudflare), and even after fixes, cookies are not being stored reliably.

So we’ve decided to switch authentication strategy from cookies to JWT using Authorization headers (standard approach when no domain is available).

Please make the following changes:

1. Login API:

* Remove res.cookie usage
* Return accessToken in JSON response:
  res.json({ accessToken: token, user })

2. Auth middleware:

* Stop reading from req.cookies
* Instead read from Authorization header:
  const authHeader = req.headers.authorization
  const token = authHeader?.split(" ")[1]

3. Remove refresh token cookie logic (not needed for now)

4. Keep JWT verification same

This will allow frontend to store token in localStorage and send via Authorization header, avoiding cross-site cookie issues.

Let me know once pushed — I’ll pull and deploy on VM.

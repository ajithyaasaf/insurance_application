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

need to solved


*need to chart view in reports page
*in leads page open lead word is not understandable
*need whats app integration but plan well for this (whover get expired in 3 days)
*when creating policy my client need to mention fresh or renewal in the new policy form itself becuase in this application we are gogint o enter old customers 
*in reports also Fresh are renewal stats should be needed to see fresh how many and renewal how many like that 
*in the reports page renel currently based on new then if we renwal but we now gogint to add fresh or renewal in the policy creating form itself so need to carefuly in the chart itself

* dealrs performance in reports page can be enhanced 
* in the reports page filters in every tab in every filtered deatures need to be check to make sure is that actually filtered out or not 
* since we removed active expiry in the policy creation form we need to know how it handled when we download reports in the reports page 
* in reports page pdf is not optimized
* in payment page when we create payment we selct customer and policy need to fetch premium amount in the amount field not editable 
* in payment page based on policy no or vehicle number filter out needed
* in the leads creation form we have quote part you can see in the form whe creating in that part all show as mandotory is that really mandatory?
* since we have dat of registration in the policy creation form we dont need model field

* another thisn it may need in both lead creation forma nd policy creation form since it both used shared field i think you understand it is because
now after this application launch my cleint will enterhis existing customer previous year cutomer whos insurance is still active in that time currenntly we handle NCB as yes if no claims which is working good 
and perfect now when we create leads and policy lie said when he enter his old customer some how if that customer claimed ncp already before this application so i think  we can add one files select ncp as yes or no if yes another filed open to enter how much percentatge valus or 20%,25%,35%,45% this is what i think but you can tell me  the better idea if you have 

* Ncp based , claim based filter needed in the policy page and chart needed in the reports page 

* assume some one do policy in previous company and we enter his details we need to create ncp selection right? because he can have the ncb from previous company right? (less important)

* need to ask client is one he made the claim what happen in his next renwal do we reverse the ncb status or not 

* in payment page can we maintain two different payment ? like current one have the feature of track payment of one specific policy payment can we implement some random payments?

* when we create payment we have the option now seelct based on customer and his policy is success fully fetched client also like to include based on vehicle number and policy no based fetching because he said some time in same name may be multiple clients


* in reports page there is active company i dont know what it is for ?

* in policy creation form is no of years really needed ?

* need to collect DOB for customer and send remainder for them in their Birthday features need to be planed 

* change 
cvp -> pcv
ccp -> cpm 
(need to check in laptop)

* in the pdf genration in commision page we have to implement indiiual history to be able to downloaded in pdf format and in that pdf 
need to inclde brand name inusrance and adress like a format
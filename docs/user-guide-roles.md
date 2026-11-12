# Skylar: Step-by-Step Guide for Managers, HR Advisors and Super Admins

Last updated: 2026-11-10. Written from the current code on `main`. Screen labels are the ones in the app. Where a detail depends on settings or live data, it says so.

## 1. Who does what

| Role | Who they are | Where they work | Can do |
|---|---|---|---|
| **Manager** (workspace admin) | The customer: a founder or small-company leader who owns a workspace | `/briefing`, `/people`, `/notes`, `/documents`, `/advisor`, `/billing`, `/settings` | Work through employee situations, save notes, ask Skylar AI, escalate to a human, invite teammates, manage billing |
| **Employee** | A person invited into a workspace with no admin rights | Same app, fewer screens | Use their own view and chat; cannot change records, billing or settings |
| **HR advisor** | A Skylar HR professional, added by a super admin | `/advisor/desk` | Read and answer escalated chats from every workspace. Nothing else on the platform |
| **Super admin** | Skylar staff running the platform | `/platform` | Manage workspaces, users, HR advisors, pricing, trial and advisor hours, and see the audit log. Can also work the advisor desk |

Everyone signs in the same way: enter a work email and open the sign-in link sent to it. There are no passwords. Pages a role isn't allowed to see return "not found" rather than an error.

---

## 2. Manager guide

### 2.1 Create your workspace (first time only)
1. Open the site and choose **Try Skylar for 14 days** (or go to `/signup`).
2. Enter your **workspace name** and **work email**, then choose **Get started**.
3. Open the verification link Skylar emails you. You become the workspace's first admin.
4. You land in the app. The 14-day free trial starts when the workspace is created. No credit card is needed.

### 2.2 Add your people
1. Open **People** and choose **Add person**.
2. Fill in the employee's details and save. Each person gets an **employee file** that holds their notes, history and conversations.
3. Open a person to see their profile, history and next steps. You can edit the profile from there.

### 2.3 Work through a situation with Skylar AI
1. Open an employee (or start from the briefing) and open the **Assistant**.
2. Describe what is happening in your own words. Skylar AI sees that person's saved notes.
3. Work through the facts. Skylar suggests an approach, talking points and a record to review before you use it.
4. Review everything before acting. Skylar AI drafts; you decide.
5. Save what matters as a note so the next conversation starts with context.

### 2.4 Use the daily briefing
1. Open **Briefing**. Skylar orders your open items and shows them as cards, most important first.
2. Each card has a focus line, a short **conversation guide** (usually three steps) and a "keep in mind" box.
3. Use the card's buttons: **Assistant** (talk it through), **Open note**, **Open profile**.
4. Choose the arrow to go to the next card, or **Not now** to leave a card for later. Cards you postpone are kept under **Deferred**.
5. The **What's ahead** list on the right shows what is coming and how urgent it is.

### 2.5 Save a note
1. Choose **New note** (or **Open note** from a card), pick the employee, write the note and save.
2. Keep it factual. Notes are saved to the employee's file and used the next time you or Skylar open it.
3. Attach supporting files from the note or the **Documents** page (**Attach file**).

### 2.6 Get a human HR professional
There are three ways a chat reaches a person.
1. **You ask.** Say it in the chat, for example "I want to talk to an HR advisor", or use the advisor button ("Connect me to an HR advisor"). This uses one of your **escalation allowance**.
2. **Skylar offers.** If a message might need a person, Skylar answers and shows a **Connect me to an HR advisor** button. Choose it only if you want to.
3. **Skylar detects a high-risk matter** such as harassment, discrimination, retaliation, protected leave, termination risk, workplace violence or a wage or legal dispute. This always goes to a person, even if your allowance is used up, and still counts toward it. Skylar AI does not give advice on that matter.

You can also use **Hold to escalate** on an employee's brief.

What you see:
1. A fixed message says the chat is being transferred to an HR advisor and how long it may take. During advisor working hours this is **up to an hour**. Outside them it is **up to 6 hours**. You can close the app and you are notified when the advisor responds.
2. The chat shows **Waiting for a Skylar Advisor**, then **Connected with <name>**.
3. Chat with the advisor in the same window. While a person owns the chat, Skylar AI stays silent.
4. When the advisor closes it, the chat shows **Chat closed**. To discuss something new, start a new chat.
5. The advisor's work is saved to the employee's file.

If you have no employee selected, Skylar asks you to pick one so the case can be created.

### 2.7 See your HR chats
1. Open **Advisor** to see every HR chat for your workspace, with search by name or case.
2. Open one to read the chat and the **related notes on file**. This view is for reading your own workspace's cases.

### 2.8 Invite your team
1. Open **Settings**, then the **Team** tab.
2. Enter the teammate's email, choose their **workspace role** (admin or employee) and send the invite. You can cancel a pending invite.
3. They open the emailed link and sign in. Anyone can be invited; there is no email-domain restriction.
4. Change or review roles in the same place. Teammates never need to contact Skylar to be added.

### 2.9 Trial, billing and upgrading
1. Open **Billing**. It shows your plan, status, advisor messages and **human escalations left**.
2. **Trial (14 days):** unlimited chat with Skylar AI (when the platform's Free limit is cleared) and **one** free escalation to a human.
3. When the trial ends, chat asks you to upgrade. Your records stay viewable.
4. To upgrade, choose the upgrade button on **Billing** and complete Stripe Checkout. Professional is **$149/month**, billed monthly, cancel any time.
5. **Professional:** unlimited AI chat and **3 human escalations per month** (renews each calendar month, UTC).
6. Use the billing portal to change your card, see invoices or cancel.

### 2.10 Other things you can do
- **Print or export** an employee file as a PDF from the employee's page.
- **Recently deleted** (a link in the app) restores people, notes or files you removed by mistake, for a limited time.
- **Documents** lists everything attached to a record, searchable.

---

## 3. Employee guide (short)
1. Accept the invite email and sign in with the emailed link.
2. Open your own view. You can chat with Skylar about your own situation. These chats are not saved to history and do not escalate.
3. **Settings** shows your name, email and when the account was created. You cannot change records, billing or team settings.

---

## 4. HR advisor guide

### 4.1 Get access
1. A super admin adds your email under **Platform > Users > HR advisors**. You can be added before you have signed in.
2. Sign in with your email link. You are taken to the advisor desk. Your access is checked on every page load, so a removal applies right away.

### 4.2 Work a case (the advisor desk, `/advisor/desk`)
1. **New cases arrive by email** to every advisor, and appear in the queue. Use the **case filter** to see waiting, live or closed cases.
2. Open a case to read the whole thing: what the manager wrote, the AI transcript, the employee's related notes and why it was escalated (rule, classifier or the manager's request).
3. Choose **Claim**. The first advisor to claim wins; others see who has it. Reading is open to every advisor, but **replying needs you to own the case**.
4. Reply in the chat box and send. The manager sees you as connected. While the case is live, Skylar AI does not answer.
5. Other actions:
   - **Take over**: take a live case from another advisor (for example at a shift change).
   - **Release**: put it back in the queue.
   - **Resolve**: close it, with an optional note.
   - **Close unclaimed**: close a duplicate or spam case nobody claimed.
   - **False alarm**: mark on resolve when it didn't need a person. Skylar uses these to tune detection.
6. A resolved chat is saved to the employee's file.

### 4.3 Response times and hours
- Working hours are set by a super admin (time zone, start and end hour, working days). Inside them the manager is told to expect a reply within about an hour; outside them, within about 6 hours.
- Watch the waiting indicator: a manager is waiting for a reply until you answer.

---

## 5. Super admin guide

Open **Platform** (`/platform`). The sections are Overview, Workspaces, Users, Pricing and Audit.

### 5.1 Overview
Shows active workspaces, paid workspaces, estimated monthly revenue, user accounts, employee files, records saved and advisor escalations. **Needs attention** lists workspaces with open cases and free workspaces that have used their allowance. Use the range controls to change the period.

### 5.2 Workspaces
1. Open **Workspaces**, search or open one.
2. The workspace page shows its billing, user accounts, employee files, records, escalations and recent activity.
3. **Admin actions** (every action is logged with your email):
   - **Suspend workspace**: blocks everyone from signing in. Data is kept. **Restore access** undoes it.
   - **Gift access**: give paid access for a set number of days and messages. When it runs out the workspace returns to its normal plan.
   - **Delete workspace**: soft delete, recoverable for 30 days (**Restore workspace**). **Delete now** removes it permanently and cannot be undone.

### 5.3 Users
1. **Users** lists accounts across workspaces. Per account you can **Suspend account**, **Restore account** or **Delete account**.
2. **Super admins**: add an email to give platform access, or remove it. Access applies when that person signs up or in.
3. **HR advisors**: add an email to let that person work the advisor desk, or **Remove HR advisor**. Access applies once they sign in.

### 5.4 Pricing
1. Open **Pricing**. There are two kinds of package: **Free** (the trial) and paid packages.
2. **Professional**: set the price (currently **$149/month**) and save. Saving creates a new Stripe price and retires the old one. Existing subscribers stay on the price they signed up at. Check that the save reports the Stripe sync as done.
3. **Free**: the "advisor messages" field is the trial's chat limit. **Leave it blank for unlimited chat during the trial**, or enter a number.
4. You can publish or unpublish a package, change its name, description and features, and archive a package (it is hidden from new customers).

### 5.5 HR advisor hours and free trial
1. In Platform, open **HR advisor hours and free trial**.
2. Set the **time zone** (for example America/New_York), the **start and end hour** and the **working days**. This decides whether managers are told "up to an hour" or "up to 6 hours".
3. Set the **free trial length in days** (14 by default; 0 means no time limit).

### 5.6 Audit log
Open **Audit** to see who did what and when: package changes, workspace suspensions, gifts, deletions and user changes, with the actor's email and the reason.

---

## 6. Limits at a glance

| | Trial (free) | Professional ($149/month) |
|---|---|---|
| Length | 14 days from workspace creation (set by super admin) | Monthly, cancel any time |
| Skylar AI chat | Unlimited when the Free limit is blank; otherwise a set number of messages | Unlimited |
| Human HR escalations | 1, for the whole trial | 3 per calendar month |
| High-risk matters Skylar detects | Always sent to a person, still counted | Always sent to a person, still counted |
| After it ends | Chat blocked until upgrade; records stay viewable | If payment fails, Stripe retries; a failed subscription falls back to the trial rules |

## 7. Common questions

**Why did my chat not go to a person even though I asked?** Your allowance is used up. A trial gets one; Professional gets three a month. Upgrade, or wait for next month. A high-risk matter still goes through.

**Why does the chat say I'm out of messages?** The trial has ended or the Free limit is set to a number. A super admin can clear the Free limit for unlimited trial chat.

**A teammate can't sign in.** Check they used the invited email, the invite hasn't been cancelled, and the workspace isn't suspended. Look in **Settings > Team**.

**I deleted something by mistake.** Open **Recently deleted** and restore it.

**The price on the site doesn't match checkout.** A super admin must save the Professional package in **Platform > Pricing** so the Stripe price is updated.

## 8. Not covered or still open
- Whether the paid escalation allowance stays at 3 per month is still being confirmed with the client.
- Photos, a mobile layout review and the privacy policy wording are still open.
- Payments should be tested in a Stripe sandbox before real payments are switched on.

// Training content and phishing templates for Aqua (original content written for ISMT College).
const modules = [
  {
    title: 'Spotting Phishing Emails', minutes: 5,
    summary: 'Learn the five signals that give a phishing email away, and what to do when you see one.',
    lessons: [
      { heading: 'Check the sender, not just the name', text: 'Anyone can set a display name such as "IT Support". Look at the full address. A message from it-helpdesk@ismt-college-support.com is not from ismt.edu.np, even though it looks close.' },
      { heading: 'Urgency is a pressure tactic', text: 'Phrases like "act within 24 hours" or "account will be closed" are designed to stop you thinking. Real IT teams rarely threaten you by email.' },
      { heading: 'Hover before you click', text: 'Hover over a link to preview where it really goes. If the address does not match what the email claims, do not click.' },
      { heading: 'Report, do not delete', text: 'Use the Report as phishing button. Reporting helps the IT team protect everyone else, and it counts in your Aqua risk score.' },
    ],
    questions: [
      { text: 'An email from "IT Support" asks you to verify your mailbox within 24 hours. What is the safest first step?', options: ['Click the link quickly so the account is not closed', 'Check the full sender address and hover over the link', 'Reply with your password so IT can check it', 'Forward it to all your colleagues as a warning'], correct: 1, explanation: 'Checking the real sender address and the link destination costs ten seconds and exposes most phishing attempts.' },
      { text: 'Which of these is the strongest warning sign?', options: ['The email has a college logo', 'The email greets you by your first name', 'The sender domain is slightly different from the real one', 'The email arrived in the morning'], correct: 2, explanation: 'Look-alike domains are the most common trick. Logos and names are easy to copy.' },
      { text: 'You are fairly sure an email is phishing. What should you do?', options: ['Delete it and say nothing', 'Report it using the Report as phishing button', 'Click the link to see if it is real', 'Reply asking if it is genuine'], correct: 1, explanation: 'Reporting alerts IT so they can block the sender and warn others.' },
    ],
  },
  {
    title: 'Strong Passwords and MFA', minutes: 5,
    summary: 'Build passwords that resist guessing and turn on multi-factor authentication.',
    lessons: [
      { heading: 'Length beats complexity', text: 'A passphrase of four unrelated words ("river-lamp-cedar-ninety") is stronger and easier to remember than "P@ssw0rd1!".' },
      { heading: 'One password per account', text: 'When one site is breached, attackers try the same password everywhere. A password manager removes the need to remember them all.' },
      { heading: 'Turn on MFA', text: 'Multi-factor authentication adds a second check, such as a code on your phone. Even a stolen password then fails on its own.' },
      { heading: 'Never share codes', text: 'No genuine support agent will ever ask for your one-time code. Anyone who does is attacking your account.' },
    ],
    questions: [
      { text: 'Which password is the strongest?', options: ['Ismt@2026', 'river-lamp-cedar-ninety', 'Password123!', 'Qwerty1!'], correct: 1, explanation: 'Long, unrelated-word passphrases are hard to guess and easy to remember.' },
      { text: 'Why use a different password for every account?', options: ['It looks more professional', 'A breach of one site will not unlock your other accounts', 'Websites require it by law', 'It makes logging in faster'], correct: 1, explanation: 'Credential reuse is how one small breach becomes many compromised accounts.' },
      { text: 'Someone calls claiming to be IT and asks for the code just sent to your phone. You should:', options: ['Read it out, they are IT', 'Refuse and report the call', 'Send it by email instead', 'Ask them to call back tomorrow'], correct: 1, explanation: 'Genuine IT staff never need your one-time code. This is a classic account-takeover call.' },
    ],
  },
  {
    title: 'Safe Browsing and Public Wi-Fi', minutes: 4,
    summary: 'Stay safe on open networks, with downloads and when browsing away from campus.',
    lessons: [
      { heading: 'Open Wi-Fi is shared Wi-Fi', text: 'On a cafe or airport network, other people may be able to observe unprotected traffic. Avoid logging in to college systems unless the connection is secured.' },
      { heading: 'Look for HTTPS, then look closer', text: 'The padlock only means the connection is encrypted, not that the site is trustworthy. Check the domain name too.' },
      { heading: 'Download only from trusted sources', text: 'Install software from official stores and vendor sites. "Free" cracked software is a common way to deliver malware.' },
    ],
    questions: [
      { text: 'What does the browser padlock tell you?', options: ['The site is safe and genuine', 'The connection is encrypted', 'The site has no adverts', 'The owner is verified by the college'], correct: 1, explanation: 'Phishing sites can have a padlock too. It only proves the connection is encrypted.' },
      { text: 'You must check college email at an airport. Safest option?', options: ['Use the airport open Wi-Fi', 'Use your phone hotspot or a trusted VPN', 'Use any free Wi-Fi with a strong signal', 'Wait and do not check email at all, ever'], correct: 1, explanation: 'A personal hotspot or VPN protects your traffic on a shared network.' },
      { text: 'A site offers a free cracked version of paid software. You should:', options: ['Download it, it is free', 'Download it but scan it afterwards', 'Avoid it and use the official or a free alternative', 'Share it with colleagues'], correct: 2, explanation: 'Cracked software is a leading way malware reaches computers.' },
    ],
  },
  {
    title: 'Handling Sensitive Data', minutes: 5,
    summary: 'Protect student records, exam material and staff information.',
    lessons: [
      { heading: 'Know what is sensitive', text: 'Student records, grades, exam papers, staff payroll and personal contact details all need protecting. If losing it would harm someone, treat it as sensitive.' },
      { heading: 'Share the minimum, with the right people', text: 'Send only what is needed, only to people who need it. Check the recipient before you press send, especially with auto-complete.' },
      { heading: 'Use approved storage', text: 'Keep sensitive files in college-approved storage, not personal email or USB sticks. Lock your screen when you step away.' },
    ],
    questions: [
      { text: 'You need to send a class list with student IDs to a colleague. Best approach?', options: ['Email it to your personal address first', 'Share it through approved college storage with only that colleague', 'Post it in the staff group chat', 'Print it and leave it on their desk'], correct: 1, explanation: 'Approved storage with limited access keeps the data inside controls the college can manage.' },
      { text: 'Auto-complete fills in a similar-looking external address. What should you do?', options: ['Send anyway, it is probably fine', 'Check the full recipient address before sending', 'Send it twice to be safe', 'Add everyone in the department'], correct: 1, explanation: 'Mis-sent email is one of the most common causes of data breaches.' },
      { text: 'You are leaving your desk for a short break. You should:', options: ['Leave the screen as it is', 'Lock your screen', 'Turn the monitor off only', 'Ask a colleague to watch it'], correct: 1, explanation: 'Locking takes a second and stops anyone walking by reading or using your session.' },
    ],
  },
  {
    title: 'Social Engineering and Tailgating', minutes: 4,
    summary: 'Spot manipulation by phone, message or in person, including people following you through doors.',
    lessons: [
      { heading: 'Attackers target people, not machines', text: 'Social engineering uses trust, helpfulness and authority. A confident caller or a visitor in a hi-vis jacket can be as dangerous as malware.' },
      { heading: 'Verify through a second channel', text: 'If someone asks for access or information, confirm their identity using a number or contact you already trust, not one they supply.' },
      { heading: 'Do not hold the door', text: 'Tailgating means following an authorised person through a secure door. Politely ask visitors to sign in and use their own pass.' },
    ],
    questions: [
      { text: 'A stranger in the corridor says they forgot their pass and asks you to hold the door. You should:', options: ['Hold the door, it would be rude not to', 'Politely direct them to reception to sign in', 'Let them in if they look confident', 'Give them your pass for a minute'], correct: 1, explanation: 'Reception can verify them properly. Politeness should not bypass access control.' },
      { text: 'Which is a social-engineering tactic?', options: ['A software update notification', 'A caller using urgency and authority to get information', 'A scheduled system backup', 'A printer warning'], correct: 1, explanation: 'Urgency and authority are the classic levers used to rush people into mistakes.' },
      { text: 'A caller claims to be from the college bank and wants account details. First step?', options: ['Give details to prove you are helpful', 'Hang up and call back using the official number', 'Ask them to email instead', 'Give partial details only'], correct: 1, explanation: 'Calling back on a trusted number is the dependable way to confirm who is on the line.' },
    ],
  },
  {
    title: 'USB Devices and Physical Security', minutes: 3,
    summary: 'Why an unknown USB stick is dangerous and how to keep devices and paperwork secure.',
    lessons: [
      { heading: 'Never plug in a found USB stick', text: 'Attackers leave infected drives in car parks and corridors hoping curiosity wins. Hand any found device to IT.' },
      { heading: 'Secure devices and paper', text: 'Lock laptops away, shred printed records and use a clear-desk habit so sensitive material is not left in view.' },
    ],
    questions: [
      { text: 'You find a USB stick in the car park. You should:', options: ['Plug it in to find the owner', 'Hand it to IT without plugging it in', 'Take it home and check it there', 'Leave it for someone else to find'], correct: 1, explanation: 'Unknown drives can run malware as soon as they are connected.' },
      { text: 'What is the best way to dispose of printed student records?', options: ['Put them in the recycling bin', 'Shred them', 'Leave them on the desk', 'Take them home'], correct: 1, explanation: 'Shredding stops anyone recovering personal data from waste paper.' },
    ],
  },
];

const templates = [
  {
    name: 'Mailbox storage warning', from_name: 'IT Support', from_email: 'it-helpdesk@ismt-college-support.com',
    subject: 'Action required: verify your mailbox storage limit',
    body: 'Dear User,\n\nYour mailbox has exceeded 95% of its storage limit. Click below within 24 hours to verify your account and avoid service interruption.',
    link_text: 'Verify My Account',
    red_flags: ['The sender domain (ismt-college-support.com) is not the college domain', 'Generic greeting: "Dear User"', 'Urgent 24-hour deadline to pressure you', 'Asks you to "verify" an account through a link'],
  },
  {
    name: 'Password expiry notice', from_name: 'Microsoft 365 Admin', from_email: 'no-reply@m365-secure-login.net',
    subject: 'Your password expires today',
    body: 'Your college password will expire in 2 hours. To keep access to email and Canvas, confirm your current password now.',
    link_text: 'Keep my password',
    red_flags: ['Sender domain is unrelated to Microsoft or the college', 'Real systems never ask you to confirm your current password by email', 'Extreme time pressure ("2 hours")'],
  },
  {
    name: 'Library fine invoice', from_name: 'Library Services', from_email: 'fines@ismt-library-pay.com',
    subject: 'Outstanding library fine: NPR 1,850',
    body: 'You have an unpaid library fine. Failure to pay today will block your borrowing account and may be passed to Finance.',
    link_text: 'Pay fine now',
    red_flags: ['Look-alike domain (ismt-library-pay.com)', 'Threatens consequences to rush payment', 'Asks for payment through an email link instead of the library desk'],
  },
  {
    name: 'Exam results portal', from_name: 'Examinations Office', from_email: 'results@ismt-exams-portal.org',
    subject: 'Your moderated results are ready to view',
    body: 'Moderated results have been released. Sign in with your college credentials to view them before the portal closes tonight.',
    link_text: 'View my results',
    red_flags: ['Sender domain does not match the college', 'Pressure: "portal closes tonight"', 'Asks you to enter college credentials on a linked page'],
  },
  {
    name: 'Payroll update request', from_name: 'HR Payroll', from_email: 'payroll@ismt-hr-update.com',
    subject: 'Confirm your bank details for this month\'s salary',
    body: 'Because of a system migration, we need you to re-enter your bank details to receive your salary this month.',
    link_text: 'Update bank details',
    red_flags: ['HR never collects bank details through an emailed link', 'Look-alike domain (ismt-hr-update.com)', 'Uses a plausible excuse (system migration) to justify the request'],
  },
];

module.exports = { modules, templates };

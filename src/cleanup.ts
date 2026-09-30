export type CleanupTarget = "iphone" | "android" | "wallet";

export interface CleanupPlan {
  refused: false;
  target: CleanupTarget;
  steps: string[];
}

const PLANS: Record<CleanupTarget, string[]> = {
  iphone: [
    "You tap. Nobody else holds the phone.",
    "Settings → [your name] → Devices. Remove any iPhone, iPad, or Mac you do not own.",
    "Settings → General → VPN & Device Management. Remove a configuration profile or MDM you did not install. Do not install a .mobileconfig from Mail, Files, or Safari.",
    "Settings → Apps → Safari → Extensions. Remove an extension you do not remember installing.",
    "WhatsApp → Settings → Linked devices (and the same list in iMessage and Telegram). Remove a second phone or browser you did not link.",
    "Gmail and iCloud Mail. Remove forwarding or a filter you did not set.",
    "Settings → Screen Time. Remove Screen Sharing or a remote-view app you did not turn on.",
    "Control Center → Screen Mirroring. If someone asked you to share the screen to fix a wallet, decline and hang up.",
    "Change the Apple ID password on this phone. Turn on 2FA you control. Never send the code.",
  ],
  android: [
    "You tap. Nobody else holds the phone.",
    "Settings → Google → Manage your Google Account → Security → Your devices. Remove a phone or browser you do not own. You can also open myaccount.google.com/security from this phone.",
    "Settings → Security → Device admin apps. Remove a device admin you did not grant.",
    "Settings → Accessibility. Turn off an accessibility service you did not install.",
    "Settings → Apps → Special app access. Remove display-over-apps, install-unknown-apps, or notification access you did not allow.",
    "WhatsApp → Settings → Linked devices (and Telegram). Remove a second phone you did not link.",
    "Gmail → Settings → Forwarding and POP/IMAP. Remove forwarding or a filter you did not set.",
    "Do not install an APK or a cleaner that someone sent.",
    "Change the Google password from a device you trust. Turn on 2FA you control. Never send the code.",
  ],
  wallet: [
    "Do not connect this wallet to a site that asked you to verify, claim, or fix it.",
    "Open the wallet app from the icon you installed. Do not use a link from a chat.",
    "In that app, remove connected sites and sessions you do not recognize.",
    "Revoke token approvals you do not recognize. Do that inside the wallet, or on a revoke page whose address you typed yourself.",
    "If you signed an unlimited approval or a SetAuthority you did not mean, treat that account as exposed. Create a new wallet on a device you trust and move only what you still control.",
    "Never type a seed phrase into a chat, a web form, or this server. No screen share and no helper on the call.",
  ],
};

export function cleanUpSteps(target: CleanupTarget): CleanupPlan {
  return { refused: false, target, steps: PLANS[target] };
}

export function isCleanupTarget(value: string): value is CleanupTarget {
  return value === "iphone" || value === "android" || value === "wallet";
}

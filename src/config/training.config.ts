export const trainingRoutes = {
  videos: "/training",
  faq: "/training/faq",
} as const;

export const trainingContent = {
  pageTitle: "Academy",
  pageSubtitle:
    "Click-by-click walkthroughs for NullPing Cash — start with the Dashboard intro videos, then work through the core tutorials below.",
  /** Used by global-top banner, sidebar promos, and modal-training */
  externalTrainingUrl: "https://perpetualincome365.convertri.com/7figure-everwebinar-registration#aff=DigitalAvalon&cam=membersarea",
  /** Academy platform tutorials — core NullPing workflow */
  videos: [
    {
      id: "",
      title: "Activate Your First Asset",
      description:
        "Paste a product URL or name, optionally add your affiliate link, and let NullPing build a full money page ready to publish.",
      duration: "5+ min",
    },
    {
      id: "",
      title: "Publish Your Money Page",
      description:
        "Preview the review page, pick a color theme, edit copy if you want, then publish your live affiliate money page.",
      duration: "5+ min",
    },
    {
      id: "",
      title: "Pinterest Traffic & Results",
      description:
        "Generate Pinterest pin assets that send visitors to your money page, then track real visits and clicks in Results.",
      duration: "5+ min",
    },
  ],
} as const;

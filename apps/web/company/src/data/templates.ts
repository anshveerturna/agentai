export type AgentTemplate = {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  integrations?: string[];
  source?: 'builtin' | 'zapier';
  trigger?: string; // short label e.g., "Fireflies.ai: New Meeting"
  triggerLabel?: string; // section heading label e.g., "Trigger"
  detailsMarkdown?: string; // multi-section markdown-like text describing purpose, process, role
  referenceMaterials?: string[]; // sample reference items
  actions?: string[]; // action chips e.g., ['Gmail: Create Draft']
};

export const templates: AgentTemplate[] = [
  // Built-in examples
  { id: 'website-qa', title: 'Website Q&A', icon: '🌐', description: 'Answer questions from your site content or docs.', integrations: ['🔎', '🗂️'], source: 'builtin', trigger: 'User: Question', triggerLabel: 'Question Asked', detailsMarkdown: 'Purpose\nAnswer user questions using indexed website or documentation content.\n\nGuidelines\n• Be concise.\n• Provide links to authoritative sources when possible.', actions: ['Search: Retrieve Context'], referenceMaterials: ['Documentation index','Website sitemap'] },
  { id: 'it-helpdesk', title: 'IT Helpdesk', icon: '💻', description: 'Troubleshoot issues and create/view tickets.', integrations: ['🧰', '📩'], source: 'builtin' },
  { id: 'financial-insights', title: 'Financial Insights', icon: '💰', description: 'Summarize and extract insight from financial docs.', integrations: ['📊', '🧾'], source: 'builtin' },
  { id: 'benefits', title: 'Benefits', icon: '🏥', description: 'Answer personalized benefits questions.', integrations: ['👤', '📚'], source: 'builtin' },
  { id: 'safe-travels', title: 'Safe Travels', icon: '✈️', description: 'Travel Q&A with policies and safety guidance.', integrations: ['🗺️', '🏢'], source: 'builtin' },
  { id: 'outreach', title: 'Outreach Agent', icon: '📣', description: 'Draft and send outreach messages at scale.', integrations: ['✉️', '📇'], source: 'builtin' },

  // Zapier-like items from provided screenshot (titles as visible)
  { id: 'call-follow-up-add-propo', title: 'Call Follow-Up: Add Propo...', icon: '📞', description: 'Follow-up workflow for calls (add proposal).', integrations: ['📇','📄'], source: 'zapier', trigger: 'New meeting captured', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nGenerate a concise follow-up email referencing key decisions and next steps.\n\nGuidelines\n• Keep it brief.\n• Mention proposal reference.\n• Provide clear action items.', actions: ['Email: Draft'], referenceMaterials: ['Proposal outline'] },
  { id: 'call-follow-up-email-assistant', title: 'Call Follow-Up Email Assistant', icon: '📧', description: 'Draft follow-up emails after calls.', integrations: ['📧'], source: 'zapier', trigger: 'New meeting captured', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nCreate a professional follow-up email summarizing outcomes and action items.\n\nChecklist\n• Thank participant(s).\n• Summarize key points.\n• List actions with owners.\n• Suggest next touch.', actions: ['Email: Draft'], referenceMaterials: ['Brand tone guide'] },
  { id: 'lead-gen-research-product', title: 'Lead Gen Research: Product P...', icon: '🔍', description: 'Research leads about product prospects.', integrations: ['🔎','🗂️'], source: 'zapier', trigger: 'Lead created', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nCollect quick product-fit indicators.\n\nOutput\n• Fit signals\n• Recent relevant news', actions: ['CRM: Fetch Lead','Web: Search'], referenceMaterials: ['ICP summary'] },
  { id: 'lead-gen-research-companies', title: 'Lead Gen Research: Compani...', icon: '🏢', description: 'Research company details for lead gen.', integrations: ['🧭'], source: 'zapier', trigger: 'Account created', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nSummarize company overview: industry, scale, notable tech or funding.', actions: ['CRM: Fetch Account','Web: Search'], referenceMaterials: ['Research checklist'] },
  { id: 'daily-expense-summary-email', title: 'Daily Expense Summary Email', icon: '🧾', description: 'Summarize daily expenses via email.', integrations: ['📧','📊'], source: 'zapier', trigger: 'Day closed', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nProvide daily expense totals and standout variances.', actions: ['Email: Draft'], referenceMaterials: ['Categories list'] },
  { id: 'biz-dev-call-briefer', title: 'Biz Dev Call Briefer', icon: '🗒️', description: 'Briefing for biz dev calls.', integrations: ['📆','☎️'], source: 'zapier', trigger: 'Upcoming event', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nProduce a quick pre-call brief: participants, last notes, goals.', actions: ['Calendar: Fetch Event','CRM: Fetch Notes'], referenceMaterials: ['Call prep checklist'] },
  { id: 'support-email-agent', title: 'Support Email Agent', icon: '🛟', description: 'Assist with support emails.', integrations: ['📧','🎫'], source: 'zapier', trigger: 'Ticket created', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nSuggest a concise initial reply using internal articles.', actions: ['Helpdesk: Fetch Ticket','KB: Search'], referenceMaterials: ['Tone guide'] },
  { id: 'lead-enrichment-agent', title: 'Lead Enrichment Agent', icon: '🧠', description: 'Enrich lead data automatically.', integrations: ['📊','💼'], source: 'zapier', trigger: 'Lead created', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nAdd missing firmographic & tech fields.', actions: ['Enrichment: Lookup','CRM: Update Lead'], referenceMaterials: ['Enrichment rules'] },
  { id: 'sales-prep-agent', title: 'Sales Prep Agent', icon: '📚', description: 'Prepare notes and materials for sales.', integrations: ['📅','📝'], source: 'zapier', trigger: 'Upcoming event', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nSummarize account context & open opportunities.', actions: ['CRM: Fetch Opps','Calendar: Fetch Event'], referenceMaterials: ['Prep checklist'] },
  { id: 'customer-sentiment-analysis', title: 'Customer Sentiment Analysis', icon: '😊', description: 'Analyze customer sentiment.', integrations: ['💬','📊'], source: 'zapier', trigger: 'New feedback received', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nSummarize sentiment patterns and flag anomalies.', actions: ['Feedback: Fetch','NLP: Analyze'], referenceMaterials: ['Sentiment rubric'] },
  // Placeholder for items partially visible; provide exact titles if available
  { id: 'seo-optimized-mobile-onpage', title: 'SEO Optimized Mobile Onpage...', icon: '📈', description: 'Mobile SEO on-page suggestions.', integrations: ['🔍'], source: 'zapier', trigger: 'Scan complete', triggerLabel: 'Trigger', detailsMarkdown: 'Purpose\nHighlight top mobile on-page fixes.', actions: ['Crawler: Fetch Issues'], referenceMaterials: ['SEO checklist'] },
];

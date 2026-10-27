import type { AccessRole, User, Company } from "@/lib/types";

export interface TourStep {
  element: string;
  title: string;
  description: string;
  descriptionByRole?: Partial<Record<AccessRole,string>>;
  roles?: AccessRole[];
  linked?: boolean;
  activate?: string;
  dialog?: { root:string; opener:string };
  close?: string;
  optional?: boolean;
}
export interface TourDefinition { roles?:AccessRole[]; steps:TourStep[] }
const finance:AccessRole[]=["ADMIN","CFO"];
const people:AccessRole[]=["ADMIN","CFO","HR"];
const reviewers:AccessRole[]=["ADMIN","HR","MANAGER"];
const s=(element:string,title:string,description:string,extra:Partial<TourStep>={}):TourStep => ({element,title,description,...extra});
const intro=(description:string,descriptionByRole?:Partial<Record<AccessRole,string>>) => s("page-overview","A quick look around",description,{descriptionByRole});
function form(opener:string,root:string,fields:[string,string,string][],save:string):TourStep[] {
  const roles:AccessRole[]|undefined = ({"add-role-btn":people,"add-employee-btn":people,"add-account-btn":finance,"add-tier-btn":finance,"plan-raise-btn":people,"add-pay-component":finance} as Record<string,AccessRole[]>)[opener];
  const linked=opener === "finish-work-btn";
  return fields.map(([element,title,description])=>s(element,title,description,{dialog:{opener,root},roles,linked})).concat(
    s(save,save === "raise-preview" ? "Preview before confirming" : "Save when you’re ready",save === "raise-preview"
      ? "During normal use this opens the cost preview before confirmation. The walkthrough only highlights it; Next returns to the history without creating a raise."
      : "This is the real save control. During the tour it is preview-only. Next returns to the page without submitting anything.",{dialog:{opener,root},roles,linked}));
}

export const tourConfig:Record<string,TourDefinition>={
  roles:{roles:people,steps:[
    s("add-role-btn","Add a job role","Click here to add a new role. You can also press Next to preview the form.",{activate:"add-role-btn"}),
    ...form("add-role-btn","roles-editor",[
      ["role-name","Name the role","Use a job title people recognize, such as Software Developer."],
      ["role-default-tier","Suggest a pay band","This is a suggested employee pay band. Job roles do not grant account permissions; those are managed in Accounts & roles."],
      ["role-pay-range","Set an optional pay range","These base-pay suggestions use the company’s monthly or annual salary period."],
    ],"role-save"),
    s("roles-list","Your roles appear here","Search, view active headcounts, or expand a role’s actions to edit, archive or restore it.",{close:"roles-editor"}),
  ]},
  employees:{steps:[
    intro("Your directory follows your access: the company for people administrators, direct reports for managers, and your own record for employees.",{
      EMPLOYEE:"This directory opens your own employee record. Your profile connects personal details, HR records and your permitted self-service information.",
      MANAGER:"Your directory contains you and your direct reports. Reporting relationships control team access; teammates’ pay stays private.",
      HR:"Use the company directory to maintain people records and reporting lines. Pay figures appear only when HR salary visibility is enabled.",
      CFO:"Review company people records and authorized pay information. Use job roles and pay bands for structure, and Accounts & roles for login access.",
      ADMIN:"Maintain company people records, reporting relationships and account links. The tour previews forms without creating or editing an employee.",
    }),
    s("employees-search","Find a person","Search names, emails or employee codes. Filters narrow the current permitted view."),
    s("add-employee-btn","Add an employee","Create a people record here. Creating their sign-in is a separate step in Accounts & roles.",{roles:people,activate:"add-employee-btn"}),
    ...form("add-employee-btn","employees-editor",[
      ["employee-first-name","First name","Enter the employee’s personal first name."],["employee-last-name","Last name","Add their last name so the directory and records use the right identity."],
      ["employee-email","Contact email","This identifies the employee record; a login account is issued separately."],
      ["employee-job-role","Job role","Choose the position. Its defaults can help with the pay band; it does not change login permissions."],
      ["employee-manager","Direct manager","This relationship controls who can see and review the person’s permitted team records."],
      ["employee-start-date","Start date","Record when employment begins. Salary controls appear only with the required permission."],
    ],"employee-save"),
    s("employees-list","Open a profile","Profiles connect personal details, HR records and permitted pay information. Expand row actions to edit.",{close:"employees-editor"}),
  ]},
  accounts:{roles:finance,steps:[
    s("add-account-btn","Issue a sign-in","Create a login for a new person. This tour only previews the form; no credentials are generated.",{activate:"add-account-btn"}),
    ...form("add-account-btn","accounts-editor",[
      ["account-email","Login email","Use the address the person will sign in with."],
      ["account-permissions","Choose account permissions","Admin, CFO, HR, Manager and Employee grant different capabilities. Choose the least access needed; this is separate from a job title."],
      ["account-employee","Link the employee","The link enables personal requests and attendance. Managers and employees require a link; reporting relationships determine team access."],
    ],"account-save"),
    s("accounts-list","Manage existing accounts","Edit roles and status here. Credentials are shown once when generated; linked new hires complete the separate first-login setup.",{close:"accounts-editor"}),
  ]},
  tiers:{roles:people,steps:[
    intro("Pay bands describe base-pay ranges. Assigning a band never changes an employee’s salary."),
    s("add-tier-btn","Create a pay band","Use a recognisable name and a useful range.",{roles:finance,activate:"add-tier-btn"}),
    ...form("add-tier-btn","tiers-editor",[["tier-name","Name the band","Choose a unique active band name."],["tier-minimum","Minimum base pay","Use the displayed salary period and company currency."],["tier-maximum","Maximum base pay","The maximum cannot be lower than the minimum. Empty bounds are allowed."]],"tier-save"),
    s("tiers-list","Assign people and maintain bands","Expand Actions to assign people. Admin and Finance can also edit, reorder, archive and restore. Archived bands retain their people and history.",{close:"tiers-editor"}),
  ]},
  dashboard:{steps:[intro("Start with a summary of the records your role can access. Counts and pay figures follow server permissions."),s("dashboard-summary","Your overview","Use these figures to understand your current permitted scope. Open the employee portal for tasks, requests and next steps.")]},
  portal:{steps:[intro("This is your role-aware workspace.",{
    EMPLOYEE:"Your work, time off and personal requests live here. Follow your tasks, update progress, request leave and read shared feedback or policies.",
    MANAGER:"Follow your direct reports’ work and requests, review their timesheets, and open interviews assigned to you. Your team’s confidential pay stays private.",
    HR:"Manage company hiring, onboarding, leave, development and people requests. Use the review inbox for decisions; salary visibility is a separate permission.",
    CFO:"Review permitted rewards, company attendance totals and your own personal requests. Compensation and reports live in People & finance; confidential personnel notes remain restricted.",
    ADMIN:"Use this company workspace for hiring, employee development, work and requests. Account access, finance and company configuration have their own sections.",
  }),s("portal-next-steps","Start with the next step","This queue links to real open tasks, requests, interviews and onboarding items in your scope."),s("portal-workspaces","Choose a workspace","Each section opens its own walkthrough. Only modules available to your account are shown.")]},
  compensation:{roles:people,steps:[
    s("plan-raise-btn","Plan or propose a raise","Admin and Finance can approve; HR proposes. Pay figures stay hidden when HR salary visibility is off.",{activate:"plan-raise-btn"}),
    ...form("plan-raise-btn","raises-editor",[["raise-scope","Choose the scope","Select a whole active band or individual employees."],["raise-type","Choose the increase","Use a percentage or a fixed increase in the company’s base-pay period."],["raise-value","Enter the increase","The server calculates the result using the company rounding policy."],["raise-date","Choose the effective date","Future approvals are scheduled. Due approved raises update salaries and append history."],["raise-cap","Choose the band policy","A cap preserves existing pay, including people already above the maximum. Change this before previewing."],["raise-reason","Keep the reason","Explain the decision for the permanent salary history."]],"raise-preview"),
    s("raise-history","Review decisions and history","Expand a raise’s options for individual details. Finance reviews pending decisions before approval. This tour does not preview or confirm a raise.",{close:"raises-editor"}),
  ]},
  reports:{roles:finance,steps:[intro("Reports explain pay costs and history. They are estimates and records, not payroll transfers."),s("report-choices","Pick the question","Choose a payroll snapshot, cost grouping, salary history or variable pay. Salary history also offers date filters."),s("report-results","Read the snapshot","Check the record count and refresh time. Base and recurring variable pay use monthly equivalents; one-time pay is separate."),s("report-export","Export the same view","CSV exports use the selected report and applicable date filters. Export is disabled when there are no rows.")]},
  attendance:{steps:[
    s("attendance-workday","Your workday","Start work when you arrive, switch tasks as needed, and finish when you leave. Times are recorded by the server. This tour never clocks you in or out.",{linked:true}),
    s("attendance-task","Connect your task","Choose your assigned task or general work. Completing a linked task updates the same task your manager sees.",{linked:true,optional:true}),
    s("attendance-focus","Describe your focus","Record the work you intend to do. At finish, add a summary and an outcome: in progress, complete or blocked.",{linked:true,optional:true}),
    s("finish-work-btn","Finish a running session","When you are on the clock, this opens the work summary and outcome. The tour does not clock you out.",{linked:true,activate:"finish-work-btn",optional:true}),
    ...form("finish-work-btn","attendance-editor",[["attendance-end-summary","Summarize the session","Describe what you worked on before finishing."],["attendance-outcome","Record the outcome","Completed updates the linked task; blocked makes the issue visible in shared records."]],"attendance-finish-save"),
    s("attendance-week-actions","Submit, correct or review","Expand this arrow during normal use for weekly submission, time corrections and the review/export actions your role permits.",{close:"attendance-editor"}),
    s("attendance-week","Choose the week","Use this date to review recorded hours. Week actions include submission, corrections and permitted review/export options."),
    s("attendance-overview","Read attendance in your scope","Attendance follows your role.",{descriptionByRole:{
      EMPLOYEE:"This is your own recorded week. Finish running sessions before submitting hours. Approved or submitted weeks are locked; corrections require review.",
      MANAGER:"See your own week and your direct reports’ presence, hours and submission states. Review their timesheets in Approvals; you cannot approve your own.",
      HR:"Review company presence and recorded hours, then follow submitted timesheets in Approvals. Changes to locked weeks require the correction workflow.",
      ADMIN:"Review company attendance and submissions, inspect permitted work logs and export approved hours. Server timestamps keep the records consistent.",
      CFO:"Review company attendance totals and approved-hour exports. Other employees’ detailed work notes are withheld; your own sessions remain available.",
    }}),
  ]},
  approvals:{roles:reviewers,steps:[s("approval-inbox","Your review inbox","Open requests and submitted timesheets are shared with the appropriate reviewer. You cannot approve your own requests."),s("review-request-btn","Review a pending item","Open a request to review its note and confirmation. During this walkthrough no decision is submitted.",{activate:"review-request-btn",optional:true}),...form("review-request-btn","decisions-editor",[["decision-note","Explain the decision","Add a helpful reply or reason. A note is required when rejecting a request."]],"decision-save"),s("approval-reminders","Follow up on reminders","Review the linked record before making a decision. Approval/rejection opens a note and confirmation dialog; the tour never makes a decision.",{close:"decisions-editor"})]},
  settings:{roles:finance,steps:[intro("Company defaults affect how the whole workspace displays and calculates pay."),s("settings-form","Company preferences","Review name, currency, number format and rounding. This tour does not edit the settings."),s("salary-period","Base salary period","Monthly and annual salaries have different meanings. Reports normalize their monthly equivalents."),s("hr-salary-visibility","Salary access for HR","This controls whether HR can read salary figures. A tutorial never changes this permission."),s("settings-save","Save deliberately","Changes take effect only when you submit the real form after the walkthrough.")]},
  audit:{roles:["ADMIN","HR"],steps:[s("audit-filter","Find an event","Filter by exact action, such as PERSONNEL_FILE_DOWNLOADED. This is a read-only audit view."),s("audit-records","Who did what, and when","Review actor, timestamp, action and record reference. Pagination navigates the event history.")]},
  "employee-import":{roles:people,steps:[intro("Import uses upload, column mapping and preview before any changes are committed. The tour does not upload or import files."),s("import-file","Choose a CSV","Download the template, prepare employee rows, and select your CSV here."),s("import-duplicates","Decide how duplicates are handled","Choose the duplicate policy before previewing. Mapping connects your column names to employee fields."),s("import-preview","Preview before importing","The preview explains creates, updates, skips and row errors. Correct errors before confirming the real import.")]},
  "employee-profile":{steps:[intro("A profile brings together the employee’s identity, reporting line, HR links and information permitted for your role."),s("add-pay-component","Add variable pay","Finance can add a recurring component or a one-time amount. This tour never changes compensation.",{roles:finance,activate:"add-pay-component",optional:true}),...form("add-pay-component","components-editor",[["component-name","Name the component","Use a clear name, such as Bonus or Commission."],["component-type","Calculation method","Fixed/target amounts and percentage rates have different meanings."],["component-period","Payment period","Recurring amounts are normalized to monthly equivalents. One-time pay is reported separately."],["component-value","Amount or rate","Use the company currency for amounts, or a percentage for recurring percentage-based pay."]],"component-save"),s("pay-components","Pay breakdown and components","Compensation is visible only to authorized viewers. Recurring and one-time components are distinguished.",{optional:true,close:"components-editor"}),s("personnel-files","Private personnel files","Only HR/Admin and the direct manager can open these files. Views and downloads are audited.",{roles:reviewers,optional:true}),s("private-profile","Personal and payment details","Opening private details is explicit and audited. HR, Finance and employee views expose different fields.",{optional:true})]},
  "my-pay":{roles:["MANAGER","EMPLOYEE"],steps:[intro("This page shows your own compensation, never a teammate’s pay."),s("my-pay-summary","Your monthly pay","Base pay is normalized to a monthly equivalent and combined with current recurring variable pay."),s("my-pay-history","Your pay history","Recorded changes retain their effective date and reason.",{optional:true})]},
  "personal-details":{steps:[s("private-profile","Your personal details","Your own saved profile is protected. Account numbers are masked; contact corrections go through profile-change requests and payment corrections through Finance.",{linked:true})]},
};

export function stepsForRole(definition:TourDefinition,user:User,company:Company):TourStep[] {
  if (definition.roles && !definition.roles.includes(user.role)) return [];
  return definition.steps.filter(step => (!step.roles || step.roles.includes(user.role)) && (!step.linked || !!user.employeeId))
    .map(step=>({...step,description:step.descriptionByRole?.[user.role]??step.description}));
}

export const tourSelector = (anchor:string) => `[data-tour="${anchor}"]`;

// Static catalog labels; edit this map when a module adds or changes fields.
const portalModules = {
  "job-posting": {"label": "Job postings", "group": "Hiring", "description": "Describe an opening before adding candidates.", "fields": [["title", "Job title"], ["positionId", "Position"], ["description", "Description"], ["status", "Status"]], "scoped": false},
  "candidate": {"label": "Candidates", "group": "Hiring", "description": "Move candidates through screening, interviews and offers.", "fields": [["title", "Candidate name"], ["email", "Email"], ["jobId", "Job posting"], ["status", "Stage"], ["notes", "Notes"]], "scoped": false},
  "interview": {"label": "Interviews", "group": "Hiring", "description": "Assign an interviewer and time, then record evidence after the conversation.", "fields": [["title", "Interview title"], ["candidateId", "Candidate"], ["date", "Interview date"], ["interviewerId", "Interviewer"], ["time", "Start time"], ["status", "Interview status"], ["score", "Score (0-5)"], ["notes", "Interview notes"]], "scoped": false},
  "onboarding": {"label": "Onboarding checklist", "group": "Hiring", "description": "Assign the first weeks of work to a new hire or their manager.", "fields": [["title", "Checklist item"], ["assignedTo", "Responsible person"], ["dueDate", "Due date"], ["status", "Status"]], "scoped": true},
  "metric": {"label": "Position metrics", "group": "Performance", "description": "Define what good performance means for each position.", "fields": [["title", "Metric name"], ["positionId", "Position"], ["unit", "Unit"], ["target", "Target"], ["direction", "Better when"]], "scoped": false},
  "metric-value": {"label": "Metric values", "group": "Performance", "description": "Record dated evidence against the employee’s position metrics.", "fields": [["title", "Evidence summary"], ["metricId", "Metric"], ["date", "Measured on"], ["value", "Value"], ["evidence", "Evidence"]], "scoped": true},
  "review": {"label": "Performance reviews", "group": "Performance", "description": "Schedule a review, then score only the position’s metrics.", "fields": [["title", "Review name"], ["dueDate", "Review due"], ["status", "Status"], ["scores", "Metric scores"], ["notes", "Review comments"]], "scoped": true},
  "meeting": {"label": "1:1 meetings", "group": "Communication", "description": "Record expectations and a two-way conversation.", "fields": [["title", "Meeting title"], ["date", "Meeting date"], ["expectations", "Expectations"], ["why", "Why this matters"], ["feedback", "Feedback"]], "scoped": true},
  "feedback": {"label": "Feedback", "group": "Communication", "description": "Give positive or constructive feedback; employees can reply.", "fields": [["title", "Feedback summary"], ["type", "Feedback type"], ["date", "Date"], ["notes", "Feedback"]], "scoped": true},
  "skill": {"label": "Skills", "group": "Development", "description": "Keep an employee skills profile and team overview.", "fields": [["title", "Skill"], ["level", "Level"]], "scoped": true},
  "goal": {"label": "Development goals", "group": "Development", "description": "Agree a goal, due date and visible progress.", "fields": [["title", "Goal"], ["dueDate", "Due date"], ["progress", "Progress (%)"], ["notes", "Success criteria"]], "scoped": true},
  "training": {"label": "Training items", "group": "Development", "description": "Add a course, mentoring or a project to a goal.", "fields": [["title", "Training item"], ["goalId", "Goal"], ["type", "Type"], ["status", "Status"]], "scoped": true},
  "development-request": {"label": "Development requests", "group": "Development", "description": "Request an opportunity for manager approval.", "fields": [["title", "Opportunity"], ["notes", "How it helps"], ["dueDate", "Requested by"]], "scoped": true},
  "recognition": {"label": "Recognition", "group": "Rewards", "description": "Recognize an employee’s contribution.", "fields": [["title", "Recognition"], ["date", "Date"], ["notes", "Contribution"]], "scoped": true},
  "reward": {"label": "Reward records", "group": "Rewards", "description": "Link bonuses, raises, promotions or awards to performance evidence. Pay changes use Compensation.", "fields": [["title", "Reward"], ["type", "Type"], ["reviewId", "Performance review"], ["date", "Date"], ["notes", "Reward details"]], "scoped": true},
  "discipline-step": {"label": "Discipline policy", "group": "Discipline", "description": "Define ordered progressive steps before recording an action.", "fields": [["title", "Policy step"], ["order", "Step order"], ["policy", "Policy / rule"]], "scoped": false},
  "discipline": {"label": "Disciplinary actions", "group": "Discipline", "description": "Document evidence, the employee’s side and support offered.", "fields": [["title", "Incident category"], ["stepId", "Policy step"], ["date", "Incident date"], ["reason", "Reason"], ["policyViolated", "Policy violated"], ["evidence", "Evidence"], ["employeeSide", "Employee’s side"], ["support", "Support offered"]], "scoped": true},
  "project": {"label": "Projects", "group": "Work", "description": "Define a project before assigning tasks.", "fields": [["title", "Project name"], ["notes", "Purpose"], ["dueDate", "Due date"], ["status", "Status"]], "scoped": false},
  "task": {"label": "Tasks", "group": "Work", "description": "Assign work with a due date, purpose and downstream impact.", "fields": [["title", "Task"], ["projectId", "Project"], ["dueDate", "Due date"], ["why", "Why this matters"], ["impact", "Impact if delayed"], ["dependsOnId", "Depends on task"], ["status", "Status"]], "scoped": true},
  "leave-balance": {"label": "Leave balances", "group": "Leave", "description": "Set an employee’s annual allowance. Approved requests consume weekdays.", "fields": [["title", "Leave type"], ["year", "Year"], ["days", "Allowance (days)"]], "scoped": true},
  "leave-request": {"label": "Leave requests", "group": "Leave", "description": "Request working days off and route them for approval.", "fields": [["title", "Leave type"], ["startDate", "First day"], ["endDate", "Last day"], ["notes", "Reason"]], "scoped": true},
  "profile-request": {"label": "Profile changes", "group": "Self service", "description": "Request a contact detail update; HR reviews it before saving.", "fields": [["title", "Change summary"], ["phone", "New phone"], ["email", "New email"]], "scoped": true},
  "attendance-request": {"label": "Time corrections", "group": "Self service", "description": "Missed a check-in or check-out? Request a correction in the company time zone. A manager or HR reviews it.", "fields": [["title", "Correction summary"], ["entryId", "Existing session ID (leave blank for missing time)"], ["clockIn", "Correct start (company time)"], ["clockOut", "Correct finish (company time)"], ["notes", "Reason"]], "scoped": true},
  "policy": {"label": "Company policies", "group": "Self service", "description": "Publish company policies and collect read acknowledgements.", "fields": [["title", "Policy name"], ["notes", "Policy text"]], "scoped": false},
  "help-request": {"label": "HR help desk", "group": "Self service", "description": "Ask HR for help and keep the reply with your request.", "fields": [["title", "Subject"], ["category", "Category"], ["notes", "Request"]], "scoped": true},
  "hr-settings": {"label": "HR settings", "group": "Administration", "description": "Set attendance expectations, reminder periods and retention.", "fields": [["title", "Configuration name"], ["timezone", "Company time zone"], ["weeklyHours", "Expected weekly hours"], ["startTime", "Workday starts"], ["feedbackDays", "Feedback reminder after (days)"], ["retentionDays", "HR record retention (days)"]], "scoped": false}
} as const;

for (const [key,module] of Object.entries(portalModules)) {
  tourConfig[`portal-${key}`]={steps:[
    intro(module.description+" Records and actions follow your account and employee scope.",{
      ...(module.group === "Hiring" ? {MANAGER:"View your assigned interviews and their linked candidates. HR controls scheduling and candidate stages; you can record evidence and outcomes on assigned interviews."} : {}),
      EMPLOYEE:`Explore the ${module.label.toLowerCase()} shared with you. Available requests and updates follow your employee permissions; only controls you can use appear in this walkthrough.`,
      CFO:`Review permitted ${module.label.toLowerCase()} for finance work. Confidential people records and actions remain restricted; only available controls appear in this walkthrough.`,
    }),
    s("workspace-section","Choose the section","Each section has a separate walkthrough. Changing section interrupts this tour without marking it complete."),
    s("record-search","Find a record","Search within the current visible records. An employee filter appears when applicable."),
    s("add-record-btn","Create a record","Click the real Add button or press Next to preview its fields. Read-only roles continue to the records list.",{activate:"add-record-btn",optional:true}),
    ...form("add-record-btn","records-editor", [...(module.scoped ? [["record-employee","Choose the employee","Select the person this record belongs to. The list follows your role and reporting scope."] as [string,string,string]] : []), ...module.fields.map(([field,label])=>[
      `record-field-${field}`,label,
      field === "status" ? "Choose the record’s current state. Later actions and validation depend on this state."
        : field.endsWith("Id") ? "Select the related permitted record. References must belong to the same company and, where applicable, the right employee."
        : "Complete this field when using the real form. Required fields and allowed values are checked by the server. This walkthrough does not edit or submit it."
    ] as [string,string,string])],"record-save"),
    s("records-list","Your shared records","Saved records appear here. Expand details or actions to see permitted edits, replies, acknowledgements or decisions. No action is executed by this tour.",{close:"records-editor"}),
  ]};
}

import { describe,expect,it } from "vitest";
import { stepsForRole,tourConfig } from "./tourConfig";
import { escapeTourText } from "./tourRunner";
import type { User,Company,AccessRole } from "@/lib/types";
import { readFileSync,readdirSync } from "node:fs";
import { join } from "node:path";
const company:Company={id:1,name:"Test",currency:"INR",locale:"en-IN",salaryPeriod:"MONTHLY",roundingRule:"NONE",hrCanSeeSalary:false};
const user=(role:AccessRole,linked=true):User=>({id:1,email:"demo@test.invalid",role,companyId:1,employeeId:linked?1:null,toursCompleted:[]});

describe("role-aware walkthroughs",()=>{
  it("never includes finance/admin forms for managers or employees",()=>{
    for(const role of ["MANAGER","EMPLOYEE"] as const) {
      for(const page of ["roles","accounts","tiers","compensation","reports","settings"]) expect(stepsForRole(tourConfig[page],user(role),company)).toEqual([]);
      expect(stepsForRole(tourConfig.employees,user(role),company).some(step=>step.dialog||step.activate)).toBe(false);
    }
  });
  it("lets HR learn job roles and proposals without teaching access administration",()=>{
    expect(stepsForRole(tourConfig.roles,user("HR"),company).map(step=>step.element)).toContain("role-default-tier");
    expect(stepsForRole(tourConfig.accounts,user("HR"),company)).toEqual([]);
    expect(stepsForRole(tourConfig.tiers,user("HR"),company).some(step=>step.dialog)).toBe(false);
  });
  it("omits personal attendance steps from unlinked accounts",()=>{
    expect(stepsForRole(tourConfig.attendance,user("CFO",false),company).map(step=>step.element)).toEqual(["attendance-week-actions","attendance-week","attendance-overview"]);
  });
  it("explains the same workspace differently for each account role",()=>{
    const employee=stepsForRole(tourConfig.portal,user("EMPLOYEE"),company)[0].description;
    const manager=stepsForRole(tourConfig.portal,user("MANAGER"),company)[0].description;
    const cfo=stepsForRole(tourConfig.attendance,user("CFO"),company).at(-1)!.description;
    expect(employee).toContain("Your work");expect(employee).not.toContain("company hiring");
    expect(manager).toContain("direct reports");expect(cfo).toContain("withheld");
    expect(stepsForRole(tourConfig["portal-interview"],user("MANAGER"),company)[0].description).toContain("HR controls scheduling");
  });
  it("registers every main page and individual HR module with stable safe keys/anchors",()=>{
    expect(Object.keys(tourConfig)).toHaveLength(42);
    for(const [key,definition] of Object.entries(tourConfig)) {
      expect(key).toMatch(/^[a-z][a-z-]*$/);expect(definition.steps.length).toBeGreaterThan(0);
      for(const step of definition.steps) expect(step.element).toMatch(/^[A-Za-z][A-Za-z0-9-]*$/);
    }
    expect(tourConfig["portal-interview"]).toBeDefined();expect(tourConfig["portal-attendance-request"]).toBeDefined();
  });
  it("encodes markup before it reaches the library HTML popover",()=>{
    expect(escapeTourText('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });
  it("keeps every configured spotlight connected to a real UI anchor",()=>{
    const sources=(folder:string):string=>readdirSync(folder,{withFileTypes:true}).map(entry=>entry.isDirectory()?sources(join(folder,entry.name)):entry.name.endsWith(".tsx")?readFileSync(join(folder,entry.name),"utf8"):"").join("\n");
    const ui=sources("src");
    const catalog=readFileSync("../emp mg2/src/main/java/com/empmg/platform/hr/HrCatalog.java","utf8");
    for(const definition of Object.values(tourConfig))for(const step of definition.steps) {
      if(step.element.startsWith("record-field-")) {
        expect(ui).toContain('data-tour={`record-field-${f.key}`}');
        expect(catalog).toContain(`"${step.element.slice(13)}"`);
      } else expect(ui.includes(`data-tour="${step.element}"`)||ui.includes(`tourId="${step.element}"`),step.element).toBe(true);
      if(step.dialog) expect(ui).toContain(`data-tour="${step.dialog.root}"`);
    }
  });
});

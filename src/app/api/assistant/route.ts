import {z} from "zod";
import {selectCandidates,validateAnswer,featureAnswer,refusal,type HelpUser} from "@/lib/assistant/policy";
import {assistantQuota} from "@/lib/assistant/rate-limit";
import {askProvider} from "@/lib/assistant/provider";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const bodySchema=z.object({messages:z.array(z.object({role:z.enum(["user","assistant"]),content:z.string().trim().min(1).max(500)}).strict()).min(1).max(6)}).strict();
const userSchema=z.object({id:z.number().int().positive(),companyId:z.number().int().positive(),role:z.enum(["ADMIN","CFO","HR","MANAGER","EMPLOYEE"]),employeeId:z.number().int().positive().nullable(),welcomeRequired:z.boolean().optional(),passwordChangeRequired:z.boolean().optional()});
const respond=(body:unknown,status=200,headers:Record<string,string>={})=>Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers}});
let inFlight=0;
async function readBody(request:Request):Promise<unknown> {
  const reader=request.body?.getReader();if(!reader)throw new Error("EMPTY");
  const deadline=setTimeout(()=>{void reader.cancel();},4000);
  let bytes=0;const chunks:Uint8Array[]=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8192)throw new Error("LARGE");chunks.push(value);}}
  finally{clearTimeout(deadline);await reader.cancel();}
  const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(buffer));
}
export async function POST(request:Request) {
  const origin=request.headers.get("origin");
  // Next can reconstruct localhost internally while the browser uses the public
  // hostname. Use an explicit deployment allowlist, never forwarded-host input.
  const origins=process.env.ASSISTANT_ALLOWED_ORIGINS?.split(",").map(value=>value.trim())??[new URL(request.url).origin];
  if(origin&&!origins.includes(origin))return respond({error:"Open help from this portal."},403);
  const authorization=request.headers.get("authorization");
  if(!authorization||!/^Bearer [A-Za-z0-9._-]{20,4096}$/.test(authorization))return respond({error:"Please sign in to use portal help."},401);
  let user:HelpUser;
  try {
    const base=process.env.API_INTERNAL_URL;
    if(!base)return respond({error:"Portal help is not configured yet."},503);
    const me=await fetch(`${base.replace(/\/$/,"")}/auth/me`,{headers:{Authorization:authorization},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(5000)});
    if(!me.ok)return me.status>=500
      ?respond({error:"Sign-in verification is temporarily unavailable."},503)
      :respond({error:"Please sign in again to use portal help."},me.status===403?403:401);
    const session=await me.json();const parsed=userSchema.safeParse(session.user);
    if(!parsed.success)return respond({error:"Your session could not be verified."},401);
    if(parsed.data.welcomeRequired||parsed.data.passwordChangeRequired)return respond({error:"Complete your account setup before opening help."},403);
    user=parsed.data;
  }catch{return respond({error:"Sign-in verification is temporarily unavailable."},503);}
  const retryAfter=assistantQuota.take(`${user.companyId}:${user.id}`);
  if(retryAfter)return respond({error:"You’ve reached the help limit. Please wait a minute."},429,{"Retry-After":String(retryAfter)});
  if(!request.headers.get("content-type")?.startsWith("application/json"))return respond({error:"Send a short help question."},415);
  let messages;
  try{const parsed=bodySchema.safeParse(await readBody(request));if(!parsed.success||parsed.data.messages.at(-1)?.role!=="user")return respond({error:"Send up to six messages, each under 500 characters, ending with your question."},400);messages=parsed.data.messages;}
  catch{return respond({error:"The help question is invalid or too long."},400);}
  const candidates=selectCandidates(messages,user);
  if(!candidates.length)return respond(refusal());
  // A unique match already has approved instructions; no model dependency is
  // needed. Groq only chooses between equally plausible permitted destinations.
  if(candidates.length===1)return respond(featureAnswer(candidates[0],user));
  if(inFlight>=32)return respond({error:"Portal help is busy. Please try again shortly."},503);
  inFlight++;
  try {return respond(validateAnswer(await askProvider(candidates,user),candidates,user));}
  catch(error) {
    // Never log SDK errors: their request/response may contain secrets or content.
    const status=error&&typeof error==="object"&&"status" in error?error.status:null;
    const code=error&&typeof error==="object"&&"code" in error?error.code:null;
    if(status===400&&code==="json_validate_failed"){
      console.warn("Portal help used the mapped JSON fallback");
      return respond(validateAnswer("",candidates,user));
    }
    console.warn("Portal help provider unavailable",{
      status:typeof status==="number"?status:null,
      kind:error instanceof Error?error.constructor.name:"Unknown",
      configurationMissing:error instanceof Error&&error.message==="ASSISTANT_NOT_CONFIGURED",
    });
    if(status===429)return respond({error:"The help provider is busy. Please wait a minute."},429,{"Retry-After":"60"});
    return respond({error:"Portal help is temporarily unavailable. Please try again shortly."},503);
  }finally{inFlight--;}
}

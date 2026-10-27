import "server-only";
import OpenAI from "openai";
import {buildPrompt,type Feature,type HelpUser} from "./policy";

export async function askProvider(candidates:Feature[],user:HelpUser):Promise<string> {
  const {AI_BASE_URL,AI_API_KEY,AI_MODEL}=process.env;
  if(!AI_BASE_URL||!AI_API_KEY||!AI_MODEL)throw new Error("ASSISTANT_NOT_CONFIGURED");
  const endpoint=new URL(AI_BASE_URL);
  if(endpoint.protocol!=="https:"||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw new Error("ASSISTANT_NOT_CONFIGURED");
  const client=new OpenAI({apiKey:AI_API_KEY,baseURL:AI_BASE_URL,timeout:18000,maxRetries:0,logLevel:"off"});
  // No raw message text, employee IDs, company records or credentials in prompts.
  const result=await client.chat.completions.create({
    model:AI_MODEL,temperature:0.1,max_tokens:300,response_format:{type:"json_object"},
    messages:[{role:"system",content:buildPrompt(user)},{role:"user",content:JSON.stringify({
      question:"Give click-by-click navigation help for the best matching feature.",
      CANDIDATES:candidates.map(f=>({id:f.id,route:f.route,keywords:f.keywords})),
    })}],
  });
  const content=result?.choices?.[0]?.message?.content;
  return typeof content==="string"?content:"";
}

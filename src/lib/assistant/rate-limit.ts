/** Single Node process quota. Multi-replica deployments must share this store. */
export class AssistantQuota {
  private buckets=new Map<string,{count:number;expires:number}>();
  take(key:string,now=Date.now()):number {
    for(const [id,bucket] of this.buckets)if(bucket.expires<=now)this.buckets.delete(id);
    let bucket=this.buckets.get(key);
    if(!bucket){if(this.buckets.size>=10000)return 60;bucket={count:0,expires:now+60000};this.buckets.set(key,bucket);}
    if(bucket.count>=20)return Math.max(1,Math.ceil((bucket.expires-now)/1000));
    bucket.count++;return 0;
  }
}
export const assistantQuota=new AssistantQuota();

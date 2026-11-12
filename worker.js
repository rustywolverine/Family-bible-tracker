const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
let initialized=false;
async function database(env){
 if(!env.DB)throw Error("Database binding missing");
 if(!initialized){await env.DB.prepare("CREATE TABLE IF NOT EXISTS family_progress (room TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1)").run();initialized=true}
 return env.DB;
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==="/api/status")return json({service:"family-bible-tracker",api:"ready",database:env.DB?"bound":"not-bound"});
  if(url.pathname==="/api/progress"){
   if(!["GET","PUT"].includes(request.method))return json({error:"Method not allowed"},405);
   const room=request.headers.get("X-Family-Room")||"";
   if(!/^[a-f0-9]{64}$/.test(room))return json({error:"Enter a valid shared family passphrase"},401);
   try{
    const db=await database(env);
    const current=await db.prepare("SELECT payload,revision FROM family_progress WHERE room=?").bind(room).first();
    if(request.method==="GET")return json(current?{data:JSON.parse(current.payload),revision:current.revision}:{data:null,revision:0});
    const input=await request.json();
    if(!input||!Number.isSafeInteger(input.revision)||input.revision<0||!input.data||typeof input.data!=="object")return json({error:"Invalid progress update"},400);
    const payload=JSON.stringify(input.data);
    if(payload.length>200000)return json({error:"Progress too large"},413);
    if(input.revision===0){
     const result=await db.prepare("INSERT OR IGNORE INTO family_progress(room,payload,revision) VALUES(?,?,1)").bind(room,payload).run();
     if(result.meta.changes===1)return json({revision:1});
    }else{
     const result=await db.prepare("UPDATE family_progress SET payload=?,revision=revision+1 WHERE room=? AND revision=?").bind(payload,room,input.revision).run();
     if(result.meta.changes===1)return json({revision:input.revision+1});
    }
    return json({error:"Progress changed on another device. Refresh and retry."},409);
   }catch(e){return json({error:"Database unavailable. Try again shortly."},503)}
  }
  if(url.pathname.startsWith("/api/"))return json({error:"Not found"},404);
  return env.ASSETS.fetch(request);
 }
};
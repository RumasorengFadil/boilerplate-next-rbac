import {NextResponse} from "next/server";
import {downloadCalendar} from "@/features/scheduling/service";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const{id}=await params;const calendar=await downloadCalendar({id,token:new URL(request.url).searchParams.get("token")});
    if(!calendar)return NextResponse.json({error:"Not found"},{status:404,headers:{"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"}});
    return new Response(calendar,{headers:{"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":'attachment; filename="lunabiner-consultation.ics"',"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow"}});
  }catch{return NextResponse.json({error:"Not found"},{status:404,headers:{"Cache-Control":"no-store"}});}
}

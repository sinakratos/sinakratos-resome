import { env } from 'cloudflare:workers';
import { initialResume,resumeSchema } from './resume';
export function database(){if(!env.DB)throw new Error('Storage unavailable');return env.DB;}
export async function readResume(){const row=await database().prepare('SELECT content, revision FROM resume_content WHERE id = ?').bind(1).first<{content:string,revision:number}>();return row?{resume:resumeSchema.parse(JSON.parse(row.content)),revision:row.revision}:{resume:initialResume,revision:0};}

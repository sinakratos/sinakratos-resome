import Portfolio from './portfolio';
import { readResume } from '@/lib/resume-store';
import { initialResume } from '@/lib/resume';
export const dynamic='force-dynamic';
export default async function Page(){try{const {resume}=await readResume();return <Portfolio resume={resume}/>;}catch(e){console.error(e);return <Portfolio resume={initialResume}/>;}}

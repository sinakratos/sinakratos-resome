import { isAdmin } from '@/lib/admin-auth';
import { getChatGPTUser,chatGPTSignInPath } from '@/app/chatgpt-auth';
import { readResume } from '@/lib/resume-store';
import Editor from './editor';
export const dynamic='force-dynamic';
export default async function Admin(){if(!await isAdmin()){const user=await getChatGPTUser();return <main className="admin-shell"><a href="/">sinakratos.</a><h1>Résumé administration / مدیریت رزومه</h1><div className="notice"><p>{user?'This account does not have administrator access.':'Sign in with the résumé owner’s ChatGPT account to edit the website.'}</p><p>برای مدیریت سایت با حساب مالک رزومه وارد شوید.</p><a className="primary-link" href={user?'/signout-with-chatgpt?return_to=/admin':chatGPTSignInPath('/admin')} target="_top">{user?'Switch account':'Sign in with ChatGPT'}</a></div></main>}try{const data=await readResume();return <Editor initial={data.resume} revision={data.revision}/>;}catch(e){console.error(e);return <main className="admin-shell"><h1>Storage temporarily unavailable</h1><p>Try reloading in a moment. Your published résumé has not been changed.</p></main>}}

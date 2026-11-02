import {handleGaReport,type GaEnv} from '../../../cloudflare/ga4-reporting';
export const onRequest=({request,env}:{request:Request;env:GaEnv})=>handleGaReport(request,env);
